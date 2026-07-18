-- Creación de la Tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(20),
    address TEXT,
    phone VARCHAR(50),
    contact_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de Optimización
CREATE INDEX IF NOT EXISTS idx_providers_company ON public.providers(company_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad Multi-tenant
CREATE POLICY "All providers" ON public.providers 
    FOR ALL 
    USING (company_id = public.jwt_company_id()) 
    WITH CHECK (company_id = public.jwt_company_id());

-- Habilitar Auditoría en Proveedores
CREATE OR REPLACE TRIGGER audit_providers
    AFTER INSERT OR UPDATE OR DELETE ON public.providers
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
