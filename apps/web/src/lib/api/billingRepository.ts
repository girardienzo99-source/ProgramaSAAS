import 'server-only';

import { ApiError, isUuid } from './core';
import { listGastronomySettlements } from './gastronomyRepository';
import type { TenantContext } from './tenant';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

export type BillingInvoiceStatus =
  | 'draft'
  | 'authorizing'
  | 'authorized'
  | 'observed'
  | 'rejected'
  | 'uncertain'
  | 'cancelled';

export interface BillingInvoiceItemRecord {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export interface BillingInvoiceRecord {
  id: string;
  saleId: string;
  settlementId: string | null;
  businessTypeCode: string;
  invoiceType: 'FA' | 'FB' | 'FC';
  pointOfSale: number;
  voucherNumber: number | null;
  status: BillingInvoiceStatus;
  environment: 'homologacion' | 'produccion';
  recipientName: string;
  recipientDocumentType: string;
  recipientDocumentNumber: string;
  recipientVatCondition: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  cae: string | null;
  caeDueDate: string | null;
  qrUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  items: BillingInvoiceItemRecord[];
}

export interface BillingPendingSaleRecord {
  saleId: string;
  settlementId: string | null;
  reference: string;
  total: number;
  tipAmount: number;
  createdAt: string;
}

export interface BillingConfigSummary {
  configured: boolean;
  environment: 'homologacion' | 'produccion';
  pointOfSale: number;
  cuitMasked: string;
  authorizationMethod: 'CAE' | 'CAEA';
  missing: string[];
}

export interface BillingDashboardRecord {
  invoices: BillingInvoiceRecord[];
  pendingSales: BillingPendingSaleRecord[];
  config: BillingConfigSummary;
}

export interface PrepareBillingInvoiceInput {
  saleId: string;
  settlementId?: string;
  invoiceType: 'FA' | 'FB' | 'FC';
  recipientName: string;
  recipientDocumentType: '99' | 'DNI' | 'CUIT' | 'CUIL';
  recipientDocumentNumber: string;
  recipientVatCondition: string;
  idempotencyKey: string;
}

interface DatabaseInvoice {
  id: string;
  sale_id: string;
  settlement_id: string | null;
  business_type_code: string | null;
  invoice_type: 'FA' | 'FB' | 'FC';
  punto_venta: number;
  cbte_number: number | null;
  arca_status: BillingInvoiceStatus;
  environment: 'homologacion' | 'produccion';
  recipient_name: string | null;
  recipient_document_type: string;
  recipient_document_number: string;
  recipient_vat_condition: string;
  cae: string | null;
  cae_due_date: string | null;
  qr_url: string | null;
  arca_error_msg: string | null;
  arca_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface DatabaseInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  net_amount: number | string;
  vat_rate: number | string;
  vat_amount: number | string;
  total_amount: number | string;
}

const billingGlobal = globalThis as typeof globalThis & {
  __programaSassBillingInvoices?: Map<string, BillingInvoiceRecord[]>;
};
const localInvoices = billingGlobal.__programaSassBillingInvoices ?? new Map<string, BillingInvoiceRecord[]>();
if (process.env.NODE_ENV !== 'production') billingGlobal.__programaSassBillingInvoices = localInvoices;

function maskCuit(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return 'Sin configurar';
  return `${digits.slice(0, 2)}-*****${digits.slice(-4, -1)}-${digits.slice(-1)}`;
}

function localConfigSummary(): BillingConfigSummary {
  const cuit = process.env.ARCA_CUIT;
  const pointOfSale = Number(process.env.ARCA_POINT_OF_SALE ?? 0);
  const certificate = process.env.ARCA_CERTIFICATE_PEM;
  const privateKey = process.env.ARCA_PRIVATE_KEY_PEM;
  const environment = process.env.ARCA_ENVIRONMENT === 'produccion' ? 'produccion' : 'homologacion';
  const missing = [
    !cuit && 'CUIT',
    !Number.isInteger(pointOfSale) || pointOfSale < 1 ? 'punto de venta' : '',
    !certificate && 'certificado',
    !privateKey && 'clave privada',
  ].filter(Boolean) as string[];
  return {
    configured: missing.length === 0,
    environment,
    pointOfSale,
    cuitMasked: maskCuit(cuit),
    authorizationMethod: 'CAE',
    missing,
  };
}

export async function getBillingConfigSummary(companyId: string): Promise<BillingConfigSummary> {
  if (!isServerSupabaseAdminConfigured) return localConfigSummary();
  const { data, error } = await createAdminServerClient()
    .from('company_arca_configs')
    .select('cuit, environment, point_of_sale, authorization_method, certificate_secret_ref, private_key_secret_ref, certificate_text, private_key_text')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError(503, 'No se pudo consultar la configuracion fiscal.', 'BILLING_CONFIG_UNAVAILABLE');
  if (!data) return { ...localConfigSummary(), missing: ['configuracion fiscal'], configured: false };
  const certificateAvailable = Boolean(data.certificate_secret_ref || data.certificate_text);
  const privateKeyAvailable = Boolean(data.private_key_secret_ref || data.private_key_text);
  const missing = [
    !data.cuit && 'CUIT',
    Number(data.point_of_sale) < 1 ? 'punto de venta' : '',
    !certificateAvailable && 'certificado',
    !privateKeyAvailable && 'clave privada',
  ].filter(Boolean) as string[];
  return {
    configured: missing.length === 0,
    environment: data.environment === 'produccion' ? 'produccion' : 'homologacion',
    pointOfSale: Number(data.point_of_sale ?? 0),
    cuitMasked: maskCuit(data.cuit),
    authorizationMethod: data.authorization_method === 'CAEA' ? 'CAEA' : 'CAE',
    missing,
  };
}

function mapInvoice(
  invoice: DatabaseInvoice,
  items: BillingInvoiceItemRecord[],
): BillingInvoiceRecord {
  const payload = invoice.arca_payload ?? {};
  return {
    id: invoice.id,
    saleId: invoice.sale_id,
    settlementId: invoice.settlement_id,
    businessTypeCode: invoice.business_type_code ?? '',
    invoiceType: invoice.invoice_type,
    pointOfSale: Number(invoice.punto_venta),
    voucherNumber: invoice.cbte_number === null ? null : Number(invoice.cbte_number),
    status: invoice.arca_status,
    environment: invoice.environment,
    recipientName: invoice.recipient_name ?? 'Consumidor final',
    recipientDocumentType: invoice.recipient_document_type,
    recipientDocumentNumber: invoice.recipient_document_number,
    recipientVatCondition: invoice.recipient_vat_condition,
    subtotal: Number(payload.subtotal ?? 0),
    taxAmount: Number(payload.taxAmount ?? 0),
    total: Number(payload.total ?? items.reduce((sum, item) => sum + item.totalAmount, 0)),
    cae: invoice.cae,
    caeDueDate: invoice.cae_due_date,
    qrUrl: invoice.qr_url,
    errorMessage: invoice.arca_error_msg,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at,
    items,
  };
}

async function productionDashboard(context: TenantContext): Promise<BillingDashboardRecord> {
  const admin = createAdminServerClient();
  const [{ data: invoiceRows, error: invoiceError }, settlements, config] = await Promise.all([
    admin
      .from('invoices')
      .select('id, sale_id, settlement_id, business_type_code, invoice_type, punto_venta, cbte_number, arca_status, environment, recipient_name, recipient_document_type, recipient_document_number, recipient_vat_condition, cae, cae_due_date, qr_url, arca_error_msg, arca_payload, created_at, updated_at')
      .eq('company_id', context.companyId)
      .eq('business_type_code', context.businessTypeCode)
      .order('created_at', { ascending: false })
      .limit(200),
    context.businessTypeCode === 'gastronomy'
      ? listGastronomySettlements({ companyId: context.companyId, branchId: context.branchId })
      : Promise.resolve([]),
    getBillingConfigSummary(context.companyId),
  ]);
  if (invoiceError) throw new ApiError(503, 'No se pudo consultar la cola fiscal.', 'BILLING_QUEUE_UNAVAILABLE');
  const invoices = (invoiceRows ?? []) as DatabaseInvoice[];
  const ids = invoices.map((invoice) => invoice.id);
  let itemRows: DatabaseInvoiceItem[] = [];
  if (ids.length) {
    const { data, error } = await admin
      .from('billing_invoice_items')
      .select('id, invoice_id, description, quantity, unit_price, net_amount, vat_rate, vat_amount, total_amount')
      .eq('company_id', context.companyId)
      .in('invoice_id', ids)
      .order('line_number');
    if (error) throw new ApiError(503, 'No se pudo consultar el detalle fiscal.', 'BILLING_ITEMS_UNAVAILABLE');
    itemRows = (data ?? []) as DatabaseInvoiceItem[];
  }
  const mapped = invoices.map((invoice) => mapInvoice(invoice, itemRows
    .filter((item) => item.invoice_id === invoice.id)
    .map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      netAmount: Number(item.net_amount),
      vatRate: Number(item.vat_rate),
      vatAmount: Number(item.vat_amount),
      totalAmount: Number(item.total_amount),
    }))));
  const linkedSales = new Set(mapped.map((invoice) => invoice.saleId));
  return {
    invoices: mapped,
    pendingSales: settlements.filter((settlement) => !linkedSales.has(settlement.saleId)).map((settlement) => ({
      saleId: settlement.saleId,
      settlementId: settlement.id,
      reference: `Cierre #${settlement.settlementNumber} - ${settlement.tableName}`,
      total: settlement.saleTotal,
      tipAmount: settlement.tipAmount,
      createdAt: settlement.createdAt,
    })),
    config,
  };
}

export async function getBillingDashboard(context: TenantContext): Promise<BillingDashboardRecord> {
  if (isServerSupabaseAdminConfigured) return productionDashboard(context);
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'La persistencia fiscal no esta configurada.', 'BILLING_PERSISTENCE_UNAVAILABLE');
  }
  const invoices = (localInvoices.get(context.companyId) ?? [])
    .filter((invoice) => invoice.businessTypeCode === context.businessTypeCode);
  const settlements = context.businessTypeCode === 'gastronomy'
    ? await listGastronomySettlements({ companyId: context.companyId, branchId: context.branchId })
    : [];
  const linkedSales = new Set(invoices.map((invoice) => invoice.saleId));
  return {
    invoices: invoices.map((invoice) => ({ ...invoice, items: invoice.items.map((item) => ({ ...item })) })),
    pendingSales: settlements.filter((settlement) => !linkedSales.has(settlement.saleId)).map((settlement) => ({
      saleId: settlement.saleId,
      settlementId: settlement.id,
      reference: `Cierre #${settlement.settlementNumber} - ${settlement.tableName}`,
      total: settlement.saleTotal,
      tipAmount: settlement.tipAmount,
      createdAt: settlement.createdAt,
    })),
    config: localConfigSummary(),
  };
}

export async function prepareBillingInvoice(
  context: TenantContext,
  input: PrepareBillingInvoiceInput,
): Promise<{ invoice: BillingInvoiceRecord; duplicate: boolean }> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.saleId) || (input.settlementId && !isUuid(input.settlementId))) {
      throw new ApiError(400, 'La venta o el cierre no son validos.', 'INVALID_BILLING_REFERENCE');
    }
    const { data, error } = await createAdminServerClient().rpc('billing_prepare_sale_invoice', {
      p_company_id: context.companyId,
      p_user_id: context.userId,
      p_business_type_code: context.businessTypeCode,
      p_sale_id: input.saleId,
      p_settlement_id: input.settlementId ?? null,
      p_invoice_type: input.invoiceType,
      p_recipient_name: input.recipientName,
      p_recipient_document_type: input.recipientDocumentType,
      p_recipient_document_number: input.recipientDocumentNumber,
      p_recipient_vat_condition: input.recipientVatCondition,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error?.message.includes('INVOICE_A_REQUIRES_CUIT')) {
      throw new ApiError(422, 'La Factura A requiere CUIT del receptor.', 'INVOICE_A_REQUIRES_CUIT');
    }
    if (error?.message.includes('SALE_NOT_FOUND')) throw new ApiError(404, 'La venta no existe.', 'SALE_NOT_FOUND');
    if (error?.message.includes('SETTLEMENT_SALE_MISMATCH')) {
      throw new ApiError(409, 'El cierre no corresponde a la venta.', 'SETTLEMENT_SALE_MISMATCH');
    }
    if (error || !data || typeof data !== 'object') {
      throw new ApiError(503, 'No se pudo preparar el comprobante.', 'BILLING_PREPARE_UNAVAILABLE');
    }
    const result = data as { invoiceId?: unknown; duplicate?: unknown };
    const dashboard = await productionDashboard(context);
    const invoice = dashboard.invoices.find((item) => item.id === result.invoiceId);
    if (!invoice) throw new ApiError(503, 'El comprobante preparado no pudo recuperarse.', 'BILLING_INVOICE_UNAVAILABLE');
    return { invoice, duplicate: result.duplicate === true };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'La persistencia fiscal no esta configurada.', 'BILLING_PERSISTENCE_UNAVAILABLE');
  }
  const allCompanyInvoices = localInvoices.get(context.companyId) ?? [];
  const current = allCompanyInvoices.filter((invoice) => invoice.businessTypeCode === context.businessTypeCode);
  const existing = current.find((invoice) => invoice.saleId === input.saleId);
  if (existing) return { invoice: existing, duplicate: true };
  if (input.invoiceType === 'FA' && input.recipientDocumentType !== 'CUIT') {
    throw new ApiError(422, 'La Factura A requiere CUIT del receptor.', 'INVOICE_A_REQUIRES_CUIT');
  }
  const dashboard = await getBillingDashboard(context);
  const sale = dashboard.pendingSales.find((item) => item.saleId === input.saleId && (!input.settlementId || item.settlementId === input.settlementId));
  if (!sale) throw new ApiError(404, 'La venta no esta disponible para facturar.', 'SALE_NOT_FOUND');
  const now = new Date().toISOString();
  const config = dashboard.config;
  const invoice: BillingInvoiceRecord = {
    id: crypto.randomUUID(),
    saleId: sale.saleId,
    settlementId: sale.settlementId,
    businessTypeCode: context.businessTypeCode,
    invoiceType: input.invoiceType,
    pointOfSale: config.pointOfSale,
    voucherNumber: null,
    status: 'draft',
    environment: config.environment,
    recipientName: input.recipientName || 'Consumidor final',
    recipientDocumentType: input.recipientDocumentType,
    recipientDocumentNumber: input.recipientDocumentNumber,
    recipientVatCondition: input.recipientVatCondition,
    subtotal: sale.total,
    taxAmount: 0,
    total: sale.total,
    cae: null,
    caeDueDate: null,
    qrUrl: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    items: [{
      id: crypto.randomUUID(),
      description: sale.reference,
      quantity: 1,
      unitPrice: sale.total,
      netAmount: sale.total,
      vatRate: 0,
      vatAmount: 0,
      totalAmount: sale.total,
    }],
  };
  localInvoices.set(context.companyId, [invoice, ...allCompanyInvoices]);
  return { invoice, duplicate: false };
}
