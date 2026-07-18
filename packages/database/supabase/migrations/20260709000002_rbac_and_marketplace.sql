-- 1. Función para validar si un usuario de una empresa tiene un permiso específico activo
-- Esta función comprueba:
--   a) Que el usuario pertenezca a la empresa y esté activo.
--   b) Que el rol asignado al usuario tenga el permiso solicitado.
--   c) Que el módulo al que pertenece el permiso esté activo para esa empresa.
CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_user_id UUID, 
    p_company_id UUID, 
    p_permission_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.company_users cu
        JOIN public.role_permissions rp ON cu.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        JOIN public.modules m ON p.module_id = m.id
        JOIN public.company_modules cm ON cu.company_id = cm.company_id AND cm.module_id = m.id
        WHERE cu.user_id = p_user_id
          AND cu.company_id = p_company_id
          AND cu.active = true
          AND cm.is_active = true
          AND p.name = p_permission_name
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para obtener todos los permisos activos del usuario actual
-- Útil para cargar en el frontend (Next.js context) tras iniciar sesión.
CREATE OR REPLACE FUNCTION public.get_user_active_permissions(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS TABLE (permission_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name::VARCHAR
    FROM public.company_users cu
    JOIN public.role_permissions rp ON cu.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.modules m ON p.module_id = m.id
    JOIN public.company_modules cm ON cu.company_id = cm.company_id AND cm.module_id = m.id
    WHERE cu.user_id = p_user_id
      AND cu.company_id = p_company_id
      AND cu.active = true
      AND cm.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
