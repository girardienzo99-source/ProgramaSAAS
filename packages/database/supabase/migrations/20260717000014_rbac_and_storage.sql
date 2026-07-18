-- Phase 0: enforced RBAC, membership integrity and isolated object storage.

WITH permission_definitions(module_code, name, description) AS (
  VALUES
    ('contacts', 'platform.users.view', 'View company users and roles'),
    ('contacts', 'platform.users.manage', 'Create and manage company users and roles'),
    ('contacts', 'platform.settings.view', 'View company configuration'),
    ('contacts', 'platform.settings.update', 'Update company configuration'),
    ('contacts', 'platform.imports.view', 'View data imports'),
    ('contacts', 'platform.imports.create', 'Create data imports'),
    ('contacts', 'platform.notifications.view', 'View company notifications'),
    ('contacts', 'platform.notifications.manage', 'Manage company notifications'),
    ('contacts', 'platform.support.view', 'View support tickets'),
    ('contacts', 'platform.support.create', 'Create support tickets'),
    ('contacts', 'platform.diagnostics.view', 'View operational diagnostics'),
    ('contacts', 'platform.ai.use', 'Use assisted analysis features'),
    ('contacts', 'platform.files.view', 'View private company files'),
    ('contacts', 'platform.files.create', 'Upload company files'),
    ('billing_arca', 'billing.read', 'View billing records'),
    ('billing_arca', 'billing.create', 'Create invoices'),
    ('billing_arca', 'billing.manage', 'Manage fiscal configuration'),
    ('contacts', '*', 'Full access within the assigned company')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = d.module_code
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name = '*'
WHERE r.is_system = true
  AND r.name IN ('Administrador / Propietario', 'Administrador del Sistema')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permission(p_required TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.role_permissions rp ON rp.role_id = cu.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE cu.company_id = public.jwt_company_id()
      AND cu.user_id = auth.uid()
      AND cu.active = true
      AND (
        p.name = '*'
        OR p.name = p_required
        OR (right(p.name, 2) = '.*' AND p_required LIKE left(p.name, length(p.name) - 1) || '%')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_permission(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_owner_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.is_system = true AND NEW.name = 'Administrador / Propietario' THEN
    INSERT INTO public.role_permissions(role_id, permission_id)
    SELECT NEW.id, p.id FROM public.permissions p WHERE p.name = '*'
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_owner_permissions_after_role ON public.roles;
CREATE TRIGGER grant_owner_permissions_after_role
  AFTER INSERT ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_permissions();

CREATE OR REPLACE FUNCTION public.validate_company_user_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = NEW.role_id AND r.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'ROLE_COMPANY_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF NEW.main_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = NEW.main_branch_id AND b.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'BRANCH_COMPANY_MISMATCH' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_company_user_scope_before_write ON public.company_users;
CREATE TRIGGER validate_company_user_scope_before_write
  BEFORE INSERT OR UPDATE ON public.company_users
  FOR EACH ROW EXECUTE FUNCTION public.validate_company_user_scope();

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read modules" ON public.modules;
CREATE POLICY "Read modules" ON public.modules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read permissions" ON public.permissions;
CREATE POLICY "Read permissions" ON public.permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "All company users" ON public.company_users;
CREATE POLICY "Read own or managed company users" ON public.company_users
  FOR SELECT USING (
    company_id = public.jwt_company_id()
    AND (user_id = auth.uid() OR public.has_permission('platform.users.view'))
  );
CREATE POLICY "Create managed company users" ON public.company_users
  FOR INSERT WITH CHECK (
    company_id = public.jwt_company_id()
    AND public.has_permission('platform.users.manage')
  );
CREATE POLICY "Update managed company users" ON public.company_users
  FOR UPDATE USING (
    company_id = public.jwt_company_id()
    AND public.has_permission('platform.users.manage')
  ) WITH CHECK (
    company_id = public.jwt_company_id()
    AND public.has_permission('platform.users.manage')
  );
CREATE POLICY "Delete managed company users" ON public.company_users
  FOR DELETE USING (
    company_id = public.jwt_company_id()
    AND public.has_permission('platform.users.manage')
  );

DROP POLICY IF EXISTS "Select roles" ON public.roles;
DROP POLICY IF EXISTS "Write roles" ON public.roles;
CREATE POLICY "Read company roles" ON public.roles
  FOR SELECT USING (company_id = public.jwt_company_id() OR company_id IS NULL);
CREATE POLICY "Create company roles" ON public.roles
  FOR INSERT WITH CHECK (
    company_id = public.jwt_company_id()
    AND is_system = false
    AND public.has_permission('platform.users.manage')
  );
CREATE POLICY "Update company roles" ON public.roles
  FOR UPDATE USING (
    company_id = public.jwt_company_id()
    AND is_system = false
    AND public.has_permission('platform.users.manage')
  ) WITH CHECK (
    company_id = public.jwt_company_id()
    AND is_system = false
    AND public.has_permission('platform.users.manage')
  );
CREATE POLICY "Delete company roles" ON public.roles
  FOR DELETE USING (
    company_id = public.jwt_company_id()
    AND is_system = false
    AND public.has_permission('platform.users.manage')
  );

DROP POLICY IF EXISTS "Select role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Write role permissions" ON public.role_permissions;
CREATE POLICY "Read assigned role permissions" ON public.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND (r.company_id = public.jwt_company_id() OR r.company_id IS NULL)
        AND (
          public.has_permission('platform.users.view')
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = public.jwt_company_id()
              AND cu.user_id = auth.uid()
              AND cu.role_id = role_id
              AND cu.active = true
          )
        )
    )
  );
CREATE POLICY "Manage company role permissions" ON public.role_permissions
  FOR ALL USING (
    public.has_permission('platform.users.manage')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND r.company_id = public.jwt_company_id()
        AND r.is_system = false
    )
  ) WITH CHECK (
    public.has_permission('platform.users.manage')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
        AND r.company_id = public.jwt_company_id()
        AND r.is_system = false
    )
  );

CREATE OR REPLACE FUNCTION public.jwt_business_type()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT bt.code
  FROM public.companies c
  JOIN public.business_types bt ON bt.id = c.business_type_id
  WHERE c.id = public.jwt_company_id()
    AND c.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.jwt_business_type() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jwt_business_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_business_type() TO service_role;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('catalog-assets', 'catalog-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('private-assets', 'private-assets', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Upload isolated catalog assets" ON storage.objects;
CREATE POLICY "Upload isolated catalog assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'catalog-assets'
    AND (storage.foldername(name))[1] = public.jwt_company_id()::TEXT
    AND (storage.foldername(name))[2] = public.jwt_business_type()
    AND public.has_permission('platform.files.create')
  );

DROP POLICY IF EXISTS "Manage isolated catalog assets" ON storage.objects;
CREATE POLICY "Manage isolated catalog assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'catalog-assets'
    AND (storage.foldername(name))[1] = public.jwt_company_id()::TEXT
    AND (storage.foldername(name))[2] = public.jwt_business_type()
    AND public.has_permission('platform.files.create')
  ) WITH CHECK (
    bucket_id = 'catalog-assets'
    AND (storage.foldername(name))[1] = public.jwt_company_id()::TEXT
    AND (storage.foldername(name))[2] = public.jwt_business_type()
    AND public.has_permission('platform.files.create')
  );

DROP POLICY IF EXISTS "Delete isolated catalog assets" ON storage.objects;
CREATE POLICY "Delete isolated catalog assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'catalog-assets'
    AND (storage.foldername(name))[1] = public.jwt_company_id()::TEXT
    AND (storage.foldername(name))[2] = public.jwt_business_type()
    AND public.has_permission('platform.files.create')
  );

DROP POLICY IF EXISTS "Read isolated private assets" ON storage.objects;
CREATE POLICY "Read isolated private assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-assets'
    AND (storage.foldername(name))[1] = public.jwt_company_id()::TEXT
    AND (storage.foldername(name))[2] = public.jwt_business_type()
    AND public.has_permission('platform.files.view')
  );

DROP POLICY IF EXISTS "Upload isolated private assets" ON storage.objects;
CREATE POLICY "Upload isolated private assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'private-assets'
    AND (storage.foldername(name))[1] = public.jwt_company_id()::TEXT
    AND (storage.foldername(name))[2] = public.jwt_business_type()
    AND public.has_permission('platform.files.create')
  );

REVOKE ALL ON FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) TO authenticated;
