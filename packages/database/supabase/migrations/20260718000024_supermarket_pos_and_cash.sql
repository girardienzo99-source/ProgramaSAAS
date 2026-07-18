-- Supermarket POS: transactional cash sessions, idempotent sales and audited returns.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.cash.read', 'View supermarket cash status'),
    ('supermarket.cash.manage', 'Open and close supermarket cash registers'),
    ('supermarket.returns.create', 'Register supermarket returns'),
    ('supermarket.returns.read', 'View supermarket returns')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_sale_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  caja_id UUID REFERENCES public.cajas(id) ON DELETE RESTRICT NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE RESTRICT NOT NULL,
  user_id UUID NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'qr')),
  total NUMERIC(14, 2) NOT NULL CHECK (total >= 0),
  fiscal_status VARCHAR(20) DEFAULT 'pending' NOT NULL
    CHECK (fiscal_status IN ('pending', 'authorized', 'rejected', 'not_required')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.supermarket_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  caja_id UUID REFERENCES public.cajas(id) ON DELETE RESTRICT NOT NULL,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  reason VARCHAR(120) NOT NULL,
  disposition VARCHAR(20) NOT NULL CHECK (disposition IN ('restock', 'waste')),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_sale_requests_branch
  ON public.supermarket_sale_requests(company_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_returns_branch
  ON public.supermarket_returns(company_id, branch_id, created_at DESC);

ALTER TABLE public.supermarket_sale_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supermarket sales by company" ON public.supermarket_sale_requests FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
CREATE POLICY "Supermarket returns by company" ON public.supermarket_returns FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

CREATE OR REPLACE FUNCTION public.supermarket_get_cash_state(p_company_id UUID, p_branch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cash public.cajas%ROWTYPE;
  v_sales_total NUMERIC(14, 2) := 0;
  v_cash_payments NUMERIC(14, 2) := 0;
  v_qr_payments NUMERIC(14, 2) := 0;
  v_ticket_count INTEGER := 0;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  SELECT * INTO v_cash FROM public.cajas
  WHERE company_id = p_company_id AND branch_id = p_branch_id
    AND status = 'open' AND name = 'Caja Supermercado'
  ORDER BY opened_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'isOpen', false, 'cashId', NULL, 'name', 'Caja Supermercado',
      'openingBalance', 0, 'expectedCash', 0, 'salesTotal', 0,
      'cashPayments', 0, 'qrPayments', 0, 'ticketCount', 0, 'openedAt', NULL
    );
  END IF;

  SELECT COALESCE(SUM(r.total), 0), COUNT(*)::INTEGER
  INTO v_sales_total, v_ticket_count
  FROM public.supermarket_sale_requests r
  WHERE r.company_id = p_company_id AND r.caja_id = v_cash.id;
  SELECT
    COALESCE(SUM(CASE WHEN m.payment_method = 'cash' THEN m.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN m.payment_method = 'qr' THEN m.amount ELSE 0 END), 0)
  INTO v_cash_payments, v_qr_payments
  FROM public.caja_movements m
  WHERE m.company_id = p_company_id AND m.caja_id = v_cash.id
    AND m.type = 'supermarket_sale';

  RETURN jsonb_build_object(
    'isOpen', true, 'cashId', v_cash.id, 'name', v_cash.name,
    'openingBalance', v_cash.opening_balance,
    'expectedCash', v_cash.opening_balance + v_cash_payments,
    'salesTotal', v_sales_total, 'cashPayments', v_cash_payments,
    'qrPayments', v_qr_payments, 'ticketCount', v_ticket_count,
    'openedAt', v_cash.opened_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_open_cash(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_opening_balance NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_cash_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_opening_balance < 0 THEN RAISE EXCEPTION 'INVALID_OPENING_BALANCE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_branch_id::TEXT || ':supermarket-cash'));
  SELECT id INTO v_cash_id FROM public.cajas
  WHERE company_id = p_company_id AND branch_id = p_branch_id AND status = 'open'
  ORDER BY opened_at DESC LIMIT 1;
  IF v_cash_id IS NOT NULL THEN RAISE EXCEPTION 'CASH_ALREADY_OPEN'; END IF;
  INSERT INTO public.cajas(company_id, branch_id, name, status, opened_at, opened_by, opening_balance)
  VALUES (p_company_id, p_branch_id, 'Caja Supermercado', 'open', timezone('utc'::text, now()), p_user_id, p_opening_balance)
  RETURNING id INTO v_cash_id;
  RETURN v_cash_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_close_cash(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_declared_cash NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cash public.cajas%ROWTYPE;
  v_cash_payments NUMERIC(14, 2) := 0;
  v_expected NUMERIC(14, 2);
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_declared_cash < 0 THEN RAISE EXCEPTION 'INVALID_DECLARED_CASH'; END IF;
  SELECT * INTO v_cash FROM public.cajas
  WHERE company_id = p_company_id AND branch_id = p_branch_id
    AND status = 'open' AND name = 'Caja Supermercado'
  ORDER BY opened_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASH_NOT_OPEN'; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_payments FROM public.caja_movements
  WHERE company_id = p_company_id AND caja_id = v_cash.id
    AND type = 'supermarket_sale' AND payment_method = 'cash';
  v_expected := v_cash.opening_balance + v_cash_payments;
  UPDATE public.cajas SET status = 'closed', closed_at = timezone('utc'::text, now()),
    closed_by = p_user_id, closing_balance = p_declared_cash
  WHERE id = v_cash.id;
  RETURN jsonb_build_object(
    'cashId', v_cash.id, 'expectedCash', v_expected,
    'declaredCash', p_declared_cash, 'difference', ROUND(p_declared_cash - v_expected, 2)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_commit_sale(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID,
  p_idempotency_key TEXT, p_payment_method TEXT, p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing public.supermarket_sale_requests%ROWTYPE;
  v_cash public.cajas%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_supermarket public.supermarket_products%ROWTYPE;
  v_stock public.stock%ROWTYPE;
  v_item JSONB;
  v_lot public.supermarket_stock_lots%ROWTYPE;
  v_product_id UUID;
  v_sale_id UUID;
  v_quantity NUMERIC(14, 3);
  v_remaining NUMERIC(14, 3);
  v_consumed NUMERIC(14, 3);
  v_list_total NUMERIC(14, 2);
  v_line_total NUMERIC(14, 2);
  v_line_net NUMERIC(14, 2);
  v_subtotal NUMERIC(14, 2) := 0;
  v_discount NUMERIC(14, 2) := 0;
  v_tax NUMERIC(14, 2) := 0;
  v_total NUMERIC(14, 2) := 0;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY';
  END IF;
  IF p_payment_method NOT IN ('cash', 'qr') OR jsonb_typeof(p_items) <> 'array'
    OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'INVALID_SALE';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_sale_requests
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('saleId', v_existing.sale_id, 'total', v_existing.total,
      'fiscalStatus', v_existing.fiscal_status, 'duplicate', true);
  END IF;
  SELECT * INTO v_cash FROM public.cajas
  WHERE company_id = p_company_id AND branch_id = p_branch_id
    AND status = 'open' AND name = 'Caja Supermercado'
  ORDER BY opened_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASH_NOT_OPEN'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'productId')::UUID;
      v_quantity := (v_item->>'quantity')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'INVALID_SALE_ITEM'; END;
    IF v_quantity <= 0 OR v_quantity > 100000 THEN RAISE EXCEPTION 'INVALID_SALE_ITEM'; END IF;
    SELECT * INTO v_product FROM public.products
    WHERE id = v_product_id AND company_id = p_company_id FOR UPDATE;
    SELECT * INTO v_supermarket FROM public.supermarket_products
    WHERE product_id = v_product_id AND company_id = p_company_id AND active = true FOR UPDATE;
    SELECT * INTO v_stock FROM public.stock
    WHERE company_id = p_company_id AND branch_id = p_branch_id AND product_id = v_product_id FOR UPDATE;
    IF v_product.id IS NULL OR v_supermarket.product_id IS NULL OR v_stock.id IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;
    IF v_stock.quantity < v_quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_product.name; END IF;
    v_list_total := ROUND(v_quantity * v_product.price, 2);
    v_line_total := CASE
      WHEN v_supermarket.promo = '30off' THEN ROUND(v_list_total * 0.70, 2)
      WHEN v_supermarket.promo = '2x1' AND NOT v_supermarket.is_weighed
        THEN ROUND(CEIL(v_quantity / 2) * v_product.price, 2)
      ELSE v_list_total END;
    v_line_net := ROUND(v_line_total / (1 + v_product.vat_rate / 100), 2);
    v_total := v_total + v_line_total;
    v_subtotal := v_subtotal + v_line_net;
    v_tax := v_tax + (v_line_total - v_line_net);
    v_discount := v_discount + (v_list_total - v_line_total);
  END LOOP;

  INSERT INTO public.sales(company_id, branch_id, caja_id, user_id, subtotal, discount, tax_amount, total, payment_method, status)
  VALUES (p_company_id, p_branch_id, v_cash.id, p_user_id, v_subtotal, v_discount, v_tax, v_total, p_payment_method, 'completed')
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'productId')::UUID;
    v_quantity := (v_item->>'quantity')::NUMERIC;
    SELECT * INTO v_product FROM public.products WHERE id = v_product_id AND company_id = p_company_id;
    SELECT * INTO v_supermarket FROM public.supermarket_products WHERE product_id = v_product_id AND company_id = p_company_id;
    SELECT * INTO v_stock FROM public.stock
      WHERE company_id = p_company_id AND branch_id = p_branch_id AND product_id = v_product_id FOR UPDATE;
    v_list_total := ROUND(v_quantity * v_product.price, 2);
    v_line_total := CASE
      WHEN v_supermarket.promo = '30off' THEN ROUND(v_list_total * 0.70, 2)
      WHEN v_supermarket.promo = '2x1' AND NOT v_supermarket.is_weighed
        THEN ROUND(CEIL(v_quantity / 2) * v_product.price, 2)
      ELSE v_list_total END;
    UPDATE public.stock SET quantity = quantity - v_quantity WHERE id = v_stock.id;
    INSERT INTO public.stock_movements(company_id, stock_id, user_id, quantity, type, notes)
    VALUES (p_company_id, v_stock.id, p_user_id, -v_quantity, 'supermarket_sale', 'Venta POS ' || v_sale_id);
    INSERT INTO public.sale_items(company_id, sale_id, product_id, quantity, unit_price, discount, tax_rate, subtotal)
    VALUES (p_company_id, v_sale_id, v_product_id, v_quantity, v_product.price,
      v_list_total - v_line_total, v_product.vat_rate, v_line_total);

    v_remaining := v_quantity;
    FOR v_lot IN SELECT * FROM public.supermarket_stock_lots
      WHERE company_id = p_company_id AND branch_id = p_branch_id
        AND product_id = v_product_id AND quantity_remaining > 0
      ORDER BY expiration_date ASC NULLS LAST, received_on ASC, id ASC FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_consumed := LEAST(v_lot.quantity_remaining, v_remaining);
      UPDATE public.supermarket_stock_lots
      SET quantity_remaining = quantity_remaining - v_consumed WHERE id = v_lot.id;
      v_remaining := v_remaining - v_consumed;
    END LOOP;
  END LOOP;

  INSERT INTO public.supermarket_sale_requests(
    company_id, branch_id, caja_id, sale_id, user_id, idempotency_key, payment_method, total
  ) VALUES (p_company_id, p_branch_id, v_cash.id, v_sale_id, p_user_id, p_idempotency_key, p_payment_method, v_total);
  INSERT INTO public.caja_movements(company_id, caja_id, amount, type, payment_method, reference_id, notes)
  VALUES (p_company_id, v_cash.id, v_total, 'supermarket_sale', p_payment_method, v_sale_id, 'Venta POS supermercado');
  RETURN jsonb_build_object('saleId', v_sale_id, 'total', v_total,
    'subtotal', v_subtotal, 'taxAmount', v_tax, 'discount', v_discount,
    'fiscalStatus', 'pending', 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_register_return(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_idempotency_key TEXT,
  p_barcode TEXT, p_quantity NUMERIC, p_reason TEXT, p_disposition TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing public.supermarket_returns%ROWTYPE;
  v_cash public.cajas%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_stock public.stock%ROWTYPE;
  v_return_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    OR p_quantity <= 0 OR p_disposition NOT IN ('restock', 'waste') OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'INVALID_RETURN';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_returns
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN jsonb_build_object('returnId', v_existing.id, 'duplicate', true); END IF;
  SELECT * INTO v_cash FROM public.cajas
  WHERE company_id = p_company_id AND branch_id = p_branch_id
    AND status = 'open' AND name = 'Caja Supermercado'
  ORDER BY opened_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASH_NOT_OPEN'; END IF;
  SELECT p.* INTO v_product FROM public.products p
  JOIN public.supermarket_products sp ON sp.product_id = p.id AND sp.company_id = p.company_id
  WHERE p.company_id = p_company_id AND p.barcode = trim(p_barcode) FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  SELECT * INTO v_stock FROM public.stock
  WHERE company_id = p_company_id AND branch_id = p_branch_id AND product_id = v_product.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF p_disposition = 'restock' THEN
    UPDATE public.stock SET quantity = quantity + p_quantity WHERE id = v_stock.id;
    INSERT INTO public.stock_movements(company_id, stock_id, user_id, quantity, type, notes)
    VALUES (p_company_id, v_stock.id, p_user_id, p_quantity, 'supermarket_return', trim(p_reason));
  END IF;
  INSERT INTO public.supermarket_returns(
    company_id, branch_id, caja_id, user_id, product_id, idempotency_key,
    quantity, reason, disposition, unit_price
  ) VALUES (
    p_company_id, p_branch_id, v_cash.id, p_user_id, v_product.id, p_idempotency_key,
    p_quantity, trim(p_reason), p_disposition, v_product.price
  ) RETURNING id INTO v_return_id;
  RETURN jsonb_build_object('returnId', v_return_id, 'productId', v_product.id,
    'productName', v_product.name, 'disposition', p_disposition, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_get_cash_state(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_open_cash(UUID, UUID, UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_close_cash(UUID, UUID, UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_commit_sale(UUID, UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_register_return(UUID, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supermarket_get_cash_state(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_open_cash(UUID, UUID, UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_close_cash(UUID, UUID, UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_commit_sale(UUID, UUID, UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_register_return(UUID, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT) TO service_role;
