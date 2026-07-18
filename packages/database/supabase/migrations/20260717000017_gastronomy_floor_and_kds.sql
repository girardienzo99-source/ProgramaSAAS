-- Persistent dining-room layout and kitchen display workflow.

CREATE OR REPLACE FUNCTION public.gastronomy_list_tables(p_company_id UUID, p_branch_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  status TEXT,
  capacity INTEGER,
  total NUMERIC,
  waiter TEXT,
  items JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name::TEXT,
    t.status::TEXT,
    t.capacity,
    COALESCE((
      SELECT SUM(o.total)
      FROM public.gastronomy_orders o
      WHERE o.company_id = p_company_id
        AND o.branch_id = p_branch_id
        AND o.table_id = t.id
        AND o.status NOT IN ('closed', 'cancelled')
    ), 0) AS total,
    ''::TEXT AS waiter,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'productId', product_rows.product_id,
          'name', product_rows.name,
          'quantity', product_rows.quantity,
          'unitPrice', product_rows.unit_price,
          'vatRate', product_rows.vat_rate
        ) ORDER BY product_rows.name
      )
      FROM (
        SELECT
          oi.product_id,
          p.name,
          SUM(oi.quantity) AS quantity,
          MAX(oi.unit_price) AS unit_price,
          MAX(p.vat_rate) AS vat_rate
        FROM public.gastronomy_orders o
        JOIN public.gastronomy_order_items oi
          ON oi.order_id = o.id AND oi.company_id = o.company_id AND oi.status <> 'cancelled'
        JOIN public.products p
          ON p.id = oi.product_id AND p.company_id = o.company_id
        WHERE o.company_id = p_company_id
          AND o.branch_id = p_branch_id
          AND o.table_id = t.id
          AND o.status NOT IN ('closed', 'cancelled')
        GROUP BY oi.product_id, p.name
      ) product_rows
    ), '[]'::jsonb) AS items
  FROM public.gastronomy_dining_tables t
  WHERE t.company_id = p_company_id AND t.branch_id = p_branch_id
  ORDER BY t.name;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_save_table(
  p_company_id UUID,
  p_branch_id UUID,
  p_table_id UUID,
  p_name TEXT,
  p_capacity INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_area_id UUID;
  v_table_id UUID := p_table_id;
BEGIN
  IF p_capacity <= 0 OR p_capacity > 100 THEN RAISE EXCEPTION 'INVALID_TABLE_CAPACITY'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.branches b WHERE b.id = p_branch_id AND b.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'BRANCH_COMPANY_MISMATCH';
  END IF;

  SELECT a.id INTO v_area_id
  FROM public.gastronomy_dining_areas a
  WHERE a.company_id = p_company_id AND a.branch_id = p_branch_id AND a.active
  ORDER BY a.sort_order, a.name
  LIMIT 1;

  IF v_area_id IS NULL THEN
    INSERT INTO public.gastronomy_dining_areas(company_id, branch_id, name, sort_order)
    VALUES (p_company_id, p_branch_id, 'Salon principal', 0)
    ON CONFLICT (branch_id, name) DO UPDATE SET active = true
    RETURNING id INTO v_area_id;
  END IF;

  IF v_table_id IS NULL THEN
    INSERT INTO public.gastronomy_dining_tables(company_id, branch_id, area_id, name, capacity, status)
    VALUES (p_company_id, p_branch_id, v_area_id, p_name, p_capacity, 'available')
    RETURNING id INTO v_table_id;
  ELSE
    UPDATE public.gastronomy_dining_tables SET name = p_name, capacity = p_capacity
    WHERE id = v_table_id AND company_id = p_company_id AND branch_id = p_branch_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'TABLE_NOT_FOUND'; END IF;
  END IF;

  RETURN v_table_id;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'TABLE_NAME_ALREADY_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_delete_table(
  p_company_id UUID,
  p_branch_id UUID,
  p_table_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.gastronomy_dining_tables t
    WHERE t.id = p_table_id
      AND t.company_id = p_company_id
      AND t.branch_id = p_branch_id
      AND (
        t.status = 'occupied'
        OR EXISTS (
          SELECT 1 FROM public.gastronomy_orders o
          WHERE o.table_id = t.id AND o.company_id = t.company_id
            AND o.status NOT IN ('closed', 'cancelled')
        )
      )
  ) THEN
    RAISE EXCEPTION 'TABLE_HAS_OPEN_ORDERS';
  END IF;

  DELETE FROM public.gastronomy_dining_tables
  WHERE id = p_table_id AND company_id = p_company_id AND branch_id = p_branch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TABLE_NOT_FOUND'; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_list_kds_orders(p_company_id UUID, p_branch_id UUID)
RETURNS TABLE(
  id UUID,
  order_number BIGINT,
  table_id UUID,
  table_name TEXT,
  status TEXT,
  opened_at TIMESTAMP WITH TIME ZONE,
  items JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.table_id,
    COALESCE(t.name, CASE o.channel WHEN 'delivery' THEN 'Delivery' ELSE 'Retiro' END)::TEXT,
    o.status::TEXT,
    o.opened_at,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('name', p.name, 'qty', oi.quantity, 'price', oi.unit_price)
        ORDER BY oi.created_at, p.name
      )
      FROM public.gastronomy_order_items oi
      JOIN public.products p ON p.id = oi.product_id AND p.company_id = oi.company_id
      WHERE oi.company_id = o.company_id AND oi.order_id = o.id AND oi.status <> 'cancelled'
    ), '[]'::jsonb)
  FROM public.gastronomy_orders o
  LEFT JOIN public.gastronomy_dining_tables t
    ON t.id = o.table_id AND t.company_id = o.company_id
  WHERE o.company_id = p_company_id
    AND o.branch_id = p_branch_id
    AND o.status IN ('sent', 'preparing', 'ready')
  ORDER BY o.opened_at;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_update_kds_status(
  p_company_id UUID,
  p_branch_id UUID,
  p_order_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  IF p_status NOT IN ('preparing', 'ready', 'served') THEN RAISE EXCEPTION 'INVALID_KDS_STATUS'; END IF;

  SELECT o.status INTO v_current_status
  FROM public.gastronomy_orders o
  WHERE o.id = p_order_id AND o.company_id = p_company_id AND o.branch_id = p_branch_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  IF NOT (
    (v_current_status = 'sent' AND p_status IN ('preparing', 'ready', 'served'))
    OR (v_current_status = 'preparing' AND p_status IN ('ready', 'served'))
    OR (v_current_status = 'ready' AND p_status = 'served')
    OR v_current_status = p_status
  ) THEN
    RAISE EXCEPTION 'INVALID_KDS_TRANSITION';
  END IF;

  UPDATE public.gastronomy_orders
  SET status = p_status, version = version + 1
  WHERE id = p_order_id AND company_id = p_company_id;
  UPDATE public.gastronomy_order_items
  SET status = p_status
  WHERE order_id = p_order_id AND company_id = p_company_id AND status <> 'cancelled';
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.gastronomy_list_tables(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_save_table(UUID, UUID, UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_delete_table(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_list_kds_orders(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_update_kds_status(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gastronomy_list_tables(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_save_table(UUID, UUID, UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_delete_table(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_list_kds_orders(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_update_kds_status(UUID, UUID, UUID, TEXT) TO service_role;
