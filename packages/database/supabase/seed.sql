-- =========================================================================
-- SEED DE DATOS INICIALES - PROGRAMA SaaS
-- =========================================================================

-- 1. Insertar Planes de Suscripción Predeterminados
INSERT INTO public.subscription_plans (id, name, price, billing_period, max_branches, max_users, features)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Plan Básico', 15000.00, 'monthly', 1, 2, '{"pos": true, "inventory": true}'),
  ('22222222-2222-2222-2222-222222222222', 'Plan Profesional', 29000.00, 'monthly', 3, 10, '{"pos": true, "inventory": true, "billing_arca": true, "contacts": true, "purchases": true}'),
  ('33333333-3333-3333-3333-333333333333', 'Plan Premium / Multirubro', 55000.00, 'monthly', 10, 99, '{"pos": true, "inventory": true, "billing_arca": true, "contacts": true, "purchases": true, "extra_modules": true}')
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Módulos Disponibles en el Marketplace
INSERT INTO public.modules (id, name, code, description, is_core, dependencies)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Punto de Venta (POS)', 'pos', 'Terminal de facturación rápida y cobros', true, '{}'),
  ('c0000000-0000-0000-0000-000000000002', 'Control de Stock', 'inventory', 'Gestión de almacenes, alertas de stock mínimo y trazabilidad', true, '{}'),
  ('c0000000-0000-0000-0000-000000000003', 'Clientes y Proveedores', 'contacts', 'Base de datos unificada de clientes y proveedores', true, '{}'),
  ('c0000000-0000-0000-0000-000000000004', 'Facturación Electrónica ARCA', 'billing_arca', 'Emisión oficial de facturas A, B, C y notas de crédito con CAE en Argentina', false, '{"pos", "contacts"}'),
  ('c0000000-0000-0000-0000-000000000005', 'Gestión de Compras', 'purchases', 'Registro de gastos, compras a proveedores e ingresos a stock', true, '{"inventory"}'),
  
  -- Módulos de Rubros Específicos
  ('d0000000-0000-0000-0000-000000000001', 'Gastronomía (Mesas y Comandas)', 'gastronomy_tables', 'Distribución de mesas, comanda a cocina y gestión de mozos', false, '{"pos"}'),
  ('d0000000-0000-0000-0000-000000000002', 'Venta Minorista (Talles y Colores)', 'retail_variants', 'Atributos avanzados para indumentaria y calzado', false, '{"inventory"}'),
  ('d0000000-0000-0000-0000-000000000003', 'Agenda y Turnos', 'appointments', 'Calendario interactivo de turnos para clientes y profesionales', false, '{}'),
  ('d0000000-0000-0000-0000-000000000004', 'Historias Clínicas', 'medical_records', 'Ficha del paciente e historial clínico digital y seguro', false, '{"appointments"}'),
  ('d0000000-0000-0000-0000-000000000005', 'Gestión Hotelera (Lodging)', 'lodging', 'Check-in, Check-out, estado de limpieza de habitaciones', false, '{}'),
  ('d0000000-0000-0000-0000-000000000006', 'Membresías y Abonos', 'memberships', 'Control de vencimientos y asistencias (Gimnasios/Academias)', false, '{"contacts"}'),
  ('d0000000-0000-0000-0000-000000000007', 'Órdenes de Trabajo (Taller)', 'work_orders', 'Seguimiento de reparaciones, repuestos y mecánicos/técnicos', false, '{"inventory"}'),
  ('d0000000-0000-0000-0000-000000000008', 'Inmobiliaria', 'real_estate', 'Catálogo de propiedades, contratos de alquiler y tasaciones', false, '{}'),
  ('d0000000-0000-0000-0000-000000000009', 'Logística y Despacho', 'logistics', 'Hojas de ruta, asignación de vehículos y seguimiento de envíos', false, '{"inventory"}')
ON CONFLICT (code) DO NOTHING;

-- 3. Insertar Rubros/Tipos de Negocio
INSERT INTO public.business_types (id, name, code, description)
VALUES
  (gen_random_uuid(), 'Restaurantes, Bares y Cafeterías', 'gastronomy', 'Restaurantes, pizzerías, cafeterías, bares, heladerías y panaderías'),
  (gen_random_uuid(), 'Tiendas de Ropa, Calzado y Perfumería', 'retail_apparel', 'Tiendas de ropa, zapaterías y perfumerías'),
  (gen_random_uuid(), 'Farmacias y Salud', 'healthcare', 'Farmacias, consultorios médicos, odontología, psicología, kinesiología, laboratorios y emergencias'),
  (gen_random_uuid(), 'Ferreterías, Corralones y Pinturerías', 'industrial_materials', 'Ferreterías, corralones de materiales y pinturerías'),
  (gen_random_uuid(), 'Veterinarias y Pet Shops', 'veterinary', 'Clínicas veterinarias y tiendas de mascotas'),
  (gen_random_uuid(), 'Kioscos, Minimercados y Supermercados', 'retail_food', 'Kioscos, minimercados, almacenes y supermercados'),
  (gen_random_uuid(), 'Centros de Estética y Bienestar', 'beauty_fitness', 'Gimnasios, peluquerías, barberías y salones de belleza'),
  (gen_random_uuid(), 'Talleres Mecánicos y Servicios de Auto', 'automotive_services', 'Talleres mecánicos, gomerías y lavaderos de autos'),
  (gen_random_uuid(), 'Hoteles y Hospedajes', 'hospitality', 'Hoteles, aparts, cabañas y hostales'),
  (gen_random_uuid(), 'Servicios Profesionales', 'professional_services', 'Estudios contables, estudios jurídicos, inmobiliarias y consultoras'),
  (gen_random_uuid(), 'Servicios de Mantenimiento y Construcción', 'maintenance_construction', 'Empresas de limpieza, constructoras, servicios técnicos y seguridad'),
  (gen_random_uuid(), 'Distribuidoras, Mayoristas y Logística', 'distribution_logistics', 'Distribuidoras, mayoristas, logística y transporte de carga'),
  (gen_random_uuid(), 'Educación y Academias', 'education', 'Institutos educativos, escuelas de idiomas y academias deportivas'),
  (gen_random_uuid(), 'Comercio Minorista General', 'general_retail', 'Florerías, mueblerías, ópticas, estaciones de servicio y otros comercios')
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar Permisos del Sistema
INSERT INTO public.permissions (id, module_id, name, description)
VALUES
  -- Permisos de POS (Punto de Venta)
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'sales.read', 'Ver historial de ventas'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'sales.create', 'Realizar nuevas ventas'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'sales.void', 'Anular ventas registradas'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'cajas.manage', 'Abrir, cerrar y arquear cajas'),
  
  -- Permisos de Control de Stock
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'products.read', 'Ver catálogo de productos y servicios'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'products.create', 'Crear nuevos productos y servicios'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'products.edit', 'Modificar productos y servicios del catálogo'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'stock.manage', 'Ajustar stock e inventario manualmente'),
  
  -- Permisos de Contactos
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003', 'contacts.read', 'Ver clientes y proveedores'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003', 'contacts.write', 'Crear y modificar clientes y proveedores'),
  
  -- Permisos de ARCA
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000004', 'invoices.create', 'Emitir facturas electrónicas con CAE'),
  
  -- Permisos de Gastronomía
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'tables.manage', 'Gestionar distribución de mesas y mozos'),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'kitchen.kds', 'Visualizar pantalla de comandas de cocina'),
  
  -- Permisos de Agenda
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000003', 'appointments.manage', 'Gestionar turnos y horarios de profesionales'),
  
  -- Permisos de Historias Clínicas
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000004', 'medical.records.read', 'Ver historias clínicas de pacientes'),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000004', 'medical.records.write', 'Escribir y actualizar historias clínicas')
ON CONFLICT (name) DO NOTHING;

-- 5. Crear Roles Predeterminados del Sistema (Globales)
-- Tienen company_id = NULL y sirven como plantillas base.
INSERT INTO public.roles (id, company_id, name, description, is_system)
VALUES
  ('99999999-9999-9999-9999-999999999901', NULL, 'Administrador del Sistema', 'Acceso completo a todas las configuraciones, usuarios y reportes', true),
  ('99999999-9999-9999-9999-999999999902', NULL, 'Cajero/Vendedor', 'Permisos limitados a facturación, control de caja y catálogo de lectura', true),
  ('99999999-9999-9999-9999-999999999903', NULL, 'Encargado de Stock', 'Permisos dedicados a compras, ingresos a depósitos y control de inventario', true),
  ('99999999-9999-9999-9999-999999999904', NULL, 'Profesional / Agenda', 'Acceso a su agenda de turnos personal y fichas de clientes/pacientes', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Asignar Permisos a Roles Predeterminados del Sistema
-- Asignaciones para 'Cajero/Vendedor' (99999999-9999-9999-9999-999999999902)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '99999999-9999-9999-9999-999999999902', id 
FROM public.permissions 
WHERE name IN ('sales.read', 'sales.create', 'cajas.manage', 'products.read', 'contacts.read', 'contacts.write', 'invoices.create')
ON CONFLICT DO NOTHING;

-- Asignaciones para 'Encargado de Stock' (99999999-9999-9999-9999-999999999903)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '99999999-9999-9999-9999-999999999903', id 
FROM public.permissions 
WHERE name IN ('products.read', 'products.create', 'products.edit', 'stock.manage', 'contacts.read', 'contacts.write')
ON CONFLICT DO NOTHING;

-- Asignaciones para 'Profesional / Agenda' (99999999-9999-9999-9999-999999999904)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '99999999-9999-9999-9999-999999999904', id 
FROM public.permissions 
WHERE name IN ('appointments.manage', 'contacts.read', 'contacts.write', 'medical.records.read', 'medical.records.write')
ON CONFLICT DO NOTHING;
