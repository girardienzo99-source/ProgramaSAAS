-- 1. La identidad del tenant proviene de metadata administrada por el servidor.
CREATE OR REPLACE FUNCTION public.jwt_company_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'company_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE;

-- 2. Función helper para actualizar de forma automática la columna updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at
CREATE OR REPLACE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Trigger Global de Auditoría (Audit Trail)
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_values, new_values, ip_address)
    VALUES (
        COALESCE(NEW.company_id, OLD.company_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
        inet_client_addr()::varchar
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar auditoría en tablas transaccionales críticas
CREATE OR REPLACE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE OR REPLACE TRIGGER audit_stock
    AFTER INSERT OR UPDATE OR DELETE ON stock
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE OR REPLACE TRIGGER audit_cajas
    AFTER INSERT OR UPDATE OR DELETE ON cajas
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE OR REPLACE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE OR REPLACE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();


-- 4. Habilitación de Row Level Security (RLS) en todas las tablas transaccionales
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- 5. Creación de Políticas RLS Multi-tenant
-- NOTA: Las políticas usan la función public.jwt_company_id() para filtrar.

-- COMPANIES
CREATE POLICY "Select company" ON companies FOR SELECT USING (id = public.jwt_company_id());
CREATE POLICY "Update company" ON companies FOR UPDATE USING (id = public.jwt_company_id()) WITH CHECK (id = public.jwt_company_id());

-- BRANCHES
CREATE POLICY "All branches" ON branches FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- COMPANY_MODULES
CREATE POLICY "Select active modules" ON company_modules FOR SELECT USING (company_id = public.jwt_company_id());

-- ROLES
CREATE POLICY "Select roles" ON roles FOR SELECT USING (company_id = public.jwt_company_id() OR company_id IS NULL);
CREATE POLICY "Write roles" ON roles FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- ROLE_PERMISSIONS
CREATE POLICY "Select role permissions" ON role_permissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND (r.company_id = public.jwt_company_id() OR r.company_id IS NULL))
);
CREATE POLICY "Write role permissions" ON role_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND r.company_id = public.jwt_company_id())
) WITH CHECK (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND r.company_id = public.jwt_company_id())
);

-- COMPANY_USERS
CREATE POLICY "All company users" ON company_users FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- CLIENTS
CREATE POLICY "All clients" ON clients FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- PRODUCTS
CREATE POLICY "All products" ON products FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- STOCK
CREATE POLICY "All stock" ON stock FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- STOCK_MOVEMENTS
CREATE POLICY "All stock movements" ON stock_movements FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- CAJAS
CREATE POLICY "All cajas" ON cajas FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- CAJA_MOVEMENTS
CREATE POLICY "All caja movements" ON caja_movements FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- SALES
CREATE POLICY "All sales" ON sales FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- SALE_ITEMS
CREATE POLICY "All sale items" ON sale_items FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- INVOICES
CREATE POLICY "All invoices" ON invoices FOR ALL USING (company_id = public.jwt_company_id()) WITH CHECK (company_id = public.jwt_company_id());

-- AUDIT_LOGS
CREATE POLICY "Select audit logs" ON audit_logs FOR SELECT USING (company_id = public.jwt_company_id());
