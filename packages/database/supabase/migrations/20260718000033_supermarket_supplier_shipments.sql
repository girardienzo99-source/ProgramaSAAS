-- Supplier advance shipping notices and private PDF documents for supermarket orders.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.supplier_shipments.read', 'View supplier advance shipping notices'),
    ('supermarket.supplier_shipments.manage', 'Manage supplier advance shipping notices')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_supplier_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  supplier_id UUID REFERENCES public.supermarket_suppliers(id) ON DELETE RESTRICT NOT NULL,
  order_id UUID REFERENCES public.supermarket_purchase_orders(id) ON DELETE CASCADE NOT NULL,
  access_id UUID REFERENCES public.supermarket_supplier_portal_access(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  dispatch_number VARCHAR(80) NOT NULL,
  carrier VARCHAR(120) NOT NULL,
  tracking_number VARCHAR(120),
  shipped_on DATE NOT NULL,
  estimated_arrival DATE NOT NULL,
  package_count INTEGER DEFAULT 0 NOT NULL CHECK (package_count BETWEEN 0 AND 100000),
  pallet_count INTEGER DEFAULT 0 NOT NULL CHECK (pallet_count BETWEEN 0 AND 10000),
  status VARCHAR(20) DEFAULT 'announced' NOT NULL
    CHECK (status IN ('announced', 'in_transit', 'delivered', 'cancelled')),
  notes TEXT,
  document_path TEXT,
  document_name VARCHAR(255),
  document_content_type VARCHAR(100),
  document_size BIGINT CHECK (document_size BETWEEN 1 AND 10485760),
  document_sha256 VARCHAR(64) CHECK (document_sha256 IS NULL OR length(document_sha256) = 64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, order_id),
  UNIQUE(company_id, idempotency_key),
  UNIQUE(company_id, dispatch_number)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_supplier_shipments_branch
  ON public.supermarket_supplier_shipments(company_id, branch_id, status, estimated_arrival, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_supplier_shipments_supplier
  ON public.supermarket_supplier_shipments(company_id, supplier_id, created_at DESC);

ALTER TABLE public.supermarket_supplier_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Supermarket supplier shipments by company" ON public.supermarket_supplier_shipments;
CREATE POLICY "Supermarket supplier shipments by company" ON public.supermarket_supplier_shipments FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

CREATE OR REPLACE FUNCTION public.supermarket_list_supplier_shipments(
  p_company_id UUID, p_branch_id UUID, p_supplier_id UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID, supplier_id UUID, supplier_name TEXT, order_id UUID, order_number BIGINT,
  product_name TEXT, dispatch_number TEXT, carrier TEXT, tracking_number TEXT,
  shipped_on DATE, estimated_arrival DATE, package_count INTEGER, pallet_count INTEGER,
  status TEXT, notes TEXT, document_name TEXT, document_available BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT sh.id, sh.supplier_id, s.name::TEXT, sh.order_id, o.order_number, p.name::TEXT,
    sh.dispatch_number::TEXT, sh.carrier::TEXT, COALESCE(sh.tracking_number, '')::TEXT,
    sh.shipped_on, sh.estimated_arrival, sh.package_count, sh.pallet_count,
    (CASE WHEN o.status = 'received' THEN 'delivered' ELSE sh.status END)::TEXT,
    COALESCE(sh.notes, '')::TEXT, COALESCE(sh.document_name, '')::TEXT,
    sh.document_path IS NOT NULL, sh.created_at, sh.updated_at
  FROM public.supermarket_supplier_shipments sh
  JOIN public.supermarket_suppliers s ON s.id = sh.supplier_id AND s.company_id = sh.company_id
  JOIN public.supermarket_purchase_orders o ON o.id = sh.order_id AND o.company_id = sh.company_id
  JOIN public.supermarket_purchase_order_lines l ON l.order_id = o.id AND l.company_id = o.company_id
  JOIN public.products p ON p.id = l.product_id AND p.company_id = l.company_id
  WHERE sh.company_id = p_company_id AND sh.branch_id = p_branch_id
    AND (p_supplier_id IS NULL OR sh.supplier_id = p_supplier_id)
  ORDER BY sh.estimated_arrival ASC, sh.created_at DESC
  LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_supplier_upsert_shipment(
  p_token_hash TEXT, p_order_id UUID, p_idempotency_key TEXT,
  p_dispatch_number TEXT, p_carrier TEXT, p_tracking_number TEXT,
  p_shipped_on DATE, p_estimated_arrival DATE,
  p_package_count INTEGER, p_pallet_count INTEGER, p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_access public.supermarket_supplier_portal_access%ROWTYPE;
  v_existing public.supermarket_supplier_shipments%ROWTYPE;
  v_shipment_id UUID;
BEGIN
  UPDATE public.supermarket_supplier_portal_access SET last_used_at = timezone('utc'::text, now())
  WHERE token_hash = lower(p_token_hash) AND active
    AND expires_at > timezone('utc'::text, now())
  RETURNING * INTO v_access;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_SUPPLIER_PORTAL_TOKEN'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    OR NULLIF(trim(p_dispatch_number), '') IS NULL OR NULLIF(trim(p_carrier), '') IS NULL
    OR length(trim(p_dispatch_number)) > 80 OR length(trim(p_carrier)) > 120
    OR length(COALESCE(trim(p_tracking_number), '')) > 120
    OR p_shipped_on IS NULL OR p_estimated_arrival IS NULL
    OR p_estimated_arrival < p_shipped_on OR p_shipped_on < CURRENT_DATE - 7
    OR p_package_count < 0 OR p_package_count > 100000
    OR p_pallet_count < 0 OR p_pallet_count > 10000 THEN
    RAISE EXCEPTION 'INVALID_SUPPLIER_SHIPMENT';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_access.company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_supplier_shipments
  WHERE company_id = v_access.company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('shipmentId', v_existing.id, 'status', v_existing.status, 'duplicate', true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supermarket_purchase_orders o
    JOIN public.supermarket_suppliers s ON s.id = v_access.supplier_id AND s.company_id = o.company_id
    WHERE o.id = p_order_id AND o.company_id = v_access.company_id AND o.branch_id = v_access.branch_id
      AND o.status = 'ordered' AND lower(trim(o.supplier_name)) = lower(trim(s.name))
  ) THEN RAISE EXCEPTION 'SUPPLIER_ORDER_NOT_FOUND'; END IF;

  INSERT INTO public.supermarket_supplier_shipments(
    company_id, branch_id, supplier_id, order_id, access_id, idempotency_key,
    dispatch_number, carrier, tracking_number, shipped_on, estimated_arrival,
    package_count, pallet_count, status, notes
  ) VALUES (
    v_access.company_id, v_access.branch_id, v_access.supplier_id, p_order_id, v_access.id,
    p_idempotency_key, trim(p_dispatch_number), trim(p_carrier), NULLIF(trim(p_tracking_number), ''),
    p_shipped_on, p_estimated_arrival, p_package_count, p_pallet_count, 'announced',
    NULLIF(trim(p_notes), '')
  )
  ON CONFLICT (company_id, order_id) DO UPDATE SET access_id = EXCLUDED.access_id,
    idempotency_key = EXCLUDED.idempotency_key, dispatch_number = EXCLUDED.dispatch_number,
    carrier = EXCLUDED.carrier, tracking_number = EXCLUDED.tracking_number,
    shipped_on = EXCLUDED.shipped_on, estimated_arrival = EXCLUDED.estimated_arrival,
    package_count = EXCLUDED.package_count, pallet_count = EXCLUDED.pallet_count,
    status = 'announced', notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_shipment_id;
  RETURN jsonb_build_object('shipmentId', v_shipment_id, 'status', 'announced', 'duplicate', false);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'SUPPLIER_SHIPMENT_ALREADY_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_supplier_shipment_upload_scope(
  p_token_hash TEXT, p_shipment_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_access public.supermarket_supplier_portal_access%ROWTYPE;
  v_shipment public.supermarket_supplier_shipments%ROWTYPE;
BEGIN
  SELECT * INTO v_access FROM public.supermarket_supplier_portal_access
  WHERE token_hash = lower(p_token_hash) AND active
    AND expires_at > timezone('utc'::text, now());
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_SUPPLIER_PORTAL_TOKEN'; END IF;
  SELECT * INTO v_shipment FROM public.supermarket_supplier_shipments
  WHERE id = p_shipment_id AND company_id = v_access.company_id
    AND branch_id = v_access.branch_id AND supplier_id = v_access.supplier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUPPLIER_SHIPMENT_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('companyId', v_shipment.company_id, 'branchId', v_shipment.branch_id,
    'supplierId', v_shipment.supplier_id, 'orderId', v_shipment.order_id,
    'shipmentId', v_shipment.id, 'documentPath', v_shipment.document_path,
    'documentName', COALESCE(v_shipment.document_name, ''));
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_supplier_attach_shipment_document(
  p_token_hash TEXT, p_shipment_id UUID, p_object_path TEXT, p_file_name TEXT,
  p_content_type TEXT, p_file_size BIGINT, p_sha256 TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE v_scope JSONB;
BEGIN
  v_scope := public.supermarket_supplier_shipment_upload_scope(p_token_hash, p_shipment_id);
  IF p_content_type <> 'application/pdf' OR p_file_size < 1 OR p_file_size > 10485760
    OR length(p_sha256) <> 64 OR NULLIF(trim(p_file_name), '') IS NULL
    OR p_object_path NOT LIKE (v_scope->>'companyId') || '/supermarket/supplier-portal/' || (v_scope->>'supplierId') || '/' || (v_scope->>'orderId') || '/%' THEN
    RAISE EXCEPTION 'INVALID_SUPPLIER_SHIPMENT_DOCUMENT';
  END IF;
  UPDATE public.supermarket_supplier_shipments SET document_path = p_object_path,
    document_name = left(trim(p_file_name), 255), document_content_type = p_content_type,
    document_size = p_file_size, document_sha256 = lower(p_sha256),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_shipment_id AND company_id = (v_scope->>'companyId')::UUID;
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
    'notes', COALESCE(c.notes, ''), 'confirmedAt', c.confirmed_at,
    'shipment', CASE WHEN sh.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', sh.id, 'dispatchNumber', sh.dispatch_number, 'carrier', sh.carrier,
      'trackingNumber', COALESCE(sh.tracking_number, ''), 'shippedOn', sh.shipped_on,
      'estimatedArrival', sh.estimated_arrival, 'packageCount', sh.package_count,
      'palletCount', sh.pallet_count,
      'status', CASE WHEN o.status = 'received' THEN 'delivered' ELSE sh.status END,
      'notes', COALESCE(sh.notes, ''), 'documentName', COALESCE(sh.document_name, ''),
      'documentAvailable', sh.document_path IS NOT NULL
    ) END
  ) ORDER BY o.expected_on ASC NULLS LAST, o.order_number DESC), '[]'::JSONB) INTO v_orders
  FROM public.supermarket_purchase_orders o
  JOIN public.supermarket_purchase_order_lines l ON l.order_id = o.id AND l.company_id = o.company_id
  JOIN public.products p ON p.id = l.product_id AND p.company_id = l.company_id
  LEFT JOIN public.supermarket_supplier_delivery_confirmations c
    ON c.order_id = o.id AND c.company_id = o.company_id
  LEFT JOIN public.supermarket_supplier_shipments sh
    ON sh.order_id = o.id AND sh.company_id = o.company_id
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

REVOKE ALL ON FUNCTION public.supermarket_list_supplier_shipments(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_supplier_upsert_shipment(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_supplier_shipment_upload_scope(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_supplier_attach_shipment_document(TEXT, UUID, TEXT, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supermarket_list_supplier_shipments(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_supplier_upsert_shipment(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_supplier_shipment_upload_scope(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_supplier_attach_shipment_document(TEXT, UUID, TEXT, TEXT, TEXT, BIGINT, TEXT) TO service_role;
