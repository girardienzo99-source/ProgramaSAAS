-- 1. Feature Flags por Empresa
CREATE TABLE IF NOT EXISTS public.company_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    flag_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (company_id, flag_name)
);

-- RLS
ALTER TABLE public.company_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All feature flags" ON public.company_feature_flags 
    FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- 2. Versionado de Esquemas de Módulos
CREATE TABLE IF NOT EXISTS public.module_schema_versions (
    module_code VARCHAR(50) PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.module_schema_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read schema versions" ON public.module_schema_versions FOR SELECT USING (true);
CREATE POLICY "Write schema versions" ON public.module_schema_versions FOR ALL USING (true);

-- 3. Métricas de Uso de Recursos por Empresa
CREATE TABLE IF NOT EXISTS public.company_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    metric_name VARCHAR(100) NOT NULL, -- 'api_calls', 'pos_transactions', 'db_size_bytes'
    metric_value BIGINT DEFAULT 0 NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usage_metrics_company ON public.company_usage_metrics(company_id);

-- RLS
ALTER TABLE public.company_usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read usage metrics" ON public.company_usage_metrics FOR SELECT USING (company_id = public.jwt_company_id());
CREATE POLICY "Insert usage metrics" ON public.company_usage_metrics FOR INSERT WITH CHECK (true); -- Permitir recolectores de telemetría de backend

-- Triggers de Auditoría
CREATE OR REPLACE TRIGGER audit_feature_flags
    AFTER INSERT OR UPDATE OR DELETE ON public.company_feature_flags
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
