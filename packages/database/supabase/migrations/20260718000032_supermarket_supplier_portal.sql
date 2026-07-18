-- External supplier portal access and delivery confirmations for supermarket orders.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.supplier_portal.read', 'View supermarket supplier portal access'),
    ('supermarket.supplier_portal.manage', 'Create and revoke supermarket supplier portal access')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_supplier_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.supermarket_suppliers(id) ON DELETE CASCADE NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  label VARCHAR(100) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.supermarket_supplier_delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.supermarket_suppliers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.supermarket_purchase_orders(id) ON DELETE CASCADE NOT NULL,
  access_id UUID REFERENCES public.supermarket_supplier_portal_access(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('confirmed', 'rescheduled', 'unavailable')),
  promised_date DATE,
  notes TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, order_id),
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_supplier_portal_company
  ON public.supermarket_supplier_portal_access(company_id, branch_id, supplier_id, active, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_supplier_confirmations_order
  ON public.supermarket_supplier_delivery_confirmations(company_id, branch_id, order_id, confirmed_at DESC);

ALTER TABLE public.supermarket_supplier_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_supplier_delivery_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supermarket supplier portal access by company" ON public.supermarket_supplier_portal_access;
CREATE POLICY "Supermarket supplier portal access by company" ON public.supermarket_supplier_portal_access FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
DROP POLICY IF EXISTS "Supermarket supplier confirmations by company" ON public.supermarket_supplier_delivery_confirmations;
CREATE POLICY "Supermarket supplier confirmations by company" ON public.supermarket_supplier_delivery_confirmations FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

CREATE OR REPLACE FUNCTION public.supermarket_list_supplier_portal_access(
  p_company_id UUID, p_branch_id UUID
) RETURNS TABLE(
  id UUID, supplier_id UUID, supplier_name TEXT, label TEXT, expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN, created_at TIMESTAMP WITH TIME ZONE, revoked_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT a.id, a.supplier_id, s.name::TEXT, a.label::TEXT, a.expires_at,
    (a.active AND a.expires_at > timezone('utc'::text, now())) AS active,
    a.created_at, a.revoked_at, a.last_used_at
  FROM public.supermarket_supplier_portal_access a
  JOIN public.supermarket_suppliers s ON s.id = a.supplier_id AND s.company_id = a.company_id
  WHERE a.company_id = p_company_id AND a.branch_id = p_branch_id
  ORDER BY (a.active AND a.expires_at > timezone('utc'::text, now())) DESC, a.created_at DESC
  LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_create_supplier_portal_access(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_supplier_id UUID,
  p_token_hash TEXT, p_label TEXT, p_expires_at TIMESTAMP WITH TIME ZONE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE v_access_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF length(p_token_hash) <> 64 OR NULLIF(trim(p_label), '') IS NULL
    OR p_expires_at <= timezone('utc'::text, now())
    OR p_expires_at > timezone('utc'::text, now()) + interval '365 days' THEN
    RAISE EXCEPTION 'INVALID_SUPPLIER_PORTAL_ACCESS';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supermarket_suppliers s
    WHERE s.id = p_supplier_id AND s.company_id = p_company_id AND s.active
  ) THEN RAISE EXCEPTION 'SUPPLIER_NOT_FOUND'; END IF;
  INSERT INTO public.supermarket_supplier_portal_access(
    company_id, branch_id, supplier_id, token_hash, label, expires_at, created_by
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, lower(p_token_hash), trim(p_label), p_expires_at, p_user_id
  ) RETURNING id INTO v_access_id;
  RETURN v_access_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'SUPPLIER_PORTAL_TOKEN_COLLISION';
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_revoke_supplier_portal_access(
  p_company_id UUID, p_branch_id UUID, p_access_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  UPDATE public.supermarket_supplier_portal_access SET active = false,
    revoked_at = timezone('utc'::text, now())
  WHERE id = p_access_id AND company_id = p_company_id AND branch_id = p_branch_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUPPLIER_PORTAL_ACCESS_NOT_FOUND'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_supplier_portal_snapshot(
  p_token_hash TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_access public.supermarket_supplier_portal_access%ROWTYPE;
  v_supplier public.supermarket_suppliers%ROWTYPE;
  v_orders JSONB;
BEGIN
  UPDATE public.supermarket_supplier_portal_access SET last_used_at = timezone('utc'::text, now())
  WHERE token_hash = lower(p_token_hash) AND active
    AND expires_at > timezone('utc'::text, now())
  RETURNING * INTO v_access;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_SUPPLIER_PORTAL_TOKEN'; END IF;
  SELECT * INTO v_supplier FROM public.supermarket_suppliers
  WHERE id = v_access.supplier_id AND company_id = v_access.company_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUPPLIER_NOT_FOUND'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id, 'orderNumber', o.order_number, 'productName', p.name,
    'quantity', l.quantity, 'unitCost', l.unit_cost,
    'total', ROUND(l.quantity * l.unit_cost, 2), 'expectedDate', o.expected_on,
    'status', o.status, 'deliveryStatus', c.status, 'promisedDate', c.promised_date,
    'notes', COALESCE(c.notes, ''), 'confirmedAt', c.confirmed_at
  ) ORDER BY o.expected_on ASC NULLS LAST, o.order_number DESC), '[]'::JSONB) INTO v_orders
  FROM public.supermarket_purchase_orders o
  JOIN public.supermarket_purchase_order_lines l ON l.order_id = o.id AND l.company_id = o.company_id
  JOIN public.products p ON p.id = l.product_id AND p.company_id = l.company_id
  LEFT JOIN public.supermarket_supplier_delivery_confirmations c
    ON c.order_id = o.id AND c.company_id = o.company_id
  WHERE o.company_id = v_access.company_id AND o.branch_id = v_access.branch_id
    AND o.status IN ('ordered', 'received')
    AND lower(trim(o.supplier_name)) = lower(trim(v_supplier.name));

  RETURN jsonb_build_object(
    'supplier', jsonb_build_object('id', v_supplier.id, 'name', v_supplier.name,
      'email', COALESCE(v_supplier.email, ''), 'phone', COALESCE(v_supplier.phone, '')),
    'access', jsonb_build_object('label', v_access.label, 'expiresAt', v_access.expires_at),
    'orders', v_orders
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_supplier_confirm_delivery(
  p_token_hash TEXT, p_order_id UUID, p_idempotency_key TEXT,
  p_status TEXT, p_promised_date DATE, p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_access public.supermarket_supplier_portal_access%ROWTYPE;
  v_existing public.supermarket_supplier_delivery_confirmations%ROWTYPE;
  v_confirmation_id UUID;
BEGIN
  UPDATE public.supermarket_supplier_portal_access SET last_used_at = timezone('utc'::text, now())
  WHERE token_hash = lower(p_token_hash) AND active
    AND expires_at > timezone('utc'::text, now())
  RETURNING * INTO v_access;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_SUPPLIER_PORTAL_TOKEN'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    OR p_status NOT IN ('confirmed', 'rescheduled', 'unavailable') THEN
    RAISE EXCEPTION 'INVALID_DELIVERY_CONFIRMATION';
  END IF;
  IF p_status IN ('confirmed', 'rescheduled') AND (p_promised_date IS NULL OR p_promised_date < CURRENT_DATE) THEN
    RAISE EXCEPTION 'INVALID_PROMISED_DATE';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_access.company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_supplier_delivery_confirmations
  WHERE company_id = v_access.company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('confirmationId', v_existing.id, 'status', v_existing.status, 'duplicate', true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supermarket_purchase_orders o
    JOIN public.supermarket_suppliers s ON s.id = v_access.supplier_id AND s.company_id = o.company_id
    WHERE o.id = p_order_id AND o.company_id = v_access.company_id AND o.branch_id = v_access.branch_id
      AND o.status = 'ordered' AND lower(trim(o.supplier_name)) = lower(trim(s.name))
  ) THEN RAISE EXCEPTION 'SUPPLIER_ORDER_NOT_FOUND'; END IF;

  INSERT INTO public.supermarket_supplier_delivery_confirmations(
    company_id, branch_id, supplier_id, order_id, access_id, idempotency_key,
    status, promised_date, notes
  ) VALUES (
    v_access.company_id, v_access.branch_id, v_access.supplier_id, p_order_id, v_access.id,
    p_idempotency_key, p_status, CASE WHEN p_status = 'unavailable' THEN NULL ELSE p_promised_date END,
    NULLIF(trim(p_notes), '')
  )
  ON CONFLICT (company_id, order_id) DO UPDATE SET access_id = EXCLUDED.access_id,
    idempotency_key = EXCLUDED.idempotency_key, status = EXCLUDED.status,
    promised_date = EXCLUDED.promised_date, notes = EXCLUDED.notes,
    confirmed_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_confirmation_id;
  RETURN jsonb_build_object('confirmationId', v_confirmation_id, 'status', p_status, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_list_supplier_portal_access(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_create_supplier_portal_access(UUID, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_revoke_supplier_portal_access(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_supplier_portal_snapshot(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_supplier_confirm_delivery(TEXT, UUID, TEXT, TEXT, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supermarket_list_supplier_portal_access(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_create_supplier_portal_access(UUID, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_revoke_supplier_portal_access(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_supplier_portal_snapshot(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_supplier_confirm_delivery(TEXT, UUID, TEXT, TEXT, DATE, TEXT) TO service_role;
