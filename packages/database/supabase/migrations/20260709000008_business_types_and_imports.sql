-- 1. Catálogo de Rubros e Industrias
CREATE TABLE IF NOT EXISTS public.business_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read business types" ON public.business_types FOR SELECT USING (true);
CREATE POLICY "Write business types" ON public.business_types FOR ALL USING (true);

-- 2. Plantilla de Módulos por Rubro
CREATE TABLE IF NOT EXISTS public.business_type_modules (
    business_type_code VARCHAR(50) REFERENCES public.business_types(code) ON DELETE CASCADE,
    module_code VARCHAR(50) REFERENCES public.modules(code) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    PRIMARY KEY (business_type_code, module_code)
);

-- RLS
ALTER TABLE public.business_type_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read business type modules" ON public.business_type_modules FOR SELECT USING (true);
CREATE POLICY "Write business type modules" ON public.business_type_modules FOR ALL USING (true);

-- 3. Configuración por Defecto de Categorías/Impuestos por Rubro
CREATE TABLE IF NOT EXISTS public.business_type_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_type_code VARCHAR(50) REFERENCES public.business_types(code) ON DELETE CASCADE NOT NULL,
    preset_type VARCHAR(50) NOT NULL, -- 'category', 'tax_rate', 'default_role'
    name VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.business_type_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read business presets" ON public.business_type_presets FOR SELECT USING (true);
CREATE POLICY "Write business presets" ON public.business_type_presets FOR ALL USING (true);

-- 4. Historial de Importaciones de Datos
CREATE TABLE IF NOT EXISTS public.data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- 'products', 'clients', 'stock'
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'completed', 'failed', 'rolled_back'
    total_rows INT DEFAULT 0,
    successful_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    error_summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read company data imports" ON public.data_imports FOR SELECT USING (company_id = public.jwt_company_id());
CREATE POLICY "Write company data imports" ON public.data_imports FOR INSERT WITH CHECK (company_id = public.jwt_company_id());

-- Triggers de Auditoría
CREATE OR REPLACE TRIGGER audit_business_types
    AFTER INSERT OR UPDATE OR DELETE ON public.business_types
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE OR REPLACE TRIGGER audit_data_imports
    AFTER INSERT OR UPDATE OR DELETE ON public.data_imports
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
