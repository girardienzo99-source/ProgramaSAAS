-- Creación de la Tabla de Configuraciones de ARCA por Empresa
CREATE TABLE IF NOT EXISTS public.company_arca_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    cuit VARCHAR(20) NOT NULL,
    environment VARCHAR(20) DEFAULT 'homologacion' NOT NULL, -- 'homologacion' | 'produccion'
    certificate_text TEXT, -- Contenido de certificado .crt (cifrado o seguro con RLS)
    private_key_text TEXT, -- Contenido de clave privada .key (cifrado o seguro con RLS)
    point_of_sale INT NOT NULL, -- Punto de Venta configurado en AFIP
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, cuit)
);

-- Índices de Optimización
CREATE INDEX IF NOT EXISTS idx_company_arca_configs_company ON public.company_arca_configs(company_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.company_arca_configs ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad Multi-tenant
CREATE POLICY "All arca configs" ON public.company_arca_configs 
    FOR ALL 
    USING (company_id = public.jwt_company_id()) 
    WITH CHECK (company_id = public.jwt_company_id());

-- Aplicar trigger de updated_at
CREATE OR REPLACE TRIGGER update_company_arca_configs_updated_at
    BEFORE UPDATE ON public.company_arca_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
