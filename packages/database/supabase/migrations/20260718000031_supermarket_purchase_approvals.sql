-- Supermarket purchase approval policies, requests and auditable decisions.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.purchase_approvals.read', 'View supermarket purchase approvals'),
    ('supermarket.purchase_approvals.request', 'Request approval for supermarket purchases'),
    ('supermarket.purchase_approvals.decide', 'Approve or reject supermarket purchases'),
    ('supermarket.purchase_approvals.policy', 'Configure supermarket purchase approval limits')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_purchase_approval_policies (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true NOT NULL,
  auto_approve_limit NUMERIC(16, 2) DEFAULT 100000 NOT NULL CHECK (auto_approve_limit >= 0),
  second_approval_threshold NUMERIC(16, 2) DEFAULT 1000000 NOT NULL CHECK (second_approval_threshold > auto_approve_limit),
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.supermarket_purchase_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  order_id UUID REFERENCES public.supermarket_purchase_orders(id) ON DELETE CASCADE NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  amount NUMERIC(16, 2) NOT NULL CHECK (amount >= 0),
  required_approvals SMALLINT NOT NULL CHECK (required_approvals BETWEEN 0 AND 2),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'auto_approved', 'rejected')),
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, order_id),
  UNIQUE(company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.supermarket_purchase_approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.supermarket_purchase_approval_requests(id) ON DELETE CASCADE NOT NULL,
  decided_by UUID NOT NULL,
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(request_id, decided_by)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_purchase_approvals_branch
  ON public.supermarket_purchase_approval_requests(company_id, branch_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_purchase_decisions_request
  ON public.supermarket_purchase_approval_decisions(company_id, request_id, created_at);

ALTER TABLE public.supermarket_purchase_approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_purchase_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_purchase_approval_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supermarket approval policies by company" ON public.supermarket_purchase_approval_policies;
CREATE POLICY "Supermarket approval policies by company" ON public.supermarket_purchase_approval_policies FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
DROP POLICY IF EXISTS "Supermarket approval requests by company" ON public.supermarket_purchase_approval_requests;
CREATE POLICY "Supermarket approval requests by company" ON public.supermarket_purchase_approval_requests FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
DROP POLICY IF EXISTS "Supermarket approval decisions by company" ON public.supermarket_purchase_approval_decisions;
CREATE POLICY "Supermarket approval decisions by company" ON public.supermarket_purchase_approval_decisions FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

CREATE OR REPLACE FUNCTION public.supermarket_get_purchase_approval_policy(
  p_company_id UUID, p_branch_id UUID
) RETURNS TABLE(enabled BOOLEAN, auto_approve_limit NUMERIC, second_approval_threshold NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT COALESCE(p.enabled, true), COALESCE(p.auto_approve_limit, 100000),
    COALESCE(p.second_approval_threshold, 1000000)
  FROM (VALUES (1)) AS seed(value)
  LEFT JOIN public.supermarket_purchase_approval_policies p ON p.company_id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_save_purchase_approval_policy(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_enabled BOOLEAN,
  p_auto_approve_limit NUMERIC, p_second_approval_threshold NUMERIC
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_auto_approve_limit < 0 OR p_second_approval_threshold <= p_auto_approve_limit THEN
    RAISE EXCEPTION 'INVALID_APPROVAL_POLICY';
  END IF;
  INSERT INTO public.supermarket_purchase_approval_policies(
    company_id, enabled, auto_approve_limit, second_approval_threshold, updated_by
  ) VALUES (p_company_id, p_enabled, p_auto_approve_limit, p_second_approval_threshold, p_user_id)
  ON CONFLICT (company_id) DO UPDATE SET enabled = EXCLUDED.enabled,
    auto_approve_limit = EXCLUDED.auto_approve_limit,
    second_approval_threshold = EXCLUDED.second_approval_threshold,
    updated_by = EXCLUDED.updated_by, updated_at = timezone('utc'::text, now());
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_purchase_approvals(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID
) RETURNS TABLE(
  id UUID, order_id UUID, order_number BIGINT, supplier_name TEXT, product_name TEXT,
  amount NUMERIC, required_approvals INTEGER, approval_count BIGINT, status TEXT,
  requested_by UUID, requested_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE, can_decide BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT r.id, r.order_id, o.order_number, o.supplier_name::TEXT, p.name::TEXT,
    r.amount, r.required_approvals::INTEGER,
    COUNT(d.id) FILTER (WHERE d.decision = 'approved') AS approval_count,
    r.status::TEXT, r.requested_by, r.requested_at, r.resolved_at,
    (r.status = 'pending' AND r.requested_by <> p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.supermarket_purchase_approval_decisions own
        WHERE own.request_id = r.id AND own.decided_by = p_user_id
      )) AS can_decide
  FROM public.supermarket_purchase_approval_requests r
  JOIN public.supermarket_purchase_orders o ON o.id = r.order_id AND o.company_id = r.company_id
  JOIN public.supermarket_purchase_order_lines l ON l.order_id = o.id AND l.company_id = o.company_id
  JOIN public.products p ON p.id = l.product_id AND p.company_id = l.company_id
  LEFT JOIN public.supermarket_purchase_approval_decisions d
    ON d.request_id = r.id AND d.company_id = r.company_id
  WHERE r.company_id = p_company_id AND r.branch_id = p_branch_id
  GROUP BY r.id, o.order_number, o.supplier_name, p.name
  ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.requested_at DESC
  LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_request_purchase_approval(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID,
  p_order_id UUID, p_idempotency_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order public.supermarket_purchase_orders%ROWTYPE;
  v_existing public.supermarket_purchase_approval_requests%ROWTYPE;
  v_request_id UUID;
  v_amount NUMERIC(16, 2);
  v_enabled BOOLEAN := true;
  v_auto_limit NUMERIC(16, 2) := 100000;
  v_second_threshold NUMERIC(16, 2) := 1000000;
  v_required SMALLINT;
  v_status TEXT;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_purchase_approval_requests
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('requestId', v_existing.id, 'status', v_existing.status,
      'requiredApprovals', v_existing.required_approvals, 'duplicate', true);
  END IF;

  SELECT * INTO v_order FROM public.supermarket_purchase_orders
  WHERE id = p_order_id AND company_id = p_company_id AND branch_id = p_branch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_FOUND'; END IF;
  IF v_order.status <> 'draft' THEN RAISE EXCEPTION 'PURCHASE_NOT_DRAFT'; END IF;
  SELECT ROUND(SUM(quantity * unit_cost), 2) INTO v_amount
  FROM public.supermarket_purchase_order_lines
  WHERE company_id = p_company_id AND order_id = p_order_id;
  IF v_amount IS NULL THEN RAISE EXCEPTION 'PURCHASE_LINE_NOT_FOUND'; END IF;

  SELECT p.enabled, p.auto_approve_limit, p.second_approval_threshold
    INTO v_enabled, v_auto_limit, v_second_threshold
  FROM public.supermarket_purchase_approval_policies p WHERE p.company_id = p_company_id;
  v_enabled := COALESCE(v_enabled, true);
  v_auto_limit := COALESCE(v_auto_limit, 100000);
  v_second_threshold := COALESCE(v_second_threshold, 1000000);
  v_required := CASE WHEN NOT v_enabled OR v_amount <= v_auto_limit THEN 0
    WHEN v_amount >= v_second_threshold THEN 2 ELSE 1 END;
  v_status := CASE WHEN v_required = 0 THEN 'auto_approved' ELSE 'pending' END;

  SELECT * INTO v_existing FROM public.supermarket_purchase_approval_requests
  WHERE company_id = p_company_id AND order_id = p_order_id FOR UPDATE;
  IF FOUND AND v_existing.status = 'pending' THEN RAISE EXCEPTION 'APPROVAL_ALREADY_PENDING'; END IF;
  IF FOUND THEN
    DELETE FROM public.supermarket_purchase_approval_decisions WHERE request_id = v_existing.id;
    UPDATE public.supermarket_purchase_approval_requests SET idempotency_key = p_idempotency_key,
      amount = v_amount, required_approvals = v_required, status = v_status,
      requested_by = p_user_id, requested_at = timezone('utc'::text, now()),
      resolved_at = CASE WHEN v_required = 0 THEN timezone('utc'::text, now()) ELSE NULL END,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_existing.id RETURNING id INTO v_request_id;
  ELSE
    INSERT INTO public.supermarket_purchase_approval_requests(
      company_id, branch_id, order_id, idempotency_key, amount, required_approvals,
      status, requested_by, resolved_at
    ) VALUES (
      p_company_id, p_branch_id, p_order_id, p_idempotency_key, v_amount, v_required,
      v_status, p_user_id, CASE WHEN v_required = 0 THEN timezone('utc'::text, now()) ELSE NULL END
    ) RETURNING id INTO v_request_id;
  END IF;
  IF v_required = 0 THEN
    UPDATE public.supermarket_purchase_orders SET status = 'ordered',
      updated_at = timezone('utc'::text, now()) WHERE id = p_order_id;
  END IF;
  RETURN jsonb_build_object('requestId', v_request_id, 'status', v_status,
    'requiredApprovals', v_required, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_decide_purchase_approval(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID,
  p_request_id UUID, p_decision TEXT, p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_request public.supermarket_purchase_approval_requests%ROWTYPE;
  v_previous public.supermarket_purchase_approval_decisions%ROWTYPE;
  v_approvals INTEGER;
  v_status TEXT;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'INVALID_APPROVAL_DECISION'; END IF;
  SELECT * INTO v_request FROM public.supermarket_purchase_approval_requests
  WHERE id = p_request_id AND company_id = p_company_id AND branch_id = p_branch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'APPROVAL_NOT_FOUND'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'APPROVAL_ALREADY_RESOLVED'; END IF;
  IF v_request.requested_by = p_user_id THEN RAISE EXCEPTION 'SELF_APPROVAL_NOT_ALLOWED'; END IF;
  SELECT * INTO v_previous FROM public.supermarket_purchase_approval_decisions
  WHERE request_id = p_request_id AND decided_by = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('requestId', p_request_id, 'status', v_request.status,
      'approvalCount', 0, 'duplicate', true);
  END IF;
  INSERT INTO public.supermarket_purchase_approval_decisions(company_id, request_id, decided_by, decision, notes)
  VALUES (p_company_id, p_request_id, p_user_id, p_decision, NULLIF(trim(p_notes), ''));

  IF p_decision = 'rejected' THEN
    v_status := 'rejected';
    UPDATE public.supermarket_purchase_approval_requests SET status = v_status,
      resolved_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
    WHERE id = p_request_id;
  ELSE
    SELECT count(*) INTO v_approvals FROM public.supermarket_purchase_approval_decisions
    WHERE request_id = p_request_id AND decision = 'approved';
    IF v_approvals >= v_request.required_approvals THEN
      v_status := 'approved';
      UPDATE public.supermarket_purchase_approval_requests SET status = v_status,
        resolved_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
      WHERE id = p_request_id;
      UPDATE public.supermarket_purchase_orders SET status = 'ordered',
        updated_at = timezone('utc'::text, now()) WHERE id = v_request.order_id;
    ELSE
      v_status := 'pending';
    END IF;
  END IF;
  RETURN jsonb_build_object('requestId', p_request_id, 'status', v_status,
    'approvalCount', COALESCE(v_approvals, 0), 'duplicate', false);
END;
$$;

-- New and edited purchase orders remain drafts until the approval workflow releases them.
CREATE OR REPLACE FUNCTION public.supermarket_save_purchase(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_order_id UUID,
  p_supplier TEXT, p_product_id UUID, p_quantity NUMERIC, p_unit_cost NUMERIC,
  p_expected_date DATE, p_status TEXT, p_lot_code TEXT, p_expiration_date DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE v_order_id UUID := p_order_id;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_status <> 'draft' OR p_quantity <= 0 OR p_unit_cost < 0 THEN RAISE EXCEPTION 'INVALID_PURCHASE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.supermarket_products sp WHERE sp.company_id = p_company_id AND sp.product_id = p_product_id) THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;
  IF v_order_id IS NULL THEN
    INSERT INTO public.supermarket_purchase_orders(company_id, branch_id, supplier_name, expected_on, status, created_by)
    VALUES (p_company_id, p_branch_id, trim(p_supplier), p_expected_date, 'draft', p_user_id)
    RETURNING id INTO v_order_id;
  ELSE
    IF EXISTS (SELECT 1 FROM public.supermarket_purchase_approval_requests r WHERE r.order_id = v_order_id AND r.status = 'pending') THEN
      RAISE EXCEPTION 'PURCHASE_PENDING_APPROVAL';
    END IF;
    UPDATE public.supermarket_purchase_orders SET supplier_name = trim(p_supplier),
      expected_on = p_expected_date, updated_at = timezone('utc'::text, now())
    WHERE id = v_order_id AND company_id = p_company_id AND branch_id = p_branch_id AND status = 'draft';
    IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_EDITABLE'; END IF;
    DELETE FROM public.supermarket_purchase_order_lines WHERE order_id = v_order_id AND company_id = p_company_id;
  END IF;
  INSERT INTO public.supermarket_purchase_order_lines(company_id, order_id, product_id, quantity, unit_cost, lot_code, expiration_date)
  VALUES (p_company_id, v_order_id, p_product_id, p_quantity, p_unit_cost,
    NULLIF(trim(p_lot_code), ''), p_expiration_date);
  RETURN v_order_id;
END;
$$;

-- Reuse the corrected receipt implementation and require an approved/ordered purchase.
CREATE OR REPLACE FUNCTION public.supermarket_receive_purchase(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_order_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order public.supermarket_purchase_orders%ROWTYPE; v_line public.supermarket_purchase_order_lines%ROWTYPE;
  v_stock_id UUID; v_current_stock NUMERIC := 0; v_current_cost NUMERIC := 0; v_lot_code TEXT;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  SELECT * INTO v_order FROM public.supermarket_purchase_orders
  WHERE id = p_order_id AND company_id = p_company_id AND branch_id = p_branch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_FOUND'; END IF;
  IF v_order.status = 'received' THEN RETURN v_order.id; END IF;
  IF v_order.status <> 'ordered' THEN RAISE EXCEPTION 'PURCHASE_NOT_APPROVED'; END IF;
  SELECT * INTO v_line FROM public.supermarket_purchase_order_lines
  WHERE order_id = v_order.id AND company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_LINE_NOT_FOUND'; END IF;
  SELECT p.cost INTO v_current_cost FROM public.products p
  WHERE p.id = v_line.product_id AND p.company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  SELECT s.id, s.quantity INTO v_stock_id, v_current_stock FROM public.stock s
  WHERE s.company_id = p_company_id AND s.branch_id = p_branch_id AND s.product_id = v_line.product_id FOR UPDATE;
  v_current_stock := COALESCE(v_current_stock, 0); v_current_cost := COALESCE(v_current_cost, 0);
  IF v_stock_id IS NULL THEN
    INSERT INTO public.stock(company_id, branch_id, product_id, quantity, min_stock)
    VALUES (p_company_id, p_branch_id, v_line.product_id, v_line.quantity, 0) RETURNING id INTO v_stock_id;
  ELSE UPDATE public.stock SET quantity = quantity + v_line.quantity WHERE id = v_stock_id; END IF;
  UPDATE public.products SET cost = ROUND(((v_current_stock * v_current_cost) + (v_line.quantity * v_line.unit_cost)) /
    (v_current_stock + v_line.quantity), 4), updated_at = timezone('utc'::text, now())
  WHERE id = v_line.product_id AND company_id = p_company_id;
  INSERT INTO public.stock_movements(company_id, stock_id, user_id, quantity, type, notes)
  VALUES (p_company_id, v_stock_id, p_user_id, v_line.quantity, 'supermarket_purchase_receipt', 'Purchase ' || v_order.order_number);
  v_lot_code := COALESCE(NULLIF(trim(v_line.lot_code), ''), 'OC-' || v_order.order_number::TEXT);
  INSERT INTO public.supermarket_stock_lots(company_id, branch_id, product_id, purchase_order_line_id, lot_code,
    quantity_received, quantity_remaining, expiration_date, received_on)
  VALUES (p_company_id, p_branch_id, v_line.product_id, v_line.id, v_lot_code,
    v_line.quantity, v_line.quantity, v_line.expiration_date, CURRENT_DATE)
  ON CONFLICT (company_id, branch_id, product_id, lot_code) DO UPDATE SET
    quantity_received = public.supermarket_stock_lots.quantity_received + EXCLUDED.quantity_received,
    quantity_remaining = public.supermarket_stock_lots.quantity_remaining + EXCLUDED.quantity_remaining,
    expiration_date = COALESCE(EXCLUDED.expiration_date, public.supermarket_stock_lots.expiration_date);
  UPDATE public.supermarket_purchase_orders SET status = 'received', received_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now()) WHERE id = v_order.id;
  RETURN v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_get_purchase_approval_policy(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_save_purchase_approval_policy(UUID, UUID, UUID, BOOLEAN, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_list_purchase_approvals(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_request_purchase_approval(UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_decide_purchase_approval(UUID, UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supermarket_get_purchase_approval_policy(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_save_purchase_approval_policy(UUID, UUID, UUID, BOOLEAN, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_purchase_approvals(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_request_purchase_approval(UUID, UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_decide_purchase_approval(UUID, UUID, UUID, UUID, TEXT, TEXT) TO service_role;
