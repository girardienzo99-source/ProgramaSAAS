-- 1. Tickets de Soporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' NOT NULL, -- 'open', 'in_progress', 'resolved', 'closed'
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL, -- 'low', 'medium', 'high', 'critical'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON public.support_tickets(company_id);

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All tickets" ON public.support_tickets 
    FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- 2. Respuestas de Tickets
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    is_staff BOOLEAN DEFAULT false,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_ticket_messages(ticket_id);

-- RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read support messages" ON public.support_ticket_messages 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_id AND t.company_id = public.jwt_company_id()
        )
    );
CREATE POLICY "Insert support messages" ON public.support_ticket_messages 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_id AND t.company_id = public.jwt_company_id()
        )
    );

-- 3. Notificaciones del Tenant
CREATE TABLE IF NOT EXISTS public.tenant_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'billing', 'support', 'system', 'limit_warning'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenant_notifications_company ON public.tenant_notifications(company_id);

-- RLS
ALTER TABLE public.tenant_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All notifications" ON public.tenant_notifications 
    FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- Triggers de Auditoría
CREATE OR REPLACE TRIGGER audit_support_tickets
    AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
