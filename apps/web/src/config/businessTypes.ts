export type BusinessTypeCode =
  | 'gastronomy'
  | 'retail_apparel'
  | 'healthcare'
  | 'supermarket'
  | 'hardware_store'
  | 'automotive'
  | 'beauty_salon'
  | 'gym'
  | 'electronics'
  | 'professional_services'
  | 'pet_shop'
  | 'real_estate'
  | 'hotel_hospitality'
  | 'education'
  | 'laundry_dryclean';

export interface BusinessTypeDefinition {
  code: BusinessTypeCode;
  name: string;
  fullName: string;
  description: string;
  icon: string;
  color: string;
  activatedModules: string[];
}

export interface BusinessModuleDefinition {
  label: string;
  path: string;
  desc: string;
  icon: string;
  badge?: string;
}

export interface BusinessNavigationItem {
  label: string;
  path: string;
  icon: string;
}

export type ContextualModuleCode = 'appointments' | 'products' | 'inventory' | 'contacts';

const CORE_MODULES = ['pos', 'inventory', 'contacts'];

export const BUSINESS_TYPES: BusinessTypeDefinition[] = [
  {
    code: 'gastronomy',
    name: 'Gastronomía',
    fullName: 'Gastronomía (Restaurantes, Cafeterías)',
    description: 'Mesas, comandas digitales, mozos y despacho de cocina.',
    icon: 'Utensils',
    color: 'text-amber-400 border-amber-500/20',
    activatedModules: [...CORE_MODULES, 'gastronomy_tables'],
  },
  {
    code: 'retail_apparel',
    name: 'Tienda de Ropa / Indumentaria',
    fullName: 'Tienda de Ropa / Indumentaria',
    description: 'Variantes de talles, colores y control de stock multisucursal.',
    icon: 'Shirt',
    color: 'text-indigo-400 border-indigo-500/20',
    activatedModules: [...CORE_MODULES, 'retail_variants'],
  },
  {
    code: 'healthcare',
    name: 'Consultorio / Salud',
    fullName: 'Consultorio Médico / Salud / Estética',
    description: 'Agenda de turnos por profesional e historias clínicas digitales.',
    icon: 'Calendar',
    color: 'text-cyan-400 border-cyan-500/20',
    activatedModules: [...CORE_MODULES, 'appointments', 'clinical_records'],
  },
  {
    code: 'supermarket',
    name: 'Supermercado / Almacén',
    fullName: 'Supermercados / Minimarket',
    description: 'Control de góndola y ventas rápidas por escáner de código de barras.',
    icon: 'Package',
    color: 'text-emerald-400 border-emerald-500/20',
    activatedModules: [...CORE_MODULES, 'barcode_scanner', 'loyalty'],
  },
  {
    code: 'hardware_store',
    name: 'Ferretería / Insumos',
    fullName: 'Ferretería / Materiales',
    description: 'Control de insumos pesados, herramientas y despacho de materiales.',
    icon: 'Settings',
    color: 'text-orange-400 border-orange-500/20',
    activatedModules: [...CORE_MODULES, 'supplier_accounts'],
  },
  {
    code: 'automotive',
    name: 'Taller Mecánico / Repuestos',
    fullName: 'Taller Mecánico / Repuestos',
    description: 'Órdenes de trabajo, repuestos, asignación de mecánicos y POS.',
    icon: 'Wrench',
    color: 'text-blue-400 border-blue-500/20',
    activatedModules: [...CORE_MODULES, 'work_orders', 'vehicle_records'],
  },
  {
    code: 'beauty_salon',
    name: 'Peluquería / Salón de Belleza',
    fullName: 'Peluquería / Salón de Belleza',
    description: 'Turnos dinámicos por estilista y cobro por servicios POS.',
    icon: 'Scissors',
    color: 'text-pink-400 border-pink-500/20',
    activatedModules: [...CORE_MODULES, 'stylist_agenda'],
  },
  {
    code: 'gym',
    name: 'Gimnasio / Deportes',
    fullName: 'Gimnasio / Actividad Física',
    description: 'Control de membresías de socios y molinetes de entrada.',
    icon: 'Activity',
    color: 'text-rose-400 border-rose-500/20',
    activatedModules: [...CORE_MODULES, 'memberships', 'access_control'],
  },
  {
    code: 'electronics',
    name: 'Tecnología / Computación',
    fullName: 'Tecnología / Electrodomésticos',
    description: 'Control de números de serie, repuestos y garantías oficiales.',
    icon: 'Laptop',
    color: 'text-sky-400 border-sky-500/20',
    activatedModules: [...CORE_MODULES, 'serial_numbers', 'warranties'],
  },
  {
    code: 'professional_services',
    name: 'Servicios Profesionales',
    fullName: 'Servicios Profesionales',
    description: 'Honorarios, horas facturables y expedientes de clientes.',
    icon: 'Briefcase',
    color: 'text-teal-400 border-teal-500/20',
    activatedModules: [...CORE_MODULES, 'billable_hours', 'case_files'],
  },
  {
    code: 'pet_shop',
    name: 'Pet Shop / Veterinaria',
    fullName: 'Pet Shop / Veterinaria',
    description: 'Historias clínicas de mascotas y turnos de atención animal.',
    icon: 'Heart',
    color: 'text-red-400 border-red-500/20',
    activatedModules: [...CORE_MODULES, 'pet_records', 'vet_agenda'],
  },
  {
    code: 'real_estate',
    name: 'Inmobiliaria / Propiedades',
    fullName: 'Inmobiliaria / Propiedades',
    description: 'Gestión de alquileres, contratos, expensas y catálogo de propiedades.',
    icon: 'HomeIcon',
    color: 'text-yellow-400 border-yellow-500/20',
    activatedModules: [...CORE_MODULES, 'leases', 'property_catalog'],
  },
  {
    code: 'hotel_hospitality',
    name: 'Hotelería / Hospedaje',
    fullName: 'Hotelería / Hospedaje',
    description: 'Reservas de habitaciones, check-in, check-out y recepción.',
    icon: 'Key',
    color: 'text-purple-400 border-purple-500/20',
    activatedModules: [...CORE_MODULES, 'room_reservations', 'guest_records'],
  },
  {
    code: 'education',
    name: 'Educación / Academias',
    fullName: 'Educación / Colegios / Academias',
    description: 'Matrículas de alumnos, calendario escolar y cobro de cuotas.',
    icon: 'GraduationCap',
    color: 'text-violet-400 border-violet-500/20',
    activatedModules: [...CORE_MODULES, 'student_records', 'school_calendar'],
  },
  {
    code: 'laundry_dryclean',
    name: 'Tintorería / Lavadero',
    fullName: 'Tintorería / Lavandería',
    description: 'Recepción de prendas, control de estado de lavado y cobros.',
    icon: 'Clock',
    color: 'text-slate-400 border-slate-500/20',
    activatedModules: [...CORE_MODULES, 'garment_tracking'],
  },
];

export const BUSINESS_MODULES: Record<BusinessTypeCode, BusinessModuleDefinition[]> = {
  gastronomy: [
    { label: 'Salón y comandas', path: '/rubros/gastronomy#salon', desc: 'Mesas, mozos y cocina en tiempo real', icon: 'Utensils', badge: 'Exclusivo' },
    { label: 'Reservas', path: '/rubros/gastronomy?salonTab=reservations#salon', desc: 'Agenda, disponibilidad y asistencia', icon: 'Calendar', badge: 'Nuevo' },
    { label: 'Carta y precios', path: '/rubros/gastronomy#menu', desc: 'Productos, imágenes, precios y disponibilidad', icon: 'FileText', badge: 'Nuevo' },
    { label: 'Insumos y stock', path: '/rubros/gastronomy#ingredients', desc: 'Materias primas, proveedores y reposición', icon: 'Package', badge: 'Nuevo' },
    { label: 'Recetas y costos', path: '/rubros/gastronomy#recipes', desc: 'Consumos, costos y margen por plato', icon: 'Layers', badge: 'Nuevo' },
    { label: 'Compras y proveedores', path: '/rubros/gastronomy#purchases', desc: 'Ordenes, recepciones parciales y costos', icon: 'RefreshCw', badge: 'Nuevo' },
    { label: 'Caja y cierres', path: '/rubros/gastronomy?salonTab=cash#salon', desc: 'Apertura, pagos, propinas y arqueo', icon: 'CreditCard', badge: 'Nuevo' },
    { label: 'Reportes gerenciales', path: '/rubros/gastronomy?salonTab=reports#salon', desc: 'Ventas, pagos, propinas y productos', icon: 'Activity', badge: 'Nuevo' },
    { label: 'Ventas POS', path: '/pos', desc: 'Cobrar consumiciones de mesas', icon: 'Play' },
    { label: 'Historial Facturación', path: '/billing', desc: 'Emitir ticket/factura fiscal', icon: 'CreditCard' },
  ],
  retail_apparel: [
    { label: 'Catálogo de Ropa', path: '/rubros/retail_apparel#catalog', desc: 'Alta de prendas con talles/colores', icon: 'Shirt', badge: 'Exclusivo' },
    { label: 'Ventas POS', path: '/pos', desc: 'Cobro rápido por código de barras', icon: 'Play' },
    { label: 'Stock multisucursal', path: '/inventory', desc: 'Control de inventario por locales', icon: 'Layers' },
    { label: 'Facturación ARCA', path: '/billing', desc: 'Facturación oficial CAE', icon: 'CreditCard' },
    { label: 'Probador Virtual IA', path: '/rubros/retail_apparel#fitting', desc: 'Recomendador de talles inteligente', icon: 'Sparkles', badge: 'Nuevo' },
    { label: 'Cambios & Devoluciones', path: '/rubros/retail_apparel#returns', desc: 'Logística inversa y nota de crédito', icon: 'RefreshCw', badge: 'Nuevo' },
    { label: 'Diseño de Colección', path: '/rubros/retail_apparel#collections', desc: 'Temporadas y descuentos globales', icon: 'Layers', badge: 'Nuevo' },
    { label: 'Club de Puntos', path: '/rubros/retail_apparel#loyalty', desc: 'Fidelización y premios VIP', icon: 'Heart', badge: 'Nuevo' },
  ],
  healthcare: [
    { label: 'Agenda de Turnos', path: '/appointments', desc: 'Turnos médicos por profesional', icon: 'Calendar', badge: 'Exclusivo' },
    { label: 'Historias Clínicas', path: '/contacts', desc: 'Pacientes y fichas médicas', icon: 'Users' },
    { label: 'Cobros POS', path: '/pos', desc: 'Facturación de consultas', icon: 'Play' },
    { label: 'Facturación ARCA', path: '/billing', desc: 'Facturación oficial CAE', icon: 'CreditCard' },
  ],
  supermarket: [
    { label: 'Caja POS Rápida', path: '/rubros/supermarket#pos', desc: 'Escanear productos, promociones y cobros', icon: 'Play', badge: 'Exclusivo' },
    { label: 'Catálogo y precios', path: '/rubros/supermarket#catalog', desc: 'Productos, imágenes, EAN y promociones', icon: 'FileText', badge: 'Nuevo' },
    { label: 'Stock y reposición', path: '/rubros/supermarket#inventory', desc: 'Existencias, mínimos y compra sugerida', icon: 'Package', badge: 'Nuevo' },
    { label: 'Compras a proveedores', path: '/rubros/supermarket#purchases', desc: 'Órdenes y recepción de mercadería', icon: 'RefreshCw', badge: 'Nuevo' },
    { label: 'Lotes y vencimientos', path: '/rubros/supermarket#lots', desc: 'Trazabilidad FEFO y alertas de merma', icon: 'Clock', badge: 'Nuevo' },
    { label: 'Fidelización Clientes', path: '/contacts', desc: 'Control de puntos y descuentos', icon: 'Users' },
    { label: 'Facturación ARCA', path: '/billing', desc: 'Ticket fiscal con CAE', icon: 'CreditCard' },
  ],
  hardware_store: [
    { label: 'Cotizador y repartos', path: '/rubros/hardware_store#operation', desc: 'Presupuestos, remitos y seguimiento', icon: 'Wrench', badge: 'Exclusivo' },
    { label: 'Catálogo técnico', path: '/rubros/hardware_store#catalog', desc: 'Imágenes, SKU, unidades, peso y precios', icon: 'FileText', badge: 'Nuevo' },
    { label: 'Stock y transferencias', path: '/rubros/hardware_store#stock', desc: 'Depósito, mostrador y mercadería en reparto', icon: 'Layers', badge: 'Nuevo' },
    { label: 'Compras de materiales', path: '/rubros/hardware_store#purchases', desc: 'Órdenes y recepción al depósito', icon: 'RefreshCw', badge: 'Nuevo' },
    { label: 'Proveedores y cuentas', path: '/rubros/hardware_store#suppliers', desc: 'Saldos, pagos y límites de crédito', icon: 'Users', badge: 'Nuevo' },
    { label: 'Mostrador POS', path: '/pos', desc: 'Ventas rápidas y facturación', icon: 'Play' },
    { label: 'Facturación ARCA', path: '/billing', desc: 'Factura oficial con CAE', icon: 'CreditCard' },
  ],
  automotive: [
    { label: 'Órdenes de taller', path: '/rubros/automotive#workshop', desc: 'Diagnóstico, presupuesto y reparación', icon: 'Wrench', badge: 'Exclusivo' },
    { label: 'Repuestos y stock', path: '/rubros/automotive#parts', desc: 'Imágenes, compatibilidad, precios y existencias', icon: 'Settings', badge: 'Nuevo' },
    { label: 'Compras de repuestos', path: '/rubros/automotive#purchases', desc: 'Órdenes y recepción al inventario', icon: 'RefreshCw', badge: 'Nuevo' },
    { label: 'Inspecciones de ingreso', path: '/rubros/automotive#inspections', desc: 'Checklist, daños y evidencia fotográfica', icon: 'FileCheck', badge: 'Nuevo' },
    { label: 'Mantenimiento preventivo', path: '/rubros/automotive#maintenance', desc: 'Próximos servicios y recordatorios', icon: 'Calendar', badge: 'Nuevo' },
    { label: 'Repuestos POS', path: '/pos', desc: 'Ventas de repuestos y mano de obra', icon: 'Play' },
    { label: 'Facturación ARCA', path: '/billing', desc: 'Facturación oficial CAE', icon: 'CreditCard' },
  ],
  beauty_salon: [
    { label: 'Agenda y caja', path: '/rubros/beauty_salon#agenda', desc: 'Turnos, señas, cobros y fichas técnicas', icon: 'Calendar', badge: 'Exclusivo' },
    { label: 'Servicios', path: '/rubros/beauty_salon#services', desc: 'Duración, costos, precios y disponibilidad', icon: 'Scissors', badge: 'Nuevo' },
    { label: 'Productos e insumos', path: '/rubros/beauty_salon#products', desc: 'Imágenes, stock, venta y consumo interno', icon: 'Package', badge: 'Nuevo' },
    { label: 'Fórmulas y consumos', path: '/rubros/beauty_salon#formulas', desc: 'Recetas técnicas y descuento automático', icon: 'Layers', badge: 'Nuevo' },
    { label: 'Equipo y comisiones', path: '/rubros/beauty_salon#team', desc: 'Porcentajes y liquidaciones', icon: 'Users', badge: 'Nuevo' },
    { label: 'Paquetes y membresías', path: '/rubros/beauty_salon#packages', desc: 'Sesiones prepagas y vencimientos', icon: 'Heart', badge: 'Nuevo' },
    { label: 'Servicios & POS', path: '/pos', desc: 'Cobro rápido de servicios y productos', icon: 'Play' },
    { label: 'Fichas Clientes', path: '/contacts', desc: 'Ficha de color y tratamientos', icon: 'Users' },
  ],
  gym: [
    { label: 'Membresías Socios', path: '/contacts', desc: 'Control de socios y cuotas', icon: 'Activity', badge: 'Exclusivo' },
    { label: 'Cobro de Cuota POS', path: '/pos', desc: 'Factura rápida de cuota mensual', icon: 'Play' },
    { label: 'Control de Accesos', path: '/inventory', desc: 'Fichas de molinete y accesos', icon: 'ShieldCheck' },
  ],
  electronics: [
    { label: 'POS Tecnología', path: '/pos', desc: 'Venta de hardware y tecnología', icon: 'Play' },
    { label: 'Números de Serie', path: '/inventory', desc: 'Trazabilidad de números de serie (NS)', icon: 'Settings', badge: 'Exclusivo' },
    { label: 'Garantías', path: '/products', desc: 'Fichas de productos con garantía', icon: 'Settings' },
    { label: 'Facturación ARCA', path: '/billing', desc: 'Facturación oficial CAE', icon: 'CreditCard' },
  ],
  professional_services: [
    { label: 'Horas Facturables', path: '/appointments', desc: 'Control de horas de consultoría', icon: 'Clock', badge: 'Exclusivo' },
    { label: 'Cobro Honorarios POS', path: '/pos', desc: 'Facturación de servicios profesionales', icon: 'Play' },
    { label: 'Expedientes Clientes', path: '/contacts', desc: 'Base de datos de expedientes', icon: 'FileText' },
  ],
  pet_shop: [
    { label: 'Turnos de Peluquería/Vet', path: '/appointments', desc: 'Agenda veterinaria', icon: 'Calendar', badge: 'Exclusivo' },
    { label: 'Venta de Alimento POS', path: '/pos', desc: 'Cobros rápidos en mostrador', icon: 'Play' },
    { label: 'Fichas Mascotas', path: '/contacts', desc: 'Historia clínica de la mascota', icon: 'Heart' },
  ],
  real_estate: [
    { label: 'Alquileres & Contratos', path: '/appointments', desc: 'Control de contratos y vencimientos', icon: 'FileCheck', badge: 'Exclusivo' },
    { label: 'Cobro de Alquiler POS', path: '/pos', desc: 'Emisión de recibo y expensas', icon: 'Play' },
    { label: 'Propiedades', path: '/products', desc: 'Catálogo de inmuebles en alquiler/venta', icon: 'HomeIcon' },
  ],
  hotel_hospitality: [
    { label: 'Reservas Habitaciones', path: '/appointments', desc: 'Calendario de ocupación', icon: 'Calendar', badge: 'Exclusivo' },
    { label: 'Recepción POS', path: '/pos', desc: 'Check-in y cobro de estadía', icon: 'Key' },
    { label: 'Fichas Huéspedes', path: '/contacts', desc: 'Historial de alojamiento', icon: 'Users' },
  ],
  education: [
    { label: 'Matrículas Alumnos', path: '/contacts', desc: 'Fichas de alumnos y cursos', icon: 'GraduationCap', badge: 'Exclusivo' },
    { label: 'Cobro Matrícula POS', path: '/pos', desc: 'Cobros de cuota escolar', icon: 'Play' },
    { label: 'Calendario Escolar', path: '/appointments', desc: 'Eventos y clases', icon: 'Calendar' },
  ],
  laundry_dryclean: [
    { label: 'Recepción Ropa POS', path: '/pos', desc: 'Carga de prendas a lavar', icon: 'Shirt', badge: 'Exclusivo' },
    { label: 'Estado de Lavado', path: '/inventory', desc: 'Prendas listas para entrega', icon: 'Clock' },
    { label: 'Fichas Clientes', path: '/contacts', desc: 'Clientes recurrentes', icon: 'Users' },
  ],
};

export const BUSINESS_NAVIGATION: Record<BusinessTypeCode, BusinessNavigationItem[]> = {
  gastronomy: [
    { label: 'Resumen', path: '/rubros/gastronomy', icon: 'LayoutDashboard' },
    { label: 'Salón', path: '/rubros/gastronomy#salon', icon: 'Utensils' },
    { label: 'Carta', path: '/rubros/gastronomy#menu', icon: 'FileText' },
    { label: 'Insumos', path: '/rubros/gastronomy#ingredients', icon: 'Package' },
    { label: 'Compras', path: '/rubros/gastronomy#purchases', icon: 'Building' },
  ],
  retail_apparel: [
    { label: 'Resumen', path: '/rubros/retail_apparel', icon: 'LayoutDashboard' },
    { label: 'Catálogo', path: '/rubros/retail_apparel#catalog', icon: 'Shirt' },
    { label: 'Probador', path: '/rubros/retail_apparel#fitting', icon: 'Sparkles' },
    { label: 'Devoluciones', path: '/rubros/retail_apparel#returns', icon: 'RefreshCw' },
    { label: 'Club de puntos', path: '/rubros/retail_apparel#loyalty', icon: 'Heart' },
  ],
  healthcare: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Agenda de Turnos', path: '/appointments', icon: 'Calendar' },
    { label: 'Cobros POS', path: '/pos', icon: 'DollarSign' },
    { label: 'Fichas Pacientes', path: '/contacts', icon: 'UserSquare' },
  ],
  supermarket: [
    { label: 'Resumen', path: '/rubros/supermarket', icon: 'LayoutDashboard' },
    { label: 'Caja POS', path: '/rubros/supermarket#pos', icon: 'DollarSign' },
    { label: 'Catálogo', path: '/rubros/supermarket#catalog', icon: 'Package' },
    { label: 'Stock', path: '/rubros/supermarket#inventory', icon: 'Grid' },
    { label: 'Lotes', path: '/rubros/supermarket#lots', icon: 'Clock' },
  ],
  hardware_store: [
    { label: 'Resumen', path: '/rubros/hardware_store', icon: 'LayoutDashboard' },
    { label: 'Mostrador', path: '/rubros/hardware_store#operation', icon: 'DollarSign' },
    { label: 'Catálogo', path: '/rubros/hardware_store#catalog', icon: 'HardHat' },
    { label: 'Stock', path: '/rubros/hardware_store#stock', icon: 'Grid' },
    { label: 'Proveedores', path: '/rubros/hardware_store#suppliers', icon: 'Building' },
  ],
  automotive: [
    { label: 'Resumen', path: '/rubros/automotive', icon: 'LayoutDashboard' },
    { label: 'Taller', path: '/rubros/automotive#workshop', icon: 'Wrench' },
    { label: 'Repuestos', path: '/rubros/automotive#parts', icon: 'Settings' },
    { label: 'Inspecciones', path: '/rubros/automotive#inspections', icon: 'FileCheck' },
    { label: 'Mantenimiento', path: '/rubros/automotive#maintenance', icon: 'Calendar' },
  ],
  beauty_salon: [
    { label: 'Resumen', path: '/rubros/beauty_salon', icon: 'LayoutDashboard' },
    { label: 'Agenda', path: '/rubros/beauty_salon#agenda', icon: 'Calendar' },
    { label: 'Servicios', path: '/rubros/beauty_salon#services', icon: 'Scissors' },
    { label: 'Productos', path: '/rubros/beauty_salon#products', icon: 'Package' },
    { label: 'Equipo', path: '/rubros/beauty_salon#team', icon: 'Users' },
  ],
  gym: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Membresías', path: '/contacts', icon: 'Activity' },
    { label: 'Cobro Cuotas (POS)', path: '/pos', icon: 'DollarSign' },
    { label: 'Acceso Molinetes', path: '/inventory', icon: 'Shield' },
  ],
  electronics: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'POS Tecnología', path: '/pos', icon: 'Laptop' },
    { label: 'Control de NS (Números Serie)', path: '/inventory', icon: 'Barcode' },
    { label: 'Proveedores Electrónicos', path: '/contacts', icon: 'Users' },
  ],
  professional_services: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Horas Facturables', path: '/appointments', icon: 'Clock' },
    { label: 'Honorarios & POS', path: '/pos', icon: 'FileText' },
    { label: 'Expedientes Clientes', path: '/contacts', icon: 'Briefcase' },
  ],
  pet_shop: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Turnos Veterinaria', path: '/appointments', icon: 'Calendar' },
    { label: 'Venta Alimento (POS)', path: '/pos', icon: 'DollarSign' },
    { label: 'Fichas Mascotas', path: '/contacts', icon: 'Heart' },
  ],
  real_estate: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Alquileres & Contratos', path: '/appointments', icon: 'FileCheck' },
    { label: 'Cobro de Expensas', path: '/pos', icon: 'DollarSign' },
    { label: 'Propiedades / Catálogo', path: '/products', icon: 'Home' },
  ],
  hotel_hospitality: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Reservas Habitaciones', path: '/appointments', icon: 'CalendarDays' },
    { label: 'Recepción (POS)', path: '/pos', icon: 'Key' },
    { label: 'Fichas Huéspedes', path: '/contacts', icon: 'Users' },
  ],
  education: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Matrículas de Alumnos', path: '/contacts', icon: 'GraduationCap' },
    { label: 'Cobro Cuotas (POS)', path: '/pos', icon: 'DollarSign' },
    { label: 'Calendario Escolar', path: '/appointments', icon: 'Calendar' },
  ],
  laundry_dryclean: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Recepción de Ropa (POS)', path: '/pos', icon: 'Shirt' },
    { label: 'Estado de Lavado', path: '/inventory', icon: 'Clock' },
    { label: 'Fichas Clientes', path: '/contacts', icon: 'Users' },
  ],
};

export const BUSINESS_CONTEXT_MODULES: Record<ContextualModuleCode, readonly BusinessTypeCode[]> = {
  appointments: ['healthcare', 'automotive', 'beauty_salon', 'professional_services', 'pet_shop', 'real_estate', 'hotel_hospitality', 'education'],
  products: ['gastronomy', 'retail_apparel', 'supermarket', 'hardware_store', 'automotive', 'beauty_salon', 'electronics', 'pet_shop', 'real_estate'],
  inventory: ['gastronomy', 'retail_apparel', 'supermarket', 'hardware_store', 'automotive', 'beauty_salon', 'gym', 'electronics', 'pet_shop', 'laundry_dryclean'],
  contacts: ['gastronomy', 'retail_apparel', 'healthcare', 'supermarket', 'hardware_store', 'automotive', 'beauty_salon', 'gym', 'professional_services', 'pet_shop', 'real_estate', 'hotel_hospitality', 'education', 'laundry_dryclean'],
};

export function isBusinessTypeCode(code: string): code is BusinessTypeCode {
  return BUSINESS_TYPES.some((businessType) => businessType.code === code);
}

export function resolveBusinessTypeCode(code: string | string[] | null | undefined): BusinessTypeCode | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  return value && isBusinessTypeCode(value) ? value : undefined;
}

export function getBusinessType(code: BusinessTypeCode): BusinessTypeDefinition {
  const businessType = BUSINESS_TYPES.find((candidate) => candidate.code === code);
  if (!businessType) throw new Error(`Business type is not registered: ${code}`);
  return businessType;
}

export function getBusinessModules(code: BusinessTypeCode): BusinessModuleDefinition[] {
  return BUSINESS_MODULES[code];
}

export function getBusinessModuleCount(code: BusinessTypeCode): number {
  return getBusinessModules(code).length;
}

export function getBusinessNavigation(code: BusinessTypeCode): BusinessNavigationItem[] {
  return BUSINESS_NAVIGATION[code];
}

export function getActivatedModuleCodes(code: BusinessTypeCode): string[] {
  return getBusinessType(code).activatedModules;
}

export function isContextualModuleSupported(code: BusinessTypeCode, module: ContextualModuleCode): boolean {
  return BUSINESS_CONTEXT_MODULES[module].includes(code);
}
