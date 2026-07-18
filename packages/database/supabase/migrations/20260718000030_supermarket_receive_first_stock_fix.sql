-- Keep the first supermarket purchase receipt from producing a NULL weighted cost.

CREATE OR REPLACE FUNCTION public.supermarket_receive_purchase(
  p_company_id UUID,
  p_branch_id UUID,
  p_user_id UUID,
  p_order_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order public.supermarket_purchase_orders%ROWTYPE;
  v_line public.supermarket_purchase_order_lines%ROWTYPE;
  v_stock_id UUID;
  v_current_stock NUMERIC := 0;
  v_current_cost NUMERIC := 0;
  v_lot_code TEXT;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  SELECT * INTO v_order
  FROM public.supermarket_purchase_orders
  WHERE id = p_order_id AND company_id = p_company_id AND branch_id = p_branch_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_FOUND'; END IF;
  IF v_order.status = 'received' THEN RETURN v_order.id; END IF;
  IF v_order.status = 'cancelled' THEN RAISE EXCEPTION 'PURCHASE_NOT_RECEIVABLE'; END IF;

  SELECT * INTO v_line
  FROM public.supermarket_purchase_order_lines
  WHERE order_id = v_order.id AND company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_LINE_NOT_FOUND'; END IF;

  SELECT p.cost INTO v_current_cost
  FROM public.products p
  WHERE p.id = v_line.product_id AND p.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;

  SELECT s.id, s.quantity INTO v_stock_id, v_current_stock
  FROM public.stock s
  WHERE s.company_id = p_company_id AND s.branch_id = p_branch_id AND s.product_id = v_line.product_id
  FOR UPDATE;

  -- SELECT INTO clears targets when no stock row exists, including initialized values.
  v_current_stock := COALESCE(v_current_stock, 0);
  v_current_cost := COALESCE(v_current_cost, 0);

  IF v_stock_id IS NULL THEN
    INSERT INTO public.stock(company_id, branch_id, product_id, quantity, min_stock)
    VALUES (p_company_id, p_branch_id, v_line.product_id, v_line.quantity, 0)
    RETURNING id INTO v_stock_id;
  ELSE
    UPDATE public.stock SET quantity = quantity + v_line.quantity WHERE id = v_stock_id;
  END IF;

  UPDATE public.products SET
    cost = CASE
      WHEN v_current_stock + v_line.quantity = 0 THEN v_line.unit_cost
      ELSE ROUND(((v_current_stock * v_current_cost) + (v_line.quantity * v_line.unit_cost)) / (v_current_stock + v_line.quantity), 4)
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_line.product_id AND company_id = p_company_id;

  INSERT INTO public.stock_movements(company_id, stock_id, user_id, quantity, type, notes)
  VALUES (p_company_id, v_stock_id, p_user_id, v_line.quantity, 'supermarket_purchase_receipt', 'Purchase ' || v_order.order_number);

  v_lot_code := COALESCE(NULLIF(trim(v_line.lot_code), ''), 'OC-' || v_order.order_number::TEXT);
  INSERT INTO public.supermarket_stock_lots(
    company_id, branch_id, product_id, purchase_order_line_id, lot_code,
    quantity_received, quantity_remaining, expiration_date, received_on
  ) VALUES (
    p_company_id, p_branch_id, v_line.product_id, v_line.id, v_lot_code,
    v_line.quantity, v_line.quantity, v_line.expiration_date, CURRENT_DATE
  )
  ON CONFLICT (company_id, branch_id, product_id, lot_code) DO UPDATE SET
    quantity_received = public.supermarket_stock_lots.quantity_received + EXCLUDED.quantity_received,
    quantity_remaining = public.supermarket_stock_lots.quantity_remaining + EXCLUDED.quantity_remaining,
    expiration_date = COALESCE(EXCLUDED.expiration_date, public.supermarket_stock_lots.expiration_date);

  UPDATE public.supermarket_purchase_orders SET
    status = 'received',
    received_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = v_order.id;
  RETURN v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_receive_purchase(UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supermarket_receive_purchase(UUID, UUID, UUID, UUID) TO service_role;
