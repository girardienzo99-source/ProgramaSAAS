-- 1. Tabla de Preferencias Visuales por Empresa
CREATE TABLE IF NOT EXISTS public.company_branding_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    logo_url VARCHAR(500),
    primary_color VARCHAR(10) DEFAULT '#2563EB' NOT NULL, -- Color principal
    secondary_color VARCHAR(10) DEFAULT '#475569' NOT NULL,
    dashboard_layout JSONB DEFAULT '{"widgets": ["sales_chart", "stock_alerts"]}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (company_id)
);

-- RLS
ALTER TABLE public.company_branding_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Branding Isolation" ON public.company_branding_configs
    FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- Triggers de Auditoría
CREATE OR REPLACE TRIGGER audit_branding_configs
    AFTER INSERT OR UPDATE OR DELETE ON public.company_branding_configs
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
