-- Align the database catalog with the application business-type configuration.

-- Reconcile the audit trigger with the audit_logs contract created by the base schema.
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_old JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE '{}'::jsonb END;
  v_company_id UUID;
  v_record_id UUID;
BEGIN
  v_company_id := COALESCE(
    NULLIF(v_new ->> 'company_id', '')::UUID,
    NULLIF(v_old ->> 'company_id', '')::UUID
  );
  v_record_id := COALESCE(
    NULLIF(v_new ->> 'id', '')::UUID,
    NULLIF(v_old ->> 'id', '')::UUID
  );

  INSERT INTO public.audit_logs(
    company_id, user_id, action, table_name, record_id, old_values, new_values, ip_address
  ) VALUES (
    v_company_id, auth.uid(), TG_OP, TG_TABLE_NAME, v_record_id,
    NULLIF(v_old, '{}'::jsonb), NULLIF(v_new, '{}'::jsonb), inet_client_addr()::varchar
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.business_types (name, code, description)
VALUES
  ('Gastronomía', 'gastronomy', 'Restaurantes, bares, cafeterías y comercios gastronómicos'),
  ('Tienda de Ropa / Indumentaria', 'retail_apparel', 'Indumentaria, calzado y accesorios'),
  ('Consultorio / Salud', 'healthcare', 'Consultorios, clínicas y profesionales de la salud'),
  ('Supermercado / Minimarket', 'supermarket', 'Supermercados, minimercados y almacenes'),
  ('Ferretería / Materiales', 'hardware_store', 'Ferreterías, corralones y pinturerías'),
  ('Taller Mecánico / Repuestos', 'automotive', 'Talleres mecánicos y comercios de repuestos'),
  ('Peluquería / Salón de Belleza', 'beauty_salon', 'Peluquerías, barberías y salones de belleza'),
  ('Gimnasio / Actividad Física', 'gym', 'Gimnasios y centros de actividad física'),
  ('Tecnología / Electrodomésticos', 'electronics', 'Tecnología, electrónica y electrodomésticos'),
  ('Servicios Profesionales', 'professional_services', 'Estudios y servicios profesionales'),
  ('Pet Shop / Veterinaria', 'pet_shop', 'Veterinarias y tiendas de mascotas'),
  ('Inmobiliaria / Propiedades', 'real_estate', 'Inmobiliarias y administración de propiedades'),
  ('Hotelería / Hospedaje', 'hotel_hospitality', 'Hoteles, hosterías y alojamientos'),
  ('Educación / Academias', 'education', 'Instituciones educativas y academias'),
  ('Tintorería / Lavandería', 'laundry_dryclean', 'Lavanderías y tintorerías')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO public.modules (id, name, code, description, is_core, dependencies)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Punto de Venta', 'pos', 'Ventas, cobros y caja', true, '{}'),
  ('c0000000-0000-0000-0000-000000000002', 'Inventario', 'inventory', 'Productos, stock y movimientos', true, '{}'),
  ('c0000000-0000-0000-0000-000000000003', 'Contactos', 'contacts', 'Clientes y proveedores', true, '{}'),
  ('d0000000-0000-0000-0000-000000000001', 'Mesas y Comandas', 'gastronomy_tables', 'Salón, comandas y cocina', false, '{pos}'),
  ('d0000000-0000-0000-0000-000000000002', 'Variantes de Indumentaria', 'retail_variants', 'Talles, colores y combinaciones', false, '{inventory}'),
  ('d0000000-0000-0000-0000-000000000003', 'Agenda de Turnos', 'appointments', 'Agenda de pacientes y profesionales', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000001', 'Historias Clínicas', 'clinical_records', 'Historia clínica y evoluciones', false, '{appointments}'),
  ('e0000000-0000-0000-0000-000000000002', 'Lectura de Códigos', 'barcode_scanner', 'Operación por código de barras', false, '{inventory,pos}'),
  ('e0000000-0000-0000-0000-000000000003', 'Fidelización', 'loyalty', 'Puntos, beneficios y promociones', false, '{contacts,pos}'),
  ('e0000000-0000-0000-0000-000000000004', 'Cuentas de Proveedores', 'supplier_accounts', 'Saldos y pagos a proveedores', false, '{contacts,inventory}'),
  ('d0000000-0000-0000-0000-000000000007', 'Órdenes de Taller', 'work_orders', 'Órdenes de reparación y seguimiento', false, '{inventory}'),
  ('e0000000-0000-0000-0000-000000000005', 'Fichas de Vehículos', 'vehicle_records', 'Vehículos, historial y kilometraje', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000006', 'Agenda de Estilistas', 'stylist_agenda', 'Turnos, puestos y profesionales', false, '{contacts}'),
  ('d0000000-0000-0000-0000-000000000006', 'Membresías', 'memberships', 'Planes, cuotas y vencimientos', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000007', 'Control de Acceso', 'access_control', 'Ingresos y control de aptos', false, '{memberships}'),
  ('e0000000-0000-0000-0000-000000000008', 'Números de Serie', 'serial_numbers', 'Trazabilidad por número de serie', false, '{inventory}'),
  ('e0000000-0000-0000-0000-000000000009', 'Garantías', 'warranties', 'Garantías, diagnósticos y RMA', false, '{serial_numbers}'),
  ('e0000000-0000-0000-0000-000000000010', 'Horas Facturables', 'billable_hours', 'Horas, tarifas y facturación', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000011', 'Expedientes', 'case_files', 'Casos, proyectos e hitos', false, '{billable_hours}'),
  ('e0000000-0000-0000-0000-000000000012', 'Fichas de Mascotas', 'pet_records', 'Mascotas, vacunas e historia veterinaria', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000013', 'Agenda Veterinaria', 'vet_agenda', 'Consultas y turnos veterinarios', false, '{pet_records}'),
  ('e0000000-0000-0000-0000-000000000014', 'Contratos de Alquiler', 'leases', 'Alquileres, cobros y ajustes', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000015', 'Catálogo de Propiedades', 'property_catalog', 'Propiedades, ofertas y reclamos', false, '{}'),
  ('e0000000-0000-0000-0000-000000000016', 'Reservas de Habitaciones', 'room_reservations', 'Reservas, ocupación y housekeeping', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000017', 'Registro de Huéspedes', 'guest_records', 'Huéspedes, estadías y consumos', false, '{room_reservations}'),
  ('e0000000-0000-0000-0000-000000000018', 'Legajos de Alumnos', 'student_records', 'Matrículas, notas y asistencia', false, '{contacts}'),
  ('e0000000-0000-0000-0000-000000000019', 'Calendario Escolar', 'school_calendar', 'Cursos, clases y agenda escolar', false, '{student_records}'),
  ('e0000000-0000-0000-0000-000000000020', 'Seguimiento de Prendas', 'garment_tracking', 'Recepción, lavado y entrega', false, '{contacts,pos}')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = EXCLUDED.is_core,
  dependencies = EXCLUDED.dependencies;

CREATE TABLE IF NOT EXISTS public.business_type_modules (
  business_type_code VARCHAR(50) NOT NULL REFERENCES public.business_types(code) ON DELETE CASCADE,
  module_code VARCHAR(50) NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true NOT NULL,
  PRIMARY KEY (business_type_code, module_code)
);

ALTER TABLE public.business_type_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read business type modules" ON public.business_type_modules;
CREATE POLICY "Read business type modules"
  ON public.business_type_modules FOR SELECT
  USING (true);

WITH mappings(business_code, module_code) AS (
  VALUES
    ('gastronomy', 'gastronomy_tables'),
    ('retail_apparel', 'retail_variants'),
    ('healthcare', 'appointments'), ('healthcare', 'clinical_records'),
    ('supermarket', 'barcode_scanner'), ('supermarket', 'loyalty'),
    ('hardware_store', 'supplier_accounts'),
    ('automotive', 'work_orders'), ('automotive', 'vehicle_records'),
    ('beauty_salon', 'stylist_agenda'),
    ('gym', 'memberships'), ('gym', 'access_control'),
    ('electronics', 'serial_numbers'), ('electronics', 'warranties'),
    ('professional_services', 'billable_hours'), ('professional_services', 'case_files'),
    ('pet_shop', 'pet_records'), ('pet_shop', 'vet_agenda'),
    ('real_estate', 'leases'), ('real_estate', 'property_catalog'),
    ('hotel_hospitality', 'room_reservations'), ('hotel_hospitality', 'guest_records'),
    ('education', 'student_records'), ('education', 'school_calendar'),
    ('laundry_dryclean', 'garment_tracking')
)
INSERT INTO public.business_type_modules (business_type_code, module_code)
SELECT map.business_code, map.module_code
FROM mappings map
JOIN public.business_types bt ON bt.code = map.business_code
JOIN public.modules m ON m.code = map.module_code
ON CONFLICT DO NOTHING;

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
BEGIN
  IF auth.uid() IS NULL OR p_admin_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'El usuario administrador no coincide con la sesión autenticada'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_business_type_id
  FROM public.business_types
  WHERE code = p_business_type_code;

  IF v_business_type_id IS NULL THEN
    RAISE EXCEPTION 'Código de rubro inexistente: %', p_business_type_code
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Plan de suscripción inexistente'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.companies (name, plan_id, business_type_id, status)
  VALUES (trim(p_company_name), p_plan_id, v_business_type_id, 'active')
  RETURNING id INTO v_company_id;

  INSERT INTO public.branches (company_id, name, is_main, arca_punto_venta)
  VALUES (v_company_id, 'Casa Central', true, 1)
  RETURNING id INTO v_branch_id;

  INSERT INTO public.roles (company_id, name, description, is_system)
  VALUES (v_company_id, 'Administrador / Propietario', 'Acceso total a la empresa', true)
  RETURNING id INTO v_role_id;

  INSERT INTO public.roles (company_id, name, description, is_system)
  VALUES (v_company_id, 'Cajero', 'Ventas, cobros y caja', false);

  INSERT INTO public.company_modules (company_id, module_id, is_active)
  SELECT v_company_id, m.id, true
  FROM public.modules m
  WHERE m.is_core
     OR EXISTS (
       SELECT 1 FROM public.business_type_modules btm
       WHERE btm.business_type_code = p_business_type_code
         AND btm.module_code = m.code
     )
  ON CONFLICT (company_id, module_id) DO NOTHING;

  INSERT INTO public.company_users (company_id, user_id, role_id, active, main_branch_id)
  VALUES (v_company_id, p_admin_user_id, v_role_id, true, v_branch_id);

  INSERT INTO public.company_subscriptions (company_id, plan_id, status, start_date, end_date)
  VALUES (v_company_id, p_plan_id, 'active', now(), now() + interval '30 days');

  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.onboard_new_company(VARCHAR, VARCHAR, UUID, UUID) TO authenticated;
