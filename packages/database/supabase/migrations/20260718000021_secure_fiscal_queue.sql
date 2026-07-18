-- Secure, persistent fiscal queue linked to sales and gastronomy settlements.

ALTER TABLE public.company_arca_configs
  ADD COLUMN IF NOT EXISTS certificate_secret_ref VARCHAR(160),
  ADD COLUMN IF NOT EXISTS private_key_secret_ref VARCHAR(160),
  ADD COLUMN IF NOT EXISTS authorization_method VARCHAR(20) DEFAULT 'CAE' NOT NULL,
  ADD COLUMN IF NOT EXISTS last_connection_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_connection_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS last_connection_error TEXT;

DROP POLICY IF EXISTS "All arca configs" ON public.company_arca_configs;
REVOKE ALL ON public.company_arca_configs FROM anon, authenticated;
GRANT ALL ON public.company_arca_configs TO service_role;

COMMENT ON COLUMN public.company_arca_configs.certificate_text IS
  'Legacy server-only field. Prefer certificate_secret_ref and an external secret store.';
COMMENT ON COLUMN public.company_arca_configs.private_key_text IS
  'Legacy server-only field. Prefer private_key_secret_ref and an external secret store.';

ALTER TABLE public.invoices ALTER COLUMN cbte_number DROP NOT NULL;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_company_id_punto_venta_invoice_type_cbte_number_key;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS business_type_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES public.gastronomy_settlements(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS requested_by UUID,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
  ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'homologacion' NOT NULL,
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recipient_document_type VARCHAR(10) DEFAULT '99' NOT NULL,
  ADD COLUMN IF NOT EXISTS recipient_document_number VARCHAR(20) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS recipient_vat_condition VARCHAR(50) DEFAULT 'consumidor_final' NOT NULL,
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'PES' NOT NULL,
  ADD COLUMN IF NOT EXISTS currency_rate NUMERIC(14, 6) DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS authorization_method VARCHAR(20) DEFAULT 'CAE' NOT NULL,
  ADD COLUMN IF NOT EXISTS qr_url TEXT,
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

UPDATE public.invoices SET arca_status = CASE arca_status
  WHEN 'pending' THEN 'draft'
  WHEN 'approved' THEN 'authorized'
  WHEN 'error' THEN 'uncertain'
  ELSE arca_status
END;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_arca_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_arca_status_check CHECK (
  arca_status IN ('draft', 'authorizing', 'authorized', 'observed', 'rejected', 'uncertain', 'cancelled')
);
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_environment_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_environment_check
  CHECK (environment IN ('homologacion', 'produccion'));
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_authorization_method_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_authorization_method_check
  CHECK (authorization_method IN ('CAE', 'CAEA'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_authorized_sequence
  ON public.invoices(company_id, punto_venta, invoice_type, cbte_number)
  WHERE cbte_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency
  ON public.invoices(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_active_sale
  ON public.invoices(company_id, sale_id)
  WHERE arca_status <> 'cancelled' AND invoice_type IN ('FA', 'FB', 'FC');
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_queue
  ON public.invoices(company_id, business_type_code, arca_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.billing_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  internal_code VARCHAR(100),
  description VARCHAR(500) NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_code VARCHAR(20) DEFAULT 'unidad' NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  net_amount NUMERIC(14, 2) NOT NULL CHECK (net_amount >= 0),
  vat_rate NUMERIC(5, 2) NOT NULL CHECK (vat_rate >= 0),
  vat_amount NUMERIC(14, 2) NOT NULL CHECK (vat_amount >= 0),
  total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(invoice_id, line_number)
);

CREATE TABLE IF NOT EXISTS public.billing_invoice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('homologacion', 'produccion')),
  operation VARCHAR(40) NOT NULL,
  result_status VARCHAR(20) NOT NULL CHECK (result_status IN ('started', 'authorized', 'observed', 'rejected', 'uncertain', 'failed')),
  correlation_id UUID DEFAULT gen_random_uuid() NOT NULL,
  request_snapshot JSONB,
  response_snapshot JSONB,
  error_codes JSONB,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_items_invoice
  ON public.billing_invoice_items(company_id, invoice_id, line_number);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_attempts_invoice
  ON public.billing_invoice_attempts(company_id, invoice_id, created_at DESC);

ALTER TABLE public.billing_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing invoice items by company" ON public.billing_invoice_items FOR SELECT
  USING (company_id = public.jwt_company_id());
CREATE POLICY "Billing attempts by company" ON public.billing_invoice_attempts FOR SELECT
  USING (company_id = public.jwt_company_id());

CREATE OR REPLACE FUNCTION public.billing_prepare_sale_invoice(
  p_company_id UUID,
  p_user_id UUID,
  p_business_type_code VARCHAR,
  p_sale_id UUID,
  p_settlement_id UUID,
  p_invoice_type VARCHAR,
  p_recipient_name VARCHAR,
  p_recipient_document_type VARCHAR,
  p_recipient_document_number VARCHAR,
  p_recipient_vat_condition VARCHAR,
  p_idempotency_key VARCHAR
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_existing public.invoices%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_config public.company_arca_configs%ROWTYPE;
BEGIN
  IF p_invoice_type NOT IN ('FA', 'FB', 'FC') THEN
    RAISE EXCEPTION 'INVALID_INVOICE_TYPE';
  END IF;
  IF p_invoice_type = 'FA' AND p_recipient_document_type <> 'CUIT' THEN
    RAISE EXCEPTION 'INVOICE_A_REQUIRES_CUIT';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || p_sale_id::text, 0));

  SELECT * INTO v_existing FROM public.invoices
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('invoiceId', v_existing.id, 'status', v_existing.arca_status, 'duplicate', true);
  END IF;

  SELECT * INTO v_sale FROM public.sales
  WHERE id = p_sale_id AND company_id = p_company_id AND status = 'completed'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SALE_NOT_FOUND'; END IF;

  IF p_settlement_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.gastronomy_settlements
    WHERE id = p_settlement_id AND company_id = p_company_id AND sale_id = p_sale_id
  ) THEN
    RAISE EXCEPTION 'SETTLEMENT_SALE_MISMATCH';
  END IF;

  SELECT * INTO v_existing FROM public.invoices
  WHERE company_id = p_company_id AND sale_id = p_sale_id
    AND arca_status <> 'cancelled' AND invoice_type IN ('FA', 'FB', 'FC')
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('invoiceId', v_existing.id, 'status', v_existing.arca_status, 'duplicate', true);
  END IF;

  SELECT * INTO v_config FROM public.company_arca_configs
  WHERE company_id = p_company_id AND is_active = true
  ORDER BY updated_at DESC LIMIT 1;

  INSERT INTO public.invoices(
    company_id, sale_id, invoice_type, punto_venta, cbte_number, arca_status,
    business_type_code, settlement_id, requested_by, idempotency_key, environment,
    recipient_name, recipient_document_type, recipient_document_number,
    recipient_vat_condition, arca_payload
  ) VALUES (
    p_company_id, p_sale_id, p_invoice_type, COALESCE(v_config.point_of_sale, 0), NULL, 'draft',
    p_business_type_code, p_settlement_id, p_user_id, p_idempotency_key,
    COALESCE(v_config.environment, 'homologacion'), NULLIF(trim(p_recipient_name), ''),
    p_recipient_document_type, p_recipient_document_number, p_recipient_vat_condition,
    jsonb_build_object('subtotal', v_sale.subtotal, 'taxAmount', v_sale.tax_amount, 'total', v_sale.total)
  ) RETURNING * INTO v_invoice;

  INSERT INTO public.billing_invoice_items(
    company_id, invoice_id, product_id, line_number, internal_code, description,
    quantity, unit_price, net_amount, vat_rate, vat_amount, total_amount
  )
  SELECT p_company_id, v_invoice.id, si.product_id,
    row_number() OVER (ORDER BY si.created_at, si.id), p.sku, p.name,
    si.quantity, si.unit_price,
    round(si.subtotal / (1 + si.tax_rate / 100), 2), si.tax_rate,
    round(si.subtotal - (si.subtotal / (1 + si.tax_rate / 100)), 2), si.subtotal
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id AND p.company_id = p_company_id
  WHERE si.company_id = p_company_id AND si.sale_id = p_sale_id;

  RETURN jsonb_build_object('invoiceId', v_invoice.id, 'status', v_invoice.arca_status, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_sync_gastronomy_fiscal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.settlement_id IS NOT NULL THEN
    UPDATE public.gastronomy_settlements SET fiscal_status = CASE
      WHEN NEW.arca_status IN ('authorized', 'observed') THEN 'authorized'
      WHEN NEW.arca_status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END
    WHERE id = NEW.settlement_id AND company_id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_gastronomy_fiscal_status ON public.invoices;
CREATE TRIGGER sync_gastronomy_fiscal_status
  AFTER INSERT OR UPDATE OF arca_status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.billing_sync_gastronomy_fiscal_status();

GRANT EXECUTE ON FUNCTION public.billing_prepare_sale_invoice(
  UUID, UUID, VARCHAR, UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) TO service_role;
REVOKE ALL ON FUNCTION public.billing_prepare_sale_invoice(
  UUID, UUID, VARCHAR, UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO service_role;
GRANT SELECT, INSERT ON public.billing_invoice_items TO service_role;
GRANT SELECT, INSERT ON public.billing_invoice_attempts TO service_role;
