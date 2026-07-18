-- 1. Optimización de Índices para Auditoría y Telemetría (DT-03)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_created_at ON public.system_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_logged_at ON public.company_usage_metrics(logged_at DESC);

-- 2. Check Constraint de Seguridad Criptográfica
-- Evitar que claves privadas se suban en texto plano sin el formato ivHex:authTagHex:encryptedText de crypto.ts
ALTER TABLE public.company_arca_configs 
    ADD CONSTRAINT chk_private_key_encrypted 
    CHECK (private_key_text ~ '^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$');
