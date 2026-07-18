-- Supermarket shelf layout, product placement and auditable price label jobs.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.layout.read', 'View supermarket store locations and product placement'),
    ('supermarket.layout.write', 'Manage supermarket store locations and product placement'),
    ('supermarket.labels.create', 'Create supermarket shelf label jobs'),
    ('supermarket.labels.print', 'Mark supermarket shelf label jobs as printed')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_store_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(40) NOT NULL,
  zone VARCHAR(80) NOT NULL,
  aisle VARCHAR(40),
  shelf VARCHAR(40),
  bin VARCHAR(40),
  description VARCHAR(200),
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, branch_id, code)
);

CREATE TABLE IF NOT EXISTS public.supermarket_product_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.supermarket_store_locations(id) ON DELETE RESTRICT NOT NULL,
  facing_count INTEGER DEFAULT 1 NOT NULL CHECK (facing_count >= 0),
  capacity NUMERIC(14, 3) DEFAULT 0 NOT NULL CHECK (capacity >= 0),
  reorder_point NUMERIC(14, 3) DEFAULT 0 NOT NULL CHECK (reorder_point >= 0),
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, branch_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.supermarket_label_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  label_size VARCHAR(20) NOT NULL CHECK (label_size IN ('shelf_60x30', 'promo_80x40')),
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'printed')),
  item_count INTEGER DEFAULT 0 NOT NULL CHECK (item_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  printed_at TIMESTAMP WITH TIME ZONE,
  printed_by UUID,
  UNIQUE(company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.supermarket_label_job_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.supermarket_label_jobs(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100) NOT NULL,
  price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
  promo VARCHAR(20) NOT NULL,
  location_code VARCHAR(40),
  copies INTEGER DEFAULT 1 NOT NULL CHECK (copies BETWEEN 1 AND 100),
  UNIQUE(job_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_locations_branch
  ON public.supermarket_store_locations(company_id, branch_id, active, code);
CREATE INDEX IF NOT EXISTS idx_supermarket_placements_location
  ON public.supermarket_product_locations(company_id, branch_id, location_id);
CREATE INDEX IF NOT EXISTS idx_supermarket_label_jobs_branch
  ON public.supermarket_label_jobs(company_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_label_lines_job
  ON public.supermarket_label_job_lines(company_id, job_id);

ALTER TABLE public.supermarket_store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_product_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_label_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_label_job_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supermarket store locations by company" ON public.supermarket_store_locations FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
CREATE POLICY "Supermarket product locations by company" ON public.supermarket_product_locations FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
CREATE POLICY "Supermarket label jobs by company" ON public.supermarket_label_jobs FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
CREATE POLICY "Supermarket label lines by company" ON public.supermarket_label_job_lines FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

CREATE OR REPLACE FUNCTION public.supermarket_list_locations(p_company_id UUID, p_branch_id UUID)
RETURNS TABLE(
  id UUID, code TEXT, zone TEXT, aisle TEXT, shelf TEXT, bin TEXT,
  description TEXT, active BOOLEAN, assigned_products BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT l.id, l.code::TEXT, l.zone::TEXT, COALESCE(l.aisle, '')::TEXT,
    COALESCE(l.shelf, '')::TEXT, COALESCE(l.bin, '')::TEXT,
    COALESCE(l.description, '')::TEXT, l.active, COUNT(pl.id)
  FROM public.supermarket_store_locations l
  LEFT JOIN public.supermarket_product_locations pl
    ON pl.company_id = l.company_id AND pl.branch_id = l.branch_id AND pl.location_id = l.id
  WHERE l.company_id = p_company_id AND l.branch_id = p_branch_id
  GROUP BY l.id
  ORDER BY l.active DESC, l.zone, l.code;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_save_location(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_location_id UUID,
  p_code TEXT, p_zone TEXT, p_aisle TEXT, p_shelf TEXT, p_bin TEXT,
  p_description TEXT, p_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_id UUID := p_location_id;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF trim(COALESCE(p_code, '')) = '' OR length(trim(p_code)) > 40
    OR trim(COALESCE(p_zone, '')) = '' OR length(trim(p_zone)) > 80
    OR length(COALESCE(p_aisle, '')) > 40 OR length(COALESCE(p_shelf, '')) > 40
    OR length(COALESCE(p_bin, '')) > 40 OR length(COALESCE(p_description, '')) > 200 THEN
    RAISE EXCEPTION 'INVALID_STORE_LOCATION';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.supermarket_store_locations(
      company_id, branch_id, code, zone, aisle, shelf, bin, description, active
    ) VALUES (
      p_company_id, p_branch_id, upper(trim(p_code)), trim(p_zone), NULLIF(trim(p_aisle), ''),
      NULLIF(trim(p_shelf), ''), NULLIF(trim(p_bin), ''), NULLIF(trim(p_description), ''), p_active
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.supermarket_store_locations SET
      code = upper(trim(p_code)), zone = trim(p_zone), aisle = NULLIF(trim(p_aisle), ''),
      shelf = NULLIF(trim(p_shelf), ''), bin = NULLIF(trim(p_bin), ''),
      description = NULLIF(trim(p_description), ''), active = p_active,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_id AND company_id = p_company_id AND branch_id = p_branch_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'STORE_LOCATION_NOT_FOUND'; END IF;
  END IF;
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'STORE_LOCATION_CODE_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_placements(p_company_id UUID, p_branch_id UUID)
RETURNS TABLE(
  id UUID, product_id UUID, product_name TEXT, barcode TEXT, location_id UUID,
  location_code TEXT, zone TEXT, facing_count INTEGER, capacity NUMERIC,
  reorder_point NUMERIC, stock NUMERIC, needs_restock BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT pl.id, pl.product_id, p.name::TEXT, COALESCE(p.barcode, '')::TEXT,
    pl.location_id, l.code::TEXT, l.zone::TEXT, pl.facing_count, pl.capacity,
    pl.reorder_point, COALESCE(s.quantity, 0), COALESCE(s.quantity, 0) <= pl.reorder_point
  FROM public.supermarket_product_locations pl
  JOIN public.supermarket_store_locations l
    ON l.id = pl.location_id AND l.company_id = pl.company_id AND l.branch_id = pl.branch_id
  JOIN public.products p ON p.id = pl.product_id AND p.company_id = pl.company_id
  LEFT JOIN public.stock s
    ON s.company_id = pl.company_id AND s.branch_id = pl.branch_id AND s.product_id = pl.product_id
  WHERE pl.company_id = p_company_id AND pl.branch_id = p_branch_id
  ORDER BY l.zone, l.code, p.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_save_placement(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_product_id UUID,
  p_location_id UUID, p_facing_count INTEGER, p_capacity NUMERIC, p_reorder_point NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_facing_count < 0 OR p_capacity < 0 OR p_reorder_point < 0 OR p_reorder_point > p_capacity THEN
    RAISE EXCEPTION 'INVALID_PRODUCT_PLACEMENT';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supermarket_products sp
    WHERE sp.company_id = p_company_id AND sp.product_id = p_product_id
  ) THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supermarket_store_locations l
    WHERE l.id = p_location_id AND l.company_id = p_company_id
      AND l.branch_id = p_branch_id AND l.active
  ) THEN RAISE EXCEPTION 'STORE_LOCATION_NOT_FOUND'; END IF;
  INSERT INTO public.supermarket_product_locations(
    company_id, branch_id, product_id, location_id, facing_count, capacity, reorder_point, updated_by
  ) VALUES (
    p_company_id, p_branch_id, p_product_id, p_location_id,
    p_facing_count, p_capacity, p_reorder_point, p_user_id
  ) ON CONFLICT (company_id, branch_id, product_id) DO UPDATE SET
    location_id = EXCLUDED.location_id, facing_count = EXCLUDED.facing_count,
    capacity = EXCLUDED.capacity, reorder_point = EXCLUDED.reorder_point,
    updated_by = EXCLUDED.updated_by, updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_label_jobs(p_company_id UUID, p_branch_id UUID)
RETURNS TABLE(
  job_id UUID, label_size TEXT, status TEXT, item_count INTEGER, created_at TIMESTAMP WITH TIME ZONE,
  printed_at TIMESTAMP WITH TIME ZONE, line_id UUID, product_id UUID, product_name TEXT,
  barcode TEXT, price NUMERIC, promo TEXT, location_code TEXT, copies INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT j.id, j.label_size::TEXT, j.status::TEXT, j.item_count, j.created_at, j.printed_at,
    l.id, l.product_id, l.product_name::TEXT, l.barcode::TEXT, l.price,
    l.promo::TEXT, COALESCE(l.location_code, '')::TEXT, l.copies
  FROM public.supermarket_label_jobs j
  JOIN public.supermarket_label_job_lines l ON l.job_id = j.id AND l.company_id = j.company_id
  WHERE j.company_id = p_company_id AND j.branch_id = p_branch_id
  ORDER BY j.created_at DESC, l.product_name
  LIMIT 2000;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_create_label_job(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_idempotency_key TEXT,
  p_label_size TEXT, p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing public.supermarket_label_jobs%ROWTYPE;
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_supermarket public.supermarket_products%ROWTYPE;
  v_product_id UUID;
  v_copies INTEGER;
  v_location_code TEXT;
  v_job_id UUID;
  v_item_count INTEGER := 0;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    OR p_label_size NOT IN ('shelf_60x30', 'promo_80x40')
    OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1
    OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION 'INVALID_LABEL_JOB';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) item
    GROUP BY item->>'productId' HAVING COUNT(*) > 1
  ) THEN RAISE EXCEPTION 'DUPLICATE_LABEL_ITEM'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_label_jobs
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('labelJobId', v_existing.id, 'itemCount', v_existing.item_count, 'duplicate', true);
  END IF;
  INSERT INTO public.supermarket_label_jobs(company_id, branch_id, user_id, idempotency_key, label_size)
  VALUES (p_company_id, p_branch_id, p_user_id, p_idempotency_key, p_label_size)
  RETURNING id INTO v_job_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'productId')::UUID;
      v_copies := COALESCE((v_item->>'copies')::INTEGER, 1);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'INVALID_LABEL_ITEM'; END;
    IF v_copies < 1 OR v_copies > 100 THEN RAISE EXCEPTION 'INVALID_LABEL_ITEM'; END IF;
    SELECT * INTO v_product FROM public.products
    WHERE id = v_product_id AND company_id = p_company_id;
    SELECT * INTO v_supermarket FROM public.supermarket_products
    WHERE product_id = v_product_id AND company_id = p_company_id;
    IF v_product.id IS NULL OR v_supermarket.product_id IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
    SELECT l.code INTO v_location_code
    FROM public.supermarket_product_locations pl
    JOIN public.supermarket_store_locations l
      ON l.id = pl.location_id AND l.company_id = pl.company_id AND l.branch_id = pl.branch_id
    WHERE pl.company_id = p_company_id AND pl.branch_id = p_branch_id AND pl.product_id = v_product_id;
    INSERT INTO public.supermarket_label_job_lines(
      company_id, job_id, product_id, product_name, barcode, price, promo, location_code, copies
    ) VALUES (
      p_company_id, v_job_id, v_product_id, v_product.name, COALESCE(v_product.barcode, ''),
      v_product.price, v_supermarket.promo, v_location_code, v_copies
    );
    v_item_count := v_item_count + v_copies;
  END LOOP;
  UPDATE public.supermarket_label_jobs SET item_count = v_item_count WHERE id = v_job_id;
  RETURN jsonb_build_object('labelJobId', v_job_id, 'itemCount', v_item_count, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_mark_label_job_printed(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_job_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_job public.supermarket_label_jobs%ROWTYPE;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  SELECT * INTO v_job FROM public.supermarket_label_jobs
  WHERE id = p_job_id AND company_id = p_company_id AND branch_id = p_branch_id FOR UPDATE;
  IF v_job.id IS NULL THEN RAISE EXCEPTION 'LABEL_JOB_NOT_FOUND'; END IF;
  IF v_job.status = 'printed' THEN
    RETURN jsonb_build_object('labelJobId', v_job.id, 'status', v_job.status, 'duplicate', true);
  END IF;
  UPDATE public.supermarket_label_jobs SET
    status = 'printed', printed_at = timezone('utc'::text, now()), printed_by = p_user_id
  WHERE id = v_job.id;
  RETURN jsonb_build_object('labelJobId', v_job.id, 'status', 'printed', 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_list_locations(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_save_location(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_list_placements(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_save_placement(UUID, UUID, UUID, UUID, UUID, INTEGER, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_list_label_jobs(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_create_label_job(UUID, UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_mark_label_job_printed(UUID, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supermarket_list_locations(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_save_location(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_placements(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_save_placement(UUID, UUID, UUID, UUID, UUID, INTEGER, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_label_jobs(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_create_label_job(UUID, UUID, UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_mark_label_job_printed(UUID, UUID, UUID, UUID) TO service_role;
