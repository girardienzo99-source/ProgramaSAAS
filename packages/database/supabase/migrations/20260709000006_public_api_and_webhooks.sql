-- 1. Tabla de API Keys
CREATE TABLE IF NOT EXISTS public.company_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    prefix VARCHAR(10) DEFAULT 'ps_live_' NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- Hash SHA-256
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_api_keys_hash ON public.company_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_company_api_keys_company ON public.company_api_keys(company_id);

-- Habilitar RLS
ALTER TABLE public.company_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All api keys" ON public.company_api_keys 
    FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- 2. Tabla de Webhooks Configurados
CREATE TABLE IF NOT EXISTS public.company_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(100) NOT NULL,
    events TEXT[] DEFAULT '{}'::text[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_webhooks_company ON public.company_webhooks(company_id);

-- Habilitar RLS
ALTER TABLE public.company_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All webhooks" ON public.company_webhooks 
    FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- 3. Tabla de Logs de Envío de Webhooks
CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    webhook_id UUID REFERENCES public.company_webhooks(id) ON DELETE CASCADE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INT,
    response_body TEXT,
    success BOOLEAN DEFAULT false,
    duration_ms INT,
    attempt INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhook_logs_company ON public.webhook_delivery_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON public.webhook_delivery_logs(webhook_id);

-- Habilitar RLS
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read webhook logs" ON public.webhook_delivery_logs 
    FOR SELECT USING (company_id = public.jwt_company_id());
CREATE POLICY "Insert webhook logs" ON public.webhook_delivery_logs 
    FOR INSERT WITH CHECK (true); -- Permitir registrar los disparos desde el backend

-- 4. Triggers de Auditoría
CREATE OR REPLACE TRIGGER audit_company_api_keys
    AFTER INSERT OR UPDATE OR DELETE ON public.company_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE OR REPLACE TRIGGER audit_company_webhooks
    AFTER INSERT OR UPDATE OR DELETE ON public.company_webhooks
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
