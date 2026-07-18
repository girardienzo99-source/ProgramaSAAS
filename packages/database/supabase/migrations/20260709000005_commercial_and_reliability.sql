-- 1. Tabla de Suscripciones por Empresa
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL, -- 'active' | 'suspended' | 'canceled' | 'trial'
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en suscripciones
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All subscriptions" ON public.company_subscriptions 
    FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- 2. Tabla de Logs de Auditoría (Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(100) NOT NULL, -- 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN'
    target_table VARCHAR(100) NOT NULL,
    target_id UUID,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en logs de auditoría (Acceso restringido)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company managers read logs" ON public.audit_logs 
    FOR SELECT USING (company_id = public.jwt_company_id());

-- 3. Tabla de Logs de Errores del Sistema
CREATE TABLE IF NOT EXISTS public.system_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    endpoint VARCHAR(255),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en logs de errores (Supervisores y Desarrolladores)
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company supervisors read errors" ON public.system_error_logs 
    FOR SELECT USING (company_id = public.jwt_company_id());
CREATE POLICY "Company create errors" ON public.system_error_logs 
    FOR INSERT WITH CHECK (true); -- Permitir registrar errores

-- 4. Trigger genérico de auditoría para tablas críticas
CREATE OR REPLACE FUNCTION public.audit_trigger_func() RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID := NULL;
    v_user_id UUID := NULL;
    v_old JSONB := '{}'::jsonb;
    v_new JSONB := '{}'::jsonb;
BEGIN
    -- Capturar ID de la empresa involucrada
    IF TG_OP = 'DELETE' THEN
        BEGIN
            v_company_id := OLD.company_id;
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
        v_old := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        BEGIN
            v_company_id := NEW.company_id;
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        BEGIN
            v_company_id := NEW.company_id;
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
        v_new := to_jsonb(NEW);
    END IF;

    -- Registrar entrada de auditoría
    INSERT INTO public.audit_logs (
        company_id,
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        v_company_id,
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old,
        v_new
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función de Onboarding Automático de Empresa por Rubro
CREATE OR REPLACE FUNCTION public.onboard_new_company(
    p_company_name VARCHAR(255),
    p_business_type_code VARCHAR(50),
    p_plan_id UUID,
    p_admin_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
    v_branch_id UUID;
    v_role_id UUID;
    v_business_type_id UUID;
    v_module_record RECORD;
BEGIN
    -- 1. Obtener ID del Rubro
    SELECT id INTO v_business_type_id FROM public.business_types WHERE code = p_business_type_code;
    IF v_business_type_id IS NULL THEN
        SELECT id INTO v_business_type_id FROM public.business_types LIMIT 1;
    END IF;

    -- 2. Crear Empresa
    INSERT INTO public.companies (name, plan_id, business_type_id, status)
    VALUES (p_company_name, p_plan_id, v_business_type_id, 'active')
    RETURNING id INTO v_company_id;

    -- 3. Crear Sucursal Matriz
    INSERT INTO public.branches (company_id, name, is_main, arca_punto_venta)
    VALUES (v_company_id, 'Casa Central', true, 1)
    RETURNING id INTO v_branch_id;

    -- 4. Crear Roles Básicos de Empresa
    -- Administrador / Propietario (Owner)
    INSERT INTO public.roles (company_id, name, description, is_system)
    VALUES (v_company_id, 'Administrador / Propietario', 'Acceso total y administración de la empresa', true)
    RETURNING id INTO v_role_id;

    -- Cajero (Cashier)
    INSERT INTO public.roles (company_id, name, description, is_system)
    VALUES (v_company_id, 'Cajero', 'Ventas del mostrador y arqueos de caja', false);

    -- 5. Habilitar Módulos del Marketplace (Core + Rubro específico)
    FOR v_module_record IN 
        SELECT id, code, is_core FROM public.modules
    LOOP
        -- Activar módulos CORE por defecto
        IF v_module_record.is_core = true THEN
            INSERT INTO public.company_modules (company_id, module_id, is_active)
            VALUES (v_company_id, v_module_record.id, true);
        END IF;

        -- Activar módulos específicos según Rubro contratado
        IF p_business_type_code = 'gastronomy' AND v_module_record.code = 'gastronomy_tables' THEN
            INSERT INTO public.company_modules (company_id, module_id, is_active)
            VALUES (v_company_id, v_module_record.id, true);
        END IF;

        IF p_business_type_code = 'retail_apparel' AND v_module_record.code = 'retail_variants' THEN
            INSERT INTO public.company_modules (company_id, module_id, is_active)
            VALUES (v_company_id, v_module_record.id, true);
        END IF;
    END LOOP;

    -- 6. Asociar el usuario administrador
    IF p_admin_user_id IS NOT NULL THEN
        INSERT INTO public.company_users (company_id, user_id, role_id, active, main_branch_id)
        VALUES (v_company_id, p_admin_user_id, v_role_id, true, v_branch_id);
    END IF;

    -- 7. Crear Suscripción Inicial
    INSERT INTO public.company_subscriptions (company_id, plan_id, status, start_date, end_date)
    VALUES (v_company_id, p_plan_id, 'active', now(), now() + interval '30 days');

    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
