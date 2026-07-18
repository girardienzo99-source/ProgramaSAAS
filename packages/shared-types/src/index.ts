// Tipos de Negocio
export interface BusinessType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

// Planes de Suscripción
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_period: 'monthly' | 'yearly';
  max_branches: number;
  max_users: number;
  features: Record<string, any>;
  created_at: string;
}

// Empresas (Tenants)
export interface Company {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null; // CUIT/CUIL
  tax_condition: 'Responsable Inscripto' | 'Monotributo' | 'Exento' | 'Consumidor Final' | string | null;
  business_type_id: string;
  plan_id: string;
  status: 'active' | 'suspended' | 'trial' | string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Sucursales
export interface Branch {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_main: boolean;
  arca_punto_venta: number | null;
  created_at: string;
  updated_at: string;
}

// Módulos
export interface Module {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_core: boolean;
  dependencies: string[];
  created_at: string;
}

// Módulos Activos por Empresa
export interface CompanyModule {
  id: string;
  company_id: string;
  module_id: string;
  is_active: boolean;
  settings: Record<string, any>;
  activated_at: string;
}

// Roles
export interface Role {
  id: string;
  company_id: string | null; // NULL para roles del sistema globales
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

// Permisos
export interface Permission {
  id: string;
  module_id: string;
  name: string; // ej. 'sales.create'
  description: string | null;
  created_at: string;
}

// Relación Usuario-Empresa
export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role_id: string;
  active: boolean;
  main_branch_id: string | null;
  created_at: string;
}

// Clientes
export interface Client {
  id: string;
  company_id: string;
  name: string;
  tax_id: string | null;
  tax_condition: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

// Proveedores
export interface Provider {
  id: string;
  company_id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  contact_name: string | null;
  created_at: string;
}

// Catálogo de Productos y Servicios
export interface Product {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  vat_rate: number; // ej: 21.00
  is_service: boolean;
  stock_control: boolean;
  image_url: string | null;
  extra_attributes: Record<string, any>; // Atributos específicos por rubro (talles, colores, etc.)
  created_at: string;
  updated_at: string;
}

// Gestión de Stock
export interface Stock {
  id: string;
  company_id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
  min_stock: number | null;
  location: string | null;
}

// Movimientos de Stock
export interface StockMovement {
  id: string;
  company_id: string;
  stock_id: string;
  user_id: string;
  quantity: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'sale' | 'purchase';
  notes: string | null;
  created_at: string;
}

// Gestión de Cajas
export interface Caja {
  id: string;
  company_id: string;
  branch_id: string;
  name: string;
  status: 'open' | 'closed';
  opened_at: string | null;
  closed_at: string | null;
  opened_by: string | null;
  closed_by: string | null;
  opening_balance: number;
  closing_balance: number;
  created_at: string;
}

// Movimientos de Caja
export interface CajaMovement {
  id: string;
  company_id: string;
  caja_id: string;
  amount: number;
  type: 'cash_in' | 'cash_out' | 'sale_payment' | 'purchase_payment' | string;
  payment_method: 'cash' | 'transfer' | 'card' | 'mercadopago' | string;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

// Ventas
export interface Sale {
  id: string;
  company_id: string;
  branch_id: string;
  caja_id: string;
  client_id: string | null;
  user_id: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'multiple' | string;
  status: 'completed' | 'pending' | 'cancelled' | string;
  created_at: string;
}

// Ítems de Venta
export interface SaleItem {
  id: string;
  company_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  subtotal: number;
  created_at: string;
}

// Facturas (ARCA)
export interface Invoice {
  id: string;
  company_id: string;
  sale_id: string;
  invoice_type: 'FA' | 'FB' | 'FC' | 'NCA' | 'NCB' | 'NCC' | string;
  punto_venta: number;
  cbte_number: number;
  cae: string | null;
  cae_due_date: string | null;
  arca_status: 'pending' | 'approved' | 'rejected' | 'error' | string;
  arca_error_msg: string | null;
  arca_payload: Record<string, any> | null;
  arca_response: Record<string, any> | null;
  created_at: string;
}

// Auditoría
export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  target_table: string;
  target_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

// Logs de Errores del Sistema
export interface SystemErrorLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  endpoint: string | null;
  payload: Record<string, any> | null;
  created_at: string;
}

// Suscripciones de Empresa
export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'suspended' | 'canceled' | 'trial' | string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

// API Keys
export interface CompanyApiKey {
  id: string;
  company_id: string;
  name: string;
  prefix: string;
  key_hash: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

// Webhooks Configurados
export interface CompanyWebhook {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

// Logs de Envío de Webhooks
export interface WebhookDeliveryLog {
  id: string;
  company_id: string;
  webhook_id: string;
  event_type: string;
  url: string;
  payload: Record<string, any>;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  duration_ms: number;
  attempt: number;
  created_at: string;
}

// Tickets de Soporte
export interface SupportTicket {
  id: string;
  company_id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  created_at: string;
  updated_at: string;
}

// Respuestas de Tickets
export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  is_staff: boolean;
  message: string;
  created_at: string;
}

// Notificaciones del Tenant
export interface TenantNotification {
  id: string;
  company_id: string;
  title: string;
  message: string;
  type: 'billing' | 'support' | 'system' | 'limit_warning' | string;
  is_read: boolean;
  created_at: string;
}

// Rubros Comerciales para catálogos y presets operativos
export interface BusinessTypeCatalogEntry {
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

// Módulos por Rubro
export interface BusinessTypeModule {
  business_type_code: string;
  module_code: string;
  is_required: boolean;
}

// Presets por Rubro
export interface BusinessTypePreset {
  id: string;
  business_type_code: string;
  preset_type: 'category' | 'tax_rate' | 'default_role' | string;
  name: string;
  value: Record<string, any>;
  created_at: string;
}

// Importador de Datos
export interface DataImport {
  id: string;
  company_id: string;
  user_id: string;
  file_name: string;
  target_type: 'products' | 'clients' | 'stock' | string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back' | string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  error_summary: Record<string, any> | null;
  created_at: string;
}

// Feature Flags
export interface CompanyFeatureFlag {
  id: string;
  company_id: string;
  flag_name: string;
  is_enabled: boolean;
  created_at: string;
}

// Versiones de Módulos
export interface ModuleSchemaVersion {
  module_code: string;
  version: string;
  updated_at: string;
}

// Métricas de Uso
export interface CompanyUsageMetric {
  id: string;
  company_id: string;
  metric_name: 'api_calls' | 'pos_transactions' | 'db_size_bytes' | string;
  metric_value: number;
  logged_at: string;
}

// Configuración de Marca Blanca
export interface CompanyBrandingConfig {
  id: string;
  company_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  dashboard_layout: Record<string, any>;
  created_at: string;
}
