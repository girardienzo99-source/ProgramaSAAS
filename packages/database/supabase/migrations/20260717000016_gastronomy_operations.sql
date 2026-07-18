-- Persistent gastronomy inventory, recipes and transactional order commits.

CREATE OR REPLACE FUNCTION public.gastronomy_list_ingredients(p_company_id UUID)
RETURNS TABLE(
  id UUID, name TEXT, unit TEXT, stock NUMERIC, min_stock NUMERIC,
  cost_per_unit NUMERIC, supplier TEXT, active BOOLEAN, created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.name::TEXT,
    i.unit::TEXT,
    i.current_stock,
    i.minimum_stock,
    i.cost_per_unit,
    COALESCE(i.supplier_name, '')::TEXT,
    i.active,
    i.created_at
  FROM public.gastronomy_ingredients i
  WHERE i.company_id = p_company_id
  ORDER BY i.active DESC, i.name;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_save_ingredient(
  p_company_id UUID,
  p_ingredient_id UUID,
  p_name TEXT,
  p_unit TEXT,
  p_stock NUMERIC,
  p_min_stock NUMERIC,
  p_cost_per_unit NUMERIC,
  p_supplier TEXT,
  p_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_ingredient_id UUID := p_ingredient_id;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.companies c
    JOIN public.business_types bt ON bt.id = c.business_type_id
    WHERE c.id = p_company_id AND c.status = 'active' AND bt.code = 'gastronomy'
  ) THEN
    RAISE EXCEPTION 'INVALID_GASTRONOMY_COMPANY';
  END IF;

  IF v_ingredient_id IS NULL THEN
    INSERT INTO public.gastronomy_ingredients(
      company_id, name, unit, current_stock, minimum_stock, cost_per_unit, supplier_name, active
    )
    VALUES (
      p_company_id, p_name, p_unit, p_stock, p_min_stock, p_cost_per_unit, NULLIF(p_supplier, ''), p_active
    )
    RETURNING id INTO v_ingredient_id;
  ELSE
    UPDATE public.gastronomy_ingredients SET
      name = p_name,
      unit = p_unit,
      current_stock = p_stock,
      minimum_stock = p_min_stock,
      cost_per_unit = p_cost_per_unit,
      supplier_name = NULLIF(p_supplier, ''),
      active = p_active,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_ingredient_id AND company_id = p_company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND'; END IF;
  END IF;

  RETURN v_ingredient_id;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'INGREDIENT_ALREADY_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_list_recipes(p_company_id UUID)
RETURNS TABLE(product_id UUID, portions NUMERIC, lines JSONB, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.product_id,
    r.portions,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('ingredientId', l.ingredient_id, 'quantity', l.quantity)
        ORDER BY i.name
      ) FILTER (WHERE l.id IS NOT NULL),
      '[]'::jsonb
    ) AS lines,
    r.updated_at
  FROM public.gastronomy_recipes r
  LEFT JOIN public.gastronomy_recipe_lines l
    ON l.recipe_id = r.id AND l.company_id = r.company_id
  LEFT JOIN public.gastronomy_ingredients i
    ON i.id = l.ingredient_id AND i.company_id = r.company_id
  WHERE r.company_id = p_company_id
  GROUP BY r.id, r.product_id, r.portions, r.updated_at
  ORDER BY r.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_save_recipe(
  p_company_id UUID,
  p_product_id UUID,
  p_portions NUMERIC,
  p_lines JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_recipe_id UUID;
BEGIN
  IF p_portions <= 0 OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'INVALID_RECIPE';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.gastronomy_menu_items m
    WHERE m.company_id = p_company_id AND m.product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_lines) line
    LEFT JOIN public.gastronomy_ingredients i
      ON i.id = (line->>'ingredientId')::UUID AND i.company_id = p_company_id AND i.active
    WHERE i.id IS NULL OR COALESCE((line->>'quantity')::NUMERIC, 0) <= 0
  ) THEN
    RAISE EXCEPTION 'INVALID_RECIPE_LINE';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_lines) line
    GROUP BY line->>'ingredientId'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_RECIPE_INGREDIENT';
  END IF;

  INSERT INTO public.gastronomy_recipes(company_id, product_id, portions)
  VALUES (p_company_id, p_product_id, p_portions)
  ON CONFLICT (company_id, product_id) DO UPDATE SET
    portions = EXCLUDED.portions,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_recipe_id;

  DELETE FROM public.gastronomy_recipe_lines
  WHERE company_id = p_company_id AND recipe_id = v_recipe_id;

  INSERT INTO public.gastronomy_recipe_lines(company_id, recipe_id, ingredient_id, quantity)
  SELECT
    p_company_id,
    v_recipe_id,
    (line->>'ingredientId')::UUID,
    (line->>'quantity')::NUMERIC
  FROM jsonb_array_elements(p_lines) line;

  RETURN v_recipe_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_commit_order(
  p_company_id UUID,
  p_user_id UUID,
  p_branch_id UUID,
  p_table_id UUID,
  p_channel TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order_id UUID;
  v_order_number BIGINT;
  v_subtotal NUMERIC(14, 2) := 0;
  v_item RECORD;
  v_stock_id UUID;
  v_available NUMERIC;
  v_price NUMERIC;
  v_consumption RECORD;
  v_ingredient_stock NUMERIC;
BEGIN
  IF p_channel NOT IN ('dine_in', 'takeaway', 'delivery') THEN RAISE EXCEPTION 'INVALID_ORDER_CHANNEL'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'EMPTY_ORDER'; END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.companies c
    JOIN public.business_types bt ON bt.id = c.business_type_id
    WHERE c.id = p_company_id AND c.status = 'active' AND bt.code = 'gastronomy'
  ) THEN
    RAISE EXCEPTION 'INVALID_GASTRONOMY_COMPANY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.id = p_branch_id AND b.company_id = p_company_id) THEN
    RAISE EXCEPTION 'BRANCH_COMPANY_MISMATCH';
  END IF;
  IF p_table_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.gastronomy_dining_tables t
    WHERE t.id = p_table_id AND t.company_id = p_company_id AND t.branch_id = p_branch_id
  ) THEN
    RAISE EXCEPTION 'TABLE_NOT_FOUND';
  END IF;

  INSERT INTO public.gastronomy_orders(
    company_id, branch_id, table_id, user_id, channel, status, notes
  )
  VALUES (p_company_id, p_branch_id, p_table_id, p_user_id, p_channel, 'sent', NULLIF(p_notes, ''))
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN
    SELECT
      (line->>'productId')::UUID AS product_id,
      SUM((line->>'quantity')::NUMERIC) AS quantity
    FROM jsonb_array_elements(p_items) line
    GROUP BY (line->>'productId')::UUID
    ORDER BY (line->>'productId')::UUID
  LOOP
    IF v_item.quantity <= 0 THEN RAISE EXCEPTION 'INVALID_ORDER_QUANTITY'; END IF;

    SELECT s.id, s.quantity, p.price
    INTO v_stock_id, v_available, v_price
    FROM public.products p
    JOIN public.gastronomy_menu_items m
      ON m.product_id = p.id AND m.company_id = p.company_id AND m.active
    JOIN public.stock s
      ON s.product_id = p.id AND s.company_id = p.company_id AND s.branch_id = p_branch_id
    WHERE p.id = v_item.product_id AND p.company_id = p_company_id
    FOR UPDATE OF s;

    IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_PRODUCT_NOT_FOUND'; END IF;
    IF v_available < v_item.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_PRODUCT_STOCK:%', v_item.product_id; END IF;

    UPDATE public.stock SET quantity = quantity - v_item.quantity WHERE id = v_stock_id;
    INSERT INTO public.stock_movements(company_id, stock_id, user_id, quantity, type, notes)
    VALUES (p_company_id, v_stock_id, p_user_id, -v_item.quantity, 'gastronomy_order', 'Order ' || v_order_number);
    INSERT INTO public.gastronomy_order_items(company_id, order_id, product_id, quantity, unit_price, status)
    VALUES (p_company_id, v_order_id, v_item.product_id, v_item.quantity, v_price, 'sent');
    v_subtotal := v_subtotal + (v_price * v_item.quantity);
  END LOOP;

  FOR v_consumption IN
    SELECT
      rl.ingredient_id,
      SUM((rl.quantity * (1 + rl.waste_percentage / 100) / r.portions) * ordered.quantity) AS required
    FROM (
      SELECT (line->>'productId')::UUID AS product_id, SUM((line->>'quantity')::NUMERIC) AS quantity
      FROM jsonb_array_elements(p_items) line
      GROUP BY (line->>'productId')::UUID
    ) ordered
    JOIN public.gastronomy_recipes r
      ON r.product_id = ordered.product_id AND r.company_id = p_company_id
    JOIN public.gastronomy_recipe_lines rl
      ON rl.recipe_id = r.id AND rl.company_id = p_company_id
    GROUP BY rl.ingredient_id
    ORDER BY rl.ingredient_id
  LOOP
    SELECT i.current_stock INTO v_ingredient_stock
    FROM public.gastronomy_ingredients i
    WHERE i.id = v_consumption.ingredient_id AND i.company_id = p_company_id AND i.active
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_INGREDIENT_NOT_FOUND'; END IF;
    IF v_ingredient_stock < v_consumption.required THEN
      RAISE EXCEPTION 'INSUFFICIENT_INGREDIENT_STOCK:%', v_consumption.ingredient_id;
    END IF;
    UPDATE public.gastronomy_ingredients SET
      current_stock = current_stock - v_consumption.required,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_consumption.ingredient_id AND company_id = p_company_id;
  END LOOP;

  UPDATE public.gastronomy_orders SET subtotal = v_subtotal, total = v_subtotal WHERE id = v_order_id;
  IF p_table_id IS NOT NULL THEN
    UPDATE public.gastronomy_dining_tables SET status = 'occupied'
    WHERE id = p_table_id AND company_id = p_company_id;
  END IF;

  RETURN jsonb_build_object(
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'subtotal', v_subtotal,
    'total', v_subtotal,
    'status', 'sent'
  );
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'INVALID_ORDER_ITEM';
END;
$$;

REVOKE ALL ON FUNCTION public.gastronomy_list_ingredients(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_save_ingredient(UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_list_recipes(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_save_recipe(UUID, UUID, NUMERIC, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_commit_order(UUID, UUID, UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gastronomy_list_ingredients(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_save_ingredient(UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_list_recipes(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_save_recipe(UUID, UUID, NUMERIC, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_commit_order(UUID, UUID, UUID, UUID, TEXT, TEXT, JSONB) TO service_role;
