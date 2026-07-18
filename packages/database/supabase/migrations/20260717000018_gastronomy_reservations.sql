-- Gastronomy reservation agenda with table-conflict validation.

WITH permission_definitions(name, description) AS (
  VALUES
    ('gastronomy.reservations.read', 'View the gastronomy reservation agenda'),
    ('gastronomy.reservations.write', 'Create and update gastronomy reservations')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'gastronomy_tables'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.gastronomy_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.gastronomy_dining_tables(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  guests INTEGER NOT NULL CHECK (guests > 0 AND guests <= 100),
  reserved_for TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 120 NOT NULL CHECK (duration_minutes BETWEEN 30 AND 480),
  status VARCHAR(20) DEFAULT 'confirmed' NOT NULL
    CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  source VARCHAR(20) DEFAULT 'manual' NOT NULL
    CHECK (source IN ('manual', 'whatsapp', 'instagram', 'web', 'phone')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gastronomy_reservations_agenda
  ON public.gastronomy_reservations(company_id, branch_id, reserved_for, status);
CREATE INDEX IF NOT EXISTS idx_gastronomy_reservations_table_time
  ON public.gastronomy_reservations(company_id, table_id, reserved_for)
  WHERE status IN ('pending', 'confirmed', 'seated');

ALTER TABLE public.gastronomy_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gastronomy reservations by company" ON public.gastronomy_reservations FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'gastronomy')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'gastronomy');

CREATE OR REPLACE FUNCTION public.gastronomy_list_reservations(p_company_id UUID, p_branch_id UUID)
RETURNS TABLE(
  id UUID,
  table_id UUID,
  table_name TEXT,
  customer_name TEXT,
  phone TEXT,
  guests INTEGER,
  reserved_for TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  status TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.table_id,
    COALESCE(t.name, 'Sin mesa')::TEXT,
    r.customer_name::TEXT,
    COALESCE(r.phone, '')::TEXT,
    r.guests,
    r.reserved_for,
    r.duration_minutes,
    r.status::TEXT,
    r.source::TEXT,
    COALESCE(r.notes, '')::TEXT,
    r.created_at
  FROM public.gastronomy_reservations r
  LEFT JOIN public.gastronomy_dining_tables t
    ON t.id = r.table_id AND t.company_id = r.company_id
  WHERE r.company_id = p_company_id
    AND r.branch_id = p_branch_id
    AND r.reserved_for >= timezone('utc'::text, now()) - interval '12 hours'
    AND r.reserved_for < timezone('utc'::text, now()) + interval '60 days'
  ORDER BY r.reserved_for, r.customer_name;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_save_reservation(
  p_company_id UUID,
  p_branch_id UUID,
  p_user_id UUID,
  p_reservation_id UUID,
  p_table_id UUID,
  p_customer_name TEXT,
  p_phone TEXT,
  p_guests INTEGER,
  p_reserved_for TIMESTAMP WITH TIME ZONE,
  p_duration_minutes INTEGER,
  p_source TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_reservation_id UUID := p_reservation_id;
BEGIN
  IF p_guests <= 0 OR p_guests > 100 OR p_duration_minutes < 30 OR p_duration_minutes > 480 THEN
    RAISE EXCEPTION 'INVALID_RESERVATION';
  END IF;
  IF p_reserved_for < timezone('utc'::text, now()) - interval '30 minutes' THEN
    RAISE EXCEPTION 'RESERVATION_IN_PAST';
  END IF;
  IF p_source NOT IN ('manual', 'whatsapp', 'instagram', 'web', 'phone') THEN
    RAISE EXCEPTION 'INVALID_RESERVATION_SOURCE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.branches b WHERE b.id = p_branch_id AND b.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'BRANCH_COMPANY_MISMATCH';
  END IF;
  IF p_table_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.gastronomy_dining_tables t
    WHERE t.id = p_table_id AND t.company_id = p_company_id AND t.branch_id = p_branch_id
      AND t.capacity >= p_guests AND t.status <> 'blocked'
  ) THEN
    RAISE EXCEPTION 'TABLE_CAPACITY_MISMATCH';
  END IF;
  IF p_table_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.gastronomy_reservations r
    WHERE r.company_id = p_company_id
      AND r.branch_id = p_branch_id
      AND r.table_id = p_table_id
      AND r.id IS DISTINCT FROM v_reservation_id
      AND r.status IN ('pending', 'confirmed', 'seated')
      AND r.reserved_for < p_reserved_for + make_interval(mins => p_duration_minutes)
      AND r.reserved_for + make_interval(mins => r.duration_minutes) > p_reserved_for
  ) THEN
    RAISE EXCEPTION 'RESERVATION_TIME_CONFLICT';
  END IF;

  IF v_reservation_id IS NULL THEN
    INSERT INTO public.gastronomy_reservations(
      company_id, branch_id, table_id, customer_name, phone, guests, reserved_for,
      duration_minutes, status, source, notes, created_by
    )
    VALUES (
      p_company_id, p_branch_id, p_table_id, p_customer_name, NULLIF(p_phone, ''), p_guests,
      p_reserved_for, p_duration_minutes, 'confirmed', p_source, NULLIF(p_notes, ''), p_user_id
    )
    RETURNING id INTO v_reservation_id;
  ELSE
    UPDATE public.gastronomy_reservations SET
      table_id = p_table_id,
      customer_name = p_customer_name,
      phone = NULLIF(p_phone, ''),
      guests = p_guests,
      reserved_for = p_reserved_for,
      duration_minutes = p_duration_minutes,
      source = p_source,
      notes = NULLIF(p_notes, ''),
      updated_at = timezone('utc'::text, now())
    WHERE id = v_reservation_id AND company_id = p_company_id AND branch_id = p_branch_id
      AND status IN ('pending', 'confirmed');
    IF NOT FOUND THEN RAISE EXCEPTION 'RESERVATION_NOT_EDITABLE'; END IF;
  END IF;

  IF p_table_id IS NOT NULL
    AND p_reserved_for <= timezone('utc'::text, now()) + interval '2 hours'
    AND p_reserved_for + make_interval(mins => p_duration_minutes) >= timezone('utc'::text, now())
  THEN
    UPDATE public.gastronomy_dining_tables SET status = 'reserved'
    WHERE id = p_table_id AND company_id = p_company_id AND status = 'available';
  END IF;
  RETURN v_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.gastronomy_update_reservation_status(
  p_company_id UUID,
  p_branch_id UUID,
  p_reservation_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_current_status TEXT;
  v_table_id UUID;
BEGIN
  IF p_status NOT IN ('confirmed', 'seated', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'INVALID_RESERVATION_STATUS';
  END IF;
  SELECT r.status, r.table_id INTO v_current_status, v_table_id
  FROM public.gastronomy_reservations r
  WHERE r.id = p_reservation_id AND r.company_id = p_company_id AND r.branch_id = p_branch_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RESERVATION_NOT_FOUND'; END IF;

  IF NOT (
    (v_current_status = 'pending' AND p_status IN ('confirmed', 'cancelled'))
    OR (v_current_status = 'confirmed' AND p_status IN ('seated', 'cancelled', 'no_show'))
    OR (v_current_status = 'seated' AND p_status IN ('completed', 'cancelled'))
    OR v_current_status = p_status
  ) THEN
    RAISE EXCEPTION 'INVALID_RESERVATION_TRANSITION';
  END IF;

  IF p_status = 'seated' AND v_table_id IS NULL THEN RAISE EXCEPTION 'RESERVATION_TABLE_REQUIRED'; END IF;
  IF p_status = 'seated' AND EXISTS (
    SELECT 1 FROM public.gastronomy_dining_tables t
    WHERE t.id = v_table_id AND t.company_id = p_company_id AND t.status = 'occupied'
  ) THEN
    RAISE EXCEPTION 'TABLE_ALREADY_OCCUPIED';
  END IF;

  UPDATE public.gastronomy_reservations SET
    status = p_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_reservation_id AND company_id = p_company_id;

  IF v_table_id IS NOT NULL AND p_status = 'seated' THEN
    UPDATE public.gastronomy_dining_tables SET status = 'occupied'
    WHERE id = v_table_id AND company_id = p_company_id;
  ELSIF v_table_id IS NOT NULL AND p_status IN ('completed', 'cancelled', 'no_show') THEN
    UPDATE public.gastronomy_dining_tables t SET status = 'available'
    WHERE t.id = v_table_id AND t.company_id = p_company_id
      AND NOT EXISTS (
        SELECT 1 FROM public.gastronomy_orders o
        WHERE o.table_id = t.id AND o.company_id = t.company_id
          AND o.status NOT IN ('closed', 'cancelled')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.gastronomy_reservations r
        WHERE r.table_id = t.id AND r.company_id = t.company_id
          AND r.id <> p_reservation_id AND r.status IN ('pending', 'confirmed', 'seated')
          AND r.reserved_for <= timezone('utc'::text, now()) + interval '2 hours'
          AND r.reserved_for + make_interval(mins => r.duration_minutes) >= timezone('utc'::text, now())
      );
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.gastronomy_list_reservations(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_save_reservation(UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gastronomy_update_reservation_status(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gastronomy_list_reservations(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_save_reservation(UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.gastronomy_update_reservation_status(UUID, UUID, UUID, TEXT) TO service_role;
