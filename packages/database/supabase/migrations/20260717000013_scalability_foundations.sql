-- Distributed API controls and keyset access paths for horizontal scaling.

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_company_sku_unique
  ON public.products(company_id, sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX IF NOT EXISTS idx_products_company_created
  ON public.products(company_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_stock_company_product
  ON public.stock(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_created
  ON public.sales(company_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.public_api_rate_limits (
  key_hash VARCHAR(64) PRIMARY KEY,
  window_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.public_api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_public_api_rate_limit(
  p_key_hash VARCHAR,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := clock_timestamp();
  v_window INTERVAL := make_interval(secs => p_window_seconds);
  v_row public.public_api_rate_limits%ROWTYPE;
BEGIN
  IF p_key_hash !~ '^[0-9a-f]{64}$' OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'INVALID_RATE_LIMIT_INPUT';
  END IF;

  INSERT INTO public.public_api_rate_limits(key_hash, window_started_at, request_count, updated_at)
  VALUES (p_key_hash, v_now, 1, v_now)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN public.public_api_rate_limits.window_started_at + v_window <= v_now THEN v_now
      ELSE public.public_api_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN public.public_api_rate_limits.window_started_at + v_window <= v_now THEN 1
      ELSE public.public_api_rate_limits.request_count + 1
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  RETURN QUERY SELECT
    v_row.request_count <= p_limit,
    GREATEST(p_limit - v_row.request_count, 0),
    v_row.window_started_at + v_window;
END;
$$;

CREATE TABLE IF NOT EXISTS public.public_api_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(30) DEFAULT 'queued' NOT NULL,
  attempts INTEGER DEFAULT 0 NOT NULL CHECK (attempts >= 0),
  available_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, event_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_public_api_events_queue
  ON public.public_api_events(status, available_at, created_at)
  WHERE status IN ('queued', 'retry');
CREATE INDEX IF NOT EXISTS idx_public_api_events_company_created
  ON public.public_api_events(company_id, created_at DESC);

ALTER TABLE public.public_api_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read company public API events" ON public.public_api_events
  FOR SELECT USING (company_id = public.jwt_company_id());

CREATE OR REPLACE FUNCTION public.public_api_create_product(
  p_company_id UUID,
  p_name TEXT,
  p_sku TEXT,
  p_price NUMERIC,
  p_stock NUMERIC
)
RETURNS TABLE(id UUID, company_id UUID, name TEXT, sku TEXT, price NUMERIC, stock NUMERIC, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_branch_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = p_company_id) THEN
    RAISE EXCEPTION 'COMPANY_NOT_FOUND';
  END IF;

  INSERT INTO public.products(company_id, name, sku, price)
  VALUES (p_company_id, p_name, p_sku, p_price)
  RETURNING * INTO v_product;

  SELECT b.id INTO v_branch_id
  FROM public.branches b
  WHERE b.company_id = p_company_id
  ORDER BY b.is_main DESC, b.created_at ASC
  LIMIT 1;

  IF p_stock > 0 AND v_branch_id IS NULL THEN
    RAISE EXCEPTION 'DEFAULT_BRANCH_REQUIRED';
  END IF;

  IF v_branch_id IS NOT NULL THEN
    INSERT INTO public.stock(company_id, branch_id, product_id, quantity)
    VALUES (p_company_id, v_branch_id, v_product.id, p_stock);
  END IF;

  RETURN QUERY SELECT
    v_product.id,
    v_product.company_id,
    v_product.name::TEXT,
    v_product.sku::TEXT,
    v_product.price,
    p_stock,
    v_product.created_at;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SKU_ALREADY_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.public_api_list_products(
  p_company_id UUID,
  p_limit INTEGER,
  p_cursor_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE(id UUID, company_id UUID, name TEXT, sku TEXT, price NUMERIC, stock NUMERIC, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.company_id,
    p.name::TEXT,
    p.sku::TEXT,
    p.price,
    COALESCE(SUM(s.quantity), 0)::NUMERIC AS stock,
    p.created_at
  FROM public.products p
  LEFT JOIN public.stock s ON s.company_id = p.company_id AND s.product_id = p.id
  WHERE p.company_id = p_company_id
    AND (
      p_cursor_created_at IS NULL
      OR (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id)
    )
  GROUP BY p.id
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 101);
$$;

CREATE OR REPLACE FUNCTION public.public_api_find_product_by_sku(p_company_id UUID, p_sku TEXT)
RETURNS TABLE(id UUID, company_id UUID, name TEXT, sku TEXT, price NUMERIC, stock NUMERIC, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.company_id,
    p.name::TEXT,
    p.sku::TEXT,
    p.price,
    COALESCE(SUM(s.quantity), 0)::NUMERIC AS stock,
    p.created_at
  FROM public.products p
  LEFT JOIN public.stock s ON s.company_id = p.company_id AND s.product_id = p.id
  WHERE p.company_id = p_company_id AND p.sku = p_sku
  GROUP BY p.id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_api_enqueue_event(
  p_company_id UUID,
  p_event_type TEXT,
  p_idempotency_key TEXT,
  p_payload JSONB
)
RETURNS TABLE(id UUID, status TEXT, duplicate BOOLEAN, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.public_api_events%ROWTYPE;
  v_duplicate BOOLEAN := false;
BEGIN
  INSERT INTO public.public_api_events(company_id, event_type, idempotency_key, payload)
  VALUES (p_company_id, p_event_type, p_idempotency_key, p_payload)
  ON CONFLICT (company_id, event_type, idempotency_key) DO NOTHING
  RETURNING * INTO v_event;

  IF v_event.id IS NULL THEN
    v_duplicate := true;
    SELECT * INTO v_event
    FROM public.public_api_events e
    WHERE e.company_id = p_company_id
      AND e.event_type = p_event_type
      AND e.idempotency_key = p_idempotency_key;
  END IF;

  RETURN QUERY SELECT v_event.id, v_event.status::TEXT, v_duplicate, v_event.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_public_api_rate_limit(VARCHAR, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_api_create_product(UUID, TEXT, TEXT, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_api_list_products(UUID, INTEGER, TIMESTAMP WITH TIME ZONE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_api_find_product_by_sku(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_api_enqueue_event(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.consume_public_api_rate_limit(VARCHAR, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.public_api_create_product(UUID, TEXT, TEXT, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.public_api_list_products(UUID, INTEGER, TIMESTAMP WITH TIME ZONE, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.public_api_find_product_by_sku(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.public_api_enqueue_event(UUID, TEXT, TEXT, JSONB) TO service_role;

-- Tenant identity must come from server-managed app_metadata, never user_metadata.
CREATE OR REPLACE FUNCTION public.jwt_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'company_id',
    ''
  )::UUID;
$$;

-- Global catalogs are readable by tenants but writable only through service_role.
DROP POLICY IF EXISTS "Write business types" ON public.business_types;
DROP POLICY IF EXISTS "Write business type modules" ON public.business_type_modules;
DROP POLICY IF EXISTS "Write business presets" ON public.business_type_presets;
DROP POLICY IF EXISTS "Write schema versions" ON public.module_schema_versions;

-- Tenant-originated telemetry must carry the tenant from the trusted JWT.
DROP POLICY IF EXISTS "Company create errors" ON public.system_error_logs;
CREATE POLICY "Company create errors" ON public.system_error_logs
  FOR INSERT WITH CHECK (company_id = public.jwt_company_id());

DROP POLICY IF EXISTS "Insert webhook logs" ON public.webhook_delivery_logs;
CREATE POLICY "Insert webhook logs" ON public.webhook_delivery_logs
  FOR INSERT WITH CHECK (company_id = public.jwt_company_id());

DROP POLICY IF EXISTS "Insert usage metrics" ON public.company_usage_metrics;
CREATE POLICY "Insert usage metrics" ON public.company_usage_metrics
  FOR INSERT WITH CHECK (company_id = public.jwt_company_id());

-- SECURITY DEFINER onboarding is an administrative operation.
REVOKE ALL ON FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) TO service_role;

ALTER FUNCTION public.audit_trigger_func() SET search_path = public, pg_catalog;
ALTER FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) SET search_path = public, pg_catalog;
