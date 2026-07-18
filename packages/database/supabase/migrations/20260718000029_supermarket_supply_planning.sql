-- Supermarket supplier accounts, purchase reconciliation and demand planning.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.supply.read', 'View supermarket supply planning and supplier accounts'),
    ('supermarket.supply.forecast', 'View supermarket demand forecasts'),
    ('supermarket.suppliers.write', 'Create and update supermarket suppliers'),
    ('supermarket.supplier_accounts.write', 'Post supplier invoices, credits and payments')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  lead_days INTEGER DEFAULT 7 NOT NULL CHECK (lead_days BETWEEN 0 AND 365),
  credit_limit NUMERIC(16, 2) DEFAULT 0 NOT NULL CHECK (credit_limit >= 0),
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supermarket_suppliers_name
  ON public.supermarket_suppliers(company_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_supermarket_suppliers_tax_id
  ON public.supermarket_suppliers(company_id, tax_id)
  WHERE tax_id IS NOT NULL AND tax_id <> '';

CREATE TABLE IF NOT EXISTS public.supermarket_supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  supplier_id UUID REFERENCES public.supermarket_suppliers(id) ON DELETE RESTRICT NOT NULL,
  purchase_order_id UUID REFERENCES public.supermarket_purchase_orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice', 'credit_note', 'payment')),
  document_number VARCHAR(80) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC(16, 2) NOT NULL CHECK (amount > 0),
  expected_amount NUMERIC(16, 2),
  difference NUMERIC(16, 2),
  reconciliation_status VARCHAR(20) DEFAULT 'unmatched' NOT NULL
    CHECK (reconciliation_status IN ('matched', 'variance', 'unmatched')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, idempotency_key),
  UNIQUE(company_id, supplier_id, document_type, document_number)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_suppliers_company
  ON public.supermarket_suppliers(company_id, active, name);
CREATE INDEX IF NOT EXISTS idx_supermarket_supplier_documents_account
  ON public.supermarket_supplier_documents(company_id, supplier_id, issue_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_supplier_documents_due
  ON public.supermarket_supplier_documents(company_id, branch_id, due_date)
  WHERE document_type = 'invoice';

ALTER TABLE public.supermarket_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_supplier_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Supermarket suppliers by company" ON public.supermarket_suppliers;
CREATE POLICY "Supermarket suppliers by company" ON public.supermarket_suppliers FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
DROP POLICY IF EXISTS "Supermarket supplier documents by company" ON public.supermarket_supplier_documents;
CREATE POLICY "Supermarket supplier documents by company" ON public.supermarket_supplier_documents FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

INSERT INTO public.supermarket_suppliers(company_id, name, lead_days, active)
SELECT DISTINCT sp.company_id, trim(sp.supplier_name), 7, true
FROM public.supermarket_products sp
WHERE NULLIF(trim(sp.supplier_name), '') IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.supermarket_list_suppliers(
  p_company_id UUID,
  p_branch_id UUID
) RETURNS TABLE(
  id UUID, name TEXT, tax_id TEXT, phone TEXT, email TEXT, address TEXT,
  lead_days INTEGER, credit_limit NUMERIC, balance NUMERIC, overdue_amount NUMERIC,
  open_documents BIGINT, active BOOLEAN, created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT s.id, s.name::TEXT, COALESCE(s.tax_id, '')::TEXT, COALESCE(s.phone, '')::TEXT,
    COALESCE(s.email, '')::TEXT, COALESCE(s.address, '')::TEXT, s.lead_days, s.credit_limit,
    GREATEST(COALESCE(SUM(CASE WHEN d.document_type = 'invoice' THEN d.amount ELSE -d.amount END), 0), 0) AS balance,
    LEAST(
      COALESCE(SUM(CASE WHEN d.document_type = 'invoice' AND d.due_date < CURRENT_DATE THEN d.amount ELSE 0 END), 0),
      GREATEST(COALESCE(SUM(CASE WHEN d.document_type = 'invoice' THEN d.amount ELSE -d.amount END), 0), 0)
    ) AS overdue_amount,
    COUNT(d.id) FILTER (WHERE d.document_type = 'invoice') AS open_documents,
    s.active, s.created_at
  FROM public.supermarket_suppliers s
  LEFT JOIN public.supermarket_supplier_documents d
    ON d.company_id = s.company_id AND d.supplier_id = s.id
  WHERE s.company_id = p_company_id
  GROUP BY s.id
  ORDER BY s.active DESC, s.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_save_supplier(
  p_company_id UUID,
  p_branch_id UUID,
  p_supplier_id UUID,
  p_name TEXT,
  p_tax_id TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_lead_days INTEGER,
  p_credit_limit NUMERIC,
  p_active BOOLEAN
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_supplier_id UUID := p_supplier_id;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF NULLIF(trim(p_name), '') IS NULL OR p_lead_days < 0 OR p_lead_days > 365 OR p_credit_limit < 0 THEN
    RAISE EXCEPTION 'INVALID_SUPPLIER';
  END IF;
  IF v_supplier_id IS NULL THEN
    INSERT INTO public.supermarket_suppliers(
      company_id, name, tax_id, phone, email, address, lead_days, credit_limit, active
    ) VALUES (
      p_company_id, trim(p_name), NULLIF(trim(p_tax_id), ''), NULLIF(trim(p_phone), ''),
      NULLIF(trim(p_email), ''), NULLIF(trim(p_address), ''), p_lead_days, p_credit_limit, p_active
    ) RETURNING id INTO v_supplier_id;
  ELSE
    UPDATE public.supermarket_suppliers SET name = trim(p_name), tax_id = NULLIF(trim(p_tax_id), ''),
      phone = NULLIF(trim(p_phone), ''), email = NULLIF(trim(p_email), ''),
      address = NULLIF(trim(p_address), ''), lead_days = p_lead_days,
      credit_limit = p_credit_limit, active = p_active,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_supplier_id AND company_id = p_company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'SUPPLIER_NOT_FOUND'; END IF;
  END IF;
  RETURN v_supplier_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'SUPPLIER_ALREADY_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_supplier_documents(
  p_company_id UUID,
  p_branch_id UUID,
  p_supplier_id UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID, supplier_id UUID, supplier_name TEXT, purchase_order_id UUID,
  purchase_order_number BIGINT, document_type TEXT, document_number TEXT,
  issue_date DATE, due_date DATE, amount NUMERIC, signed_amount NUMERIC,
  expected_amount NUMERIC, difference NUMERIC, reconciliation_status TEXT,
  notes TEXT, created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT d.id, d.supplier_id, s.name::TEXT, d.purchase_order_id, o.order_number,
    d.document_type::TEXT, d.document_number::TEXT, d.issue_date, d.due_date, d.amount,
    CASE WHEN d.document_type = 'invoice' THEN d.amount ELSE -d.amount END,
    d.expected_amount, d.difference, d.reconciliation_status::TEXT,
    COALESCE(d.notes, '')::TEXT, d.created_at
  FROM public.supermarket_supplier_documents d
  JOIN public.supermarket_suppliers s ON s.id = d.supplier_id AND s.company_id = d.company_id
  LEFT JOIN public.supermarket_purchase_orders o ON o.id = d.purchase_order_id AND o.company_id = d.company_id
  WHERE d.company_id = p_company_id AND d.branch_id = p_branch_id
    AND (p_supplier_id IS NULL OR d.supplier_id = p_supplier_id)
  ORDER BY d.issue_date DESC, d.created_at DESC LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_post_supplier_document(
  p_company_id UUID,
  p_branch_id UUID,
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_supplier_id UUID,
  p_purchase_order_id UUID,
  p_document_type TEXT,
  p_document_number TEXT,
  p_issue_date DATE,
  p_due_date DATE,
  p_amount NUMERIC,
  p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing public.supermarket_supplier_documents%ROWTYPE;
  v_expected NUMERIC(16, 2);
  v_difference NUMERIC(16, 2);
  v_status TEXT := 'unmatched';
  v_document_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    OR p_document_type NOT IN ('invoice', 'credit_note', 'payment') OR p_amount <= 0
    OR NULLIF(trim(p_document_number), '') IS NULL OR p_issue_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_SUPPLIER_DOCUMENT';
  END IF;
  IF p_due_date IS NOT NULL AND p_due_date < p_issue_date THEN
    RAISE EXCEPTION 'INVALID_SUPPLIER_DOCUMENT';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supermarket_suppliers s
    WHERE s.id = p_supplier_id AND s.company_id = p_company_id AND s.active
  ) THEN RAISE EXCEPTION 'SUPPLIER_NOT_FOUND'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_supplier_documents
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('documentId', v_existing.id, 'duplicate', true,
      'reconciliationStatus', v_existing.reconciliation_status, 'difference', v_existing.difference);
  END IF;
  IF p_purchase_order_id IS NOT NULL THEN
    SELECT ROUND(SUM(l.quantity * l.unit_cost), 2) INTO v_expected
    FROM public.supermarket_purchase_orders o
    JOIN public.supermarket_purchase_order_lines l ON l.order_id = o.id AND l.company_id = o.company_id
    JOIN public.supermarket_suppliers s ON s.id = p_supplier_id AND s.company_id = o.company_id
    WHERE o.id = p_purchase_order_id AND o.company_id = p_company_id AND o.branch_id = p_branch_id
      AND lower(trim(o.supplier_name)) = lower(trim(s.name));
    IF v_expected IS NULL THEN RAISE EXCEPTION 'PURCHASE_ORDER_NOT_FOUND'; END IF;
    v_difference := ROUND(p_amount - v_expected, 2);
    v_status := CASE WHEN abs(v_difference) <= 0.01 THEN 'matched' ELSE 'variance' END;
  END IF;
  IF p_document_type <> 'invoice' AND p_purchase_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_DOCUMENT_RECONCILIATION';
  END IF;
  INSERT INTO public.supermarket_supplier_documents(
    company_id, branch_id, supplier_id, purchase_order_id, user_id, idempotency_key,
    document_type, document_number, issue_date, due_date, amount,
    expected_amount, difference, reconciliation_status, notes
  ) VALUES (
    p_company_id, p_branch_id, p_supplier_id, p_purchase_order_id, p_user_id, p_idempotency_key,
    p_document_type, trim(p_document_number), p_issue_date,
    CASE WHEN p_document_type = 'invoice' THEN p_due_date ELSE NULL END,
    p_amount, v_expected, v_difference, v_status, NULLIF(trim(p_notes), '')
  ) RETURNING id INTO v_document_id;
  RETURN jsonb_build_object('documentId', v_document_id, 'duplicate', false,
    'reconciliationStatus', v_status, 'difference', v_difference);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'SUPPLIER_DOCUMENT_ALREADY_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_supply_forecast(
  p_company_id UUID,
  p_branch_id UUID,
  p_lookback_days INTEGER DEFAULT 30,
  p_safety_days INTEGER DEFAULT 5
) RETURNS TABLE(
  product_id UUID, name TEXT, category TEXT, supplier_name TEXT,
  stock NUMERIC, min_stock NUMERIC, units_sold NUMERIC, average_daily_sales NUMERIC,
  incoming_quantity NUMERIC, lead_days INTEGER, days_cover NUMERIC,
  suggested_quantity NUMERIC, turnover_index NUMERIC, risk TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_lookback_days < 7 OR p_lookback_days > 365 OR p_safety_days < 0 OR p_safety_days > 60 THEN
    RAISE EXCEPTION 'INVALID_FORECAST_PARAMETERS';
  END IF;
  RETURN QUERY
  WITH sales_velocity AS (
    SELECT si.product_id, COALESCE(SUM(si.quantity), 0) AS sold
    FROM public.supermarket_sale_requests r
    JOIN public.sale_items si ON si.sale_id = r.sale_id AND si.company_id = r.company_id
    WHERE r.company_id = p_company_id AND r.branch_id = p_branch_id
      AND r.created_at >= timezone('utc'::text, now()) - make_interval(days => p_lookback_days)
    GROUP BY si.product_id
  ), incoming AS (
    SELECT l.product_id, COALESCE(SUM(l.quantity), 0) AS quantity
    FROM public.supermarket_purchase_orders o
    JOIN public.supermarket_purchase_order_lines l ON l.order_id = o.id AND l.company_id = o.company_id
    WHERE o.company_id = p_company_id AND o.branch_id = p_branch_id AND o.status = 'ordered'
    GROUP BY l.product_id
  ), base AS (
    SELECT p.id, p.name, sp.category, COALESCE(sp.supplier_name, '') AS supplier_name,
      COALESCE(st.quantity, 0) AS stock, COALESCE(st.min_stock, 0) AS min_stock,
      COALESCE(v.sold, 0) AS units_sold, COALESCE(v.sold, 0) / p_lookback_days::NUMERIC AS avg_daily,
      COALESCE(i.quantity, 0) AS incoming_quantity, COALESCE(sup.lead_days, 7) AS lead_days
    FROM public.supermarket_products sp
    JOIN public.products p ON p.id = sp.product_id AND p.company_id = sp.company_id
    LEFT JOIN public.stock st ON st.company_id = p_company_id AND st.branch_id = p_branch_id AND st.product_id = p.id
    LEFT JOIN sales_velocity v ON v.product_id = p.id
    LEFT JOIN incoming i ON i.product_id = p.id
    LEFT JOIN public.supermarket_suppliers sup ON sup.company_id = p_company_id
      AND lower(trim(sup.name)) = lower(trim(COALESCE(sp.supplier_name, ''))) AND sup.active
    WHERE sp.company_id = p_company_id AND sp.active
  )
  SELECT b.id, b.name::TEXT, b.category::TEXT, b.supplier_name::TEXT,
    b.stock, b.min_stock, ROUND(b.units_sold, 3), ROUND(b.avg_daily, 4),
    b.incoming_quantity, b.lead_days,
    CASE WHEN b.avg_daily > 0 THEN ROUND(b.stock / b.avg_daily, 1) ELSE 9999 END,
    GREATEST(0, CEIL(b.avg_daily * (b.lead_days + p_safety_days) - b.stock - b.incoming_quantity)),
    CASE WHEN b.stock > 0 THEN ROUND(b.units_sold / b.stock, 2) ELSE b.units_sold END,
    CASE
      WHEN b.avg_daily > 0 AND b.stock <= 0 THEN 'out_of_stock'
      WHEN b.avg_daily > 0 AND b.stock / b.avg_daily <= b.lead_days THEN 'critical'
      WHEN b.stock <= b.min_stock OR (b.avg_daily > 0 AND b.stock / b.avg_daily <= b.lead_days + p_safety_days) THEN 'attention'
      ELSE 'healthy'
    END::TEXT
  FROM base b
  ORDER BY CASE
    WHEN b.avg_daily > 0 AND b.stock <= 0 THEN 1
    WHEN b.avg_daily > 0 AND b.stock / b.avg_daily <= b.lead_days THEN 2
    WHEN b.stock <= b.min_stock THEN 3 ELSE 4 END,
    b.units_sold DESC, b.name;
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_list_suppliers(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_save_supplier(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_list_supplier_documents(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_post_supplier_document(UUID, UUID, UUID, TEXT, UUID, UUID, TEXT, TEXT, DATE, DATE, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_supply_forecast(UUID, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supermarket_list_suppliers(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_save_supplier(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_supplier_documents(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_post_supplier_document(UUID, UUID, UUID, TEXT, UUID, UUID, TEXT, TEXT, DATE, DATE, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_supply_forecast(UUID, UUID, INTEGER, INTEGER) TO service_role;
