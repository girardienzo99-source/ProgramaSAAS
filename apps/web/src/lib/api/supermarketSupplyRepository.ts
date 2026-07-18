import { ApiError, isUuid } from './core';
import {
  listSupermarketProducts,
  listSupermarketPurchases,
  saveSupermarketPurchase,
  type SupermarketContext,
} from './supermarketRepository';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

export interface SupermarketSupplierRecord {
  id: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  leadDays: number;
  creditLimit: number;
  balance: number;
  overdueAmount: number;
  openDocuments: number;
  active: boolean;
  createdAt: string;
}

export type SupermarketSupplierInput = Omit<SupermarketSupplierRecord, 'id' | 'balance' | 'overdueAmount' | 'openDocuments' | 'createdAt'> & { id?: string };
export type SupermarketSupplierDocumentType = 'invoice' | 'credit_note' | 'payment';

export interface SupermarketSupplierDocumentRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  purchaseOrderNumber: number | null;
  documentType: SupermarketSupplierDocumentType;
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  signedAmount: number;
  expectedAmount: number | null;
  difference: number | null;
  reconciliationStatus: 'matched' | 'variance' | 'unmatched';
  notes: string;
  createdAt: string;
}

export interface SupermarketSupplierDocumentInput {
  idempotencyKey: string;
  supplierId: string;
  purchaseOrderId?: string;
  documentType: SupermarketSupplierDocumentType;
  documentNumber: string;
  issueDate: string;
  dueDate?: string;
  amount: number;
  notes: string;
}

export interface SupermarketSupplyForecastRecord {
  productId: string;
  name: string;
  category: string;
  supplierName: string;
  stock: number;
  minStock: number;
  unitsSold: number;
  averageDailySales: number;
  incomingQuantity: number;
  leadDays: number;
  daysCover: number;
  suggestedQuantity: number;
  turnoverIndex: number;
  risk: 'out_of_stock' | 'critical' | 'attention' | 'healthy';
}

export interface SupermarketPurchaseApprovalPolicy {
  enabled: boolean;
  autoApproveLimit: number;
  secondApprovalThreshold: number;
}

export type SupermarketPurchaseApprovalStatus = 'pending' | 'approved' | 'auto_approved' | 'rejected';

export interface SupermarketPurchaseApprovalRecord {
  id: string;
  orderId: string;
  orderNumber: number | null;
  supplierName: string;
  productName: string;
  amount: number;
  requiredApprovals: number;
  approvalCount: number;
  status: SupermarketPurchaseApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  resolvedAt: string | null;
  canDecide: boolean;
}

interface LocalApproval extends SupermarketPurchaseApprovalRecord { decidedBy: string[] }

interface LocalSupplyState {
  suppliers: Map<string, SupermarketSupplierRecord[]>;
  documents: Map<string, SupermarketSupplierDocumentRecord[]>;
  documentResults: Map<string, { documentId: string; duplicate: boolean; reconciliationStatus: string; difference: number | null }>;
  approvalPolicies: Map<string, SupermarketPurchaseApprovalPolicy>;
  approvals: Map<string, LocalApproval[]>;
  approvalResults: Map<string, { requestId: string; status: SupermarketPurchaseApprovalStatus; requiredApprovals: number; duplicate: boolean }>;
}

const globalWithSupply = globalThis as typeof globalThis & { __programaSassSupermarketSupply?: LocalSupplyState };
const localState: LocalSupplyState = globalWithSupply.__programaSassSupermarketSupply ?? {
  suppliers: new Map(), documents: new Map(), documentResults: new Map(),
  approvalPolicies: new Map(), approvals: new Map(), approvalResults: new Map(),
};
localState.approvalPolicies ??= new Map();
localState.approvals ??= new Map();
localState.approvalResults ??= new Map();
globalWithSupply.__programaSassSupermarketSupply = localState;

function productionBranch(context: SupermarketContext): string {
  if (!context.branchId) throw new ApiError(409, 'Debe seleccionar una sucursal.', 'BRANCH_REQUIRED');
  return context.branchId;
}

function branchKey(context: SupermarketContext) { return `${context.companyId}:${context.branchId ?? 'main'}`; }
function persistenceUnavailable(): never { throw new ApiError(503, 'La persistencia de abastecimiento no esta disponible.', 'SUPERMARKET_SUPPLY_UNAVAILABLE'); }

function mapSupplier(item: Record<string, unknown>): SupermarketSupplierRecord {
  return {
    id: String(item.id), name: String(item.name), taxId: String(item.tax_id ?? ''),
    phone: String(item.phone ?? ''), email: String(item.email ?? ''), address: String(item.address ?? ''),
    leadDays: Number(item.lead_days ?? 7), creditLimit: Number(item.credit_limit ?? 0),
    balance: Number(item.balance ?? 0), overdueAmount: Number(item.overdue_amount ?? 0),
    openDocuments: Number(item.open_documents ?? 0), active: item.active !== false,
    createdAt: String(item.created_at ?? ''),
  };
}

function mapDocument(item: Record<string, unknown>): SupermarketSupplierDocumentRecord {
  return {
    id: String(item.id), supplierId: String(item.supplier_id), supplierName: String(item.supplier_name),
    purchaseOrderId: item.purchase_order_id ? String(item.purchase_order_id) : null,
    purchaseOrderNumber: item.purchase_order_number === null ? null : Number(item.purchase_order_number),
    documentType: item.document_type as SupermarketSupplierDocumentType,
    documentNumber: String(item.document_number), issueDate: String(item.issue_date),
    dueDate: item.due_date ? String(item.due_date) : '', amount: Number(item.amount),
    signedAmount: Number(item.signed_amount), expectedAmount: item.expected_amount === null ? null : Number(item.expected_amount),
    difference: item.difference === null ? null : Number(item.difference),
    reconciliationStatus: item.reconciliation_status as SupermarketSupplierDocumentRecord['reconciliationStatus'],
    notes: String(item.notes ?? ''), createdAt: String(item.created_at ?? ''),
  };
}

function mapForecast(item: Record<string, unknown>): SupermarketSupplyForecastRecord {
  return {
    productId: String(item.product_id), name: String(item.name), category: String(item.category),
    supplierName: String(item.supplier_name ?? ''), stock: Number(item.stock), minStock: Number(item.min_stock),
    unitsSold: Number(item.units_sold), averageDailySales: Number(item.average_daily_sales),
    incomingQuantity: Number(item.incoming_quantity), leadDays: Number(item.lead_days),
    daysCover: Number(item.days_cover), suggestedQuantity: Number(item.suggested_quantity),
    turnoverIndex: Number(item.turnover_index), risk: item.risk as SupermarketSupplyForecastRecord['risk'],
  };
}

function mapApproval(item: Record<string, unknown>): SupermarketPurchaseApprovalRecord {
  return {
    id: String(item.id), orderId: String(item.order_id),
    orderNumber: item.order_number === null ? null : Number(item.order_number),
    supplierName: String(item.supplier_name), productName: String(item.product_name),
    amount: Number(item.amount), requiredApprovals: Number(item.required_approvals),
    approvalCount: Number(item.approval_count), status: item.status as SupermarketPurchaseApprovalStatus,
    requestedBy: String(item.requested_by), requestedAt: String(item.requested_at),
    resolvedAt: item.resolved_at ? String(item.resolved_at) : null, canDecide: item.can_decide === true,
  };
}

export async function listSupermarketSuppliers(context: SupermarketContext): Promise<SupermarketSupplierRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_suppliers', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar los proveedores.', 'SUPERMARKET_SUPPLIERS_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapSupplier);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const current = localState.suppliers.get(context.companyId);
  if (current) return current.map((item) => ({ ...item }));
  const names = [...new Set((await listSupermarketProducts(context)).map((item) => item.supplier).filter(Boolean))];
  const seeded = names.map((name) => ({
    id: `supplier-${crypto.randomUUID()}`, name, taxId: '', phone: '', email: '', address: '',
    leadDays: 7, creditLimit: 0, balance: 0, overdueAmount: 0, openDocuments: 0,
    active: true, createdAt: new Date().toISOString(),
  }));
  localState.suppliers.set(context.companyId, seeded);
  return seeded.map((item) => ({ ...item }));
}

export async function saveSupermarketSupplier(context: SupermarketContext, input: SupermarketSupplierInput): Promise<SupermarketSupplierRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'El proveedor no es valido.', 'INVALID_SUPPLIER_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_supplier', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context), p_supplier_id: input.id ?? null,
      p_name: input.name, p_tax_id: input.taxId, p_phone: input.phone, p_email: input.email,
      p_address: input.address, p_lead_days: input.leadDays, p_credit_limit: input.creditLimit, p_active: input.active,
    });
    if (error?.message.includes('SUPPLIER_ALREADY_EXISTS')) throw new ApiError(409, 'Ya existe un proveedor con ese nombre o CUIT.', 'SUPPLIER_ALREADY_EXISTS');
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar el proveedor.', 'SUPERMARKET_SUPPLIERS_UNAVAILABLE');
    const saved = (await listSupermarketSuppliers(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'El proveedor no pudo recuperarse.', 'SUPERMARKET_SUPPLIERS_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const current = await listSupermarketSuppliers(context);
  const duplicate = current.find((item) => item.id !== input.id && (item.name.toLowerCase() === input.name.toLowerCase() || (input.taxId && item.taxId === input.taxId)));
  if (duplicate) throw new ApiError(409, 'Ya existe un proveedor con ese nombre o CUIT.', 'SUPPLIER_ALREADY_EXISTS');
  const previous = input.id ? current.find((item) => item.id === input.id) : undefined;
  if (input.id && !previous) throw new ApiError(404, 'El proveedor no existe.', 'SUPPLIER_NOT_FOUND');
  const saved: SupermarketSupplierRecord = {
    ...input, id: previous?.id ?? `supplier-${crypto.randomUUID()}`,
    balance: previous?.balance ?? 0, overdueAmount: previous?.overdueAmount ?? 0,
    openDocuments: previous?.openDocuments ?? 0, createdAt: previous?.createdAt ?? new Date().toISOString(),
  };
  localState.suppliers.set(context.companyId, previous ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
  return { ...saved };
}

export async function listSupermarketSupplierDocuments(context: SupermarketContext, supplierId?: string): Promise<SupermarketSupplierDocumentRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    if (supplierId && !isUuid(supplierId)) throw new ApiError(400, 'El proveedor no es valido.', 'INVALID_SUPPLIER_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_supplier_documents', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context), p_supplier_id: supplierId ?? null,
    });
    if (error) throw new ApiError(503, 'No se pudo consultar la cuenta corriente.', 'SUPPLIER_ACCOUNT_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapDocument);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return (localState.documents.get(branchKey(context)) ?? []).filter((item) => !supplierId || item.supplierId === supplierId).map((item) => ({ ...item }));
}

export async function postSupermarketSupplierDocument(context: SupermarketContext, input: SupermarketSupplierDocumentInput) {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.supplierId) || (input.purchaseOrderId && !isUuid(input.purchaseOrderId))) throw new ApiError(400, 'El proveedor o la orden no son validos.', 'INVALID_REFERENCE_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_post_supplier_document', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_supplier_id: input.supplierId,
      p_purchase_order_id: input.purchaseOrderId ?? null, p_document_type: input.documentType,
      p_document_number: input.documentNumber, p_issue_date: input.issueDate,
      p_due_date: input.dueDate || null, p_amount: input.amount, p_notes: input.notes,
    });
    if (error?.message.includes('PURCHASE_ORDER_NOT_FOUND')) throw new ApiError(404, 'La orden de compra no existe en esta sucursal.', 'PURCHASE_ORDER_NOT_FOUND');
    if (error?.message.includes('SUPPLIER_DOCUMENT_ALREADY_EXISTS')) throw new ApiError(409, 'El comprobante ya fue registrado.', 'SUPPLIER_DOCUMENT_ALREADY_EXISTS');
    if (error) throw new ApiError(503, 'No se pudo registrar el comprobante.', 'SUPPLIER_ACCOUNT_UNAVAILABLE');
    return data as { documentId: string; duplicate: boolean; reconciliationStatus: string; difference: number | null };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const resultKey = `${context.companyId}:${input.idempotencyKey}`;
  const previousResult = localState.documentResults.get(resultKey);
  if (previousResult) return { ...previousResult, duplicate: true };
  const supplier = (await listSupermarketSuppliers(context)).find((item) => item.id === input.supplierId && item.active);
  if (!supplier) throw new ApiError(404, 'El proveedor no existe.', 'SUPPLIER_NOT_FOUND');
  const document: SupermarketSupplierDocumentRecord = {
    id: `document-${crypto.randomUUID()}`, supplierId: supplier.id, supplierName: supplier.name,
    purchaseOrderId: input.purchaseOrderId ?? null, purchaseOrderNumber: null,
    documentType: input.documentType, documentNumber: input.documentNumber,
    issueDate: input.issueDate, dueDate: input.documentType === 'invoice' ? input.dueDate ?? '' : '',
    amount: input.amount, signedAmount: input.documentType === 'invoice' ? input.amount : -input.amount,
    expectedAmount: null, difference: null, reconciliationStatus: 'unmatched',
    notes: input.notes, createdAt: new Date().toISOString(),
  };
  const key = branchKey(context);
  localState.documents.set(key, [document, ...(localState.documents.get(key) ?? [])]);
  const result = { documentId: document.id, duplicate: false, reconciliationStatus: document.reconciliationStatus, difference: null };
  localState.documentResults.set(resultKey, result);
  return result;
}

export async function getSupermarketSupplyForecast(context: SupermarketContext, lookbackDays: number, safetyDays: number): Promise<SupermarketSupplyForecastRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_supply_forecast', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context),
      p_lookback_days: lookbackDays, p_safety_days: safetyDays,
    });
    if (error?.message.includes('INVALID_FORECAST_PARAMETERS')) throw new ApiError(400, 'Los parametros del pronostico no son validos.', 'INVALID_FORECAST_PARAMETERS');
    if (error) throw new ApiError(503, 'No se pudo calcular el pronostico.', 'SUPERMARKET_FORECAST_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapForecast);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const suppliers = await listSupermarketSuppliers(context);
  return (await listSupermarketProducts(context)).filter((item) => item.active).map((product) => {
    const leadDays = suppliers.find((item) => item.name.toLowerCase() === product.supplier.toLowerCase())?.leadDays ?? 7;
    const suggestedQuantity = Math.max(0, product.minStock * 2 - product.stock);
    return {
      productId: product.id, name: product.name, category: product.category, supplierName: product.supplier,
      stock: product.stock, minStock: product.minStock, unitsSold: 0, averageDailySales: 0,
      incomingQuantity: 0, leadDays, daysCover: 9999, suggestedQuantity, turnoverIndex: 0,
      risk: product.stock <= 0 ? 'out_of_stock' : product.stock <= product.minStock ? 'attention' : 'healthy',
    };
  });
}

const DEFAULT_APPROVAL_POLICY: SupermarketPurchaseApprovalPolicy = {
  enabled: true, autoApproveLimit: 100000, secondApprovalThreshold: 1000000,
};

export async function getSupermarketPurchaseApprovalPolicy(context: SupermarketContext): Promise<SupermarketPurchaseApprovalPolicy> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_get_purchase_approval_policy', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar la politica de aprobaciones.', 'PURCHASE_APPROVALS_UNAVAILABLE');
    const item = ((data ?? []) as Array<Record<string, unknown>>)[0] ?? {};
    return {
      enabled: item.enabled !== false, autoApproveLimit: Number(item.auto_approve_limit ?? 100000),
      secondApprovalThreshold: Number(item.second_approval_threshold ?? 1000000),
    };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return { ...(localState.approvalPolicies.get(context.companyId) ?? DEFAULT_APPROVAL_POLICY) };
}

export async function saveSupermarketPurchaseApprovalPolicy(
  context: SupermarketContext,
  policy: SupermarketPurchaseApprovalPolicy,
): Promise<SupermarketPurchaseApprovalPolicy> {
  if (isServerSupabaseAdminConfigured) {
    const { error } = await createAdminServerClient().rpc('supermarket_save_purchase_approval_policy', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context), p_user_id: context.userId,
      p_enabled: policy.enabled, p_auto_approve_limit: policy.autoApproveLimit,
      p_second_approval_threshold: policy.secondApprovalThreshold,
    });
    if (error?.message.includes('INVALID_APPROVAL_POLICY')) throw new ApiError(400, 'Los limites de aprobacion no son validos.', 'INVALID_APPROVAL_POLICY');
    if (error) throw new ApiError(503, 'No se pudo guardar la politica de aprobaciones.', 'PURCHASE_APPROVALS_UNAVAILABLE');
    return getSupermarketPurchaseApprovalPolicy(context);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  localState.approvalPolicies.set(context.companyId, { ...policy });
  return { ...policy };
}

export async function listSupermarketPurchaseApprovals(context: SupermarketContext): Promise<SupermarketPurchaseApprovalRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_purchase_approvals', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context), p_user_id: context.userId,
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las aprobaciones.', 'PURCHASE_APPROVALS_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapApproval);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return (localState.approvals.get(branchKey(context)) ?? []).map(({ decidedBy, ...item }) => ({
    ...item, canDecide: item.status === 'pending' && item.requestedBy !== context.userId && !decidedBy.includes(context.userId),
  }));
}

async function setLocalPurchaseOrdered(context: SupermarketContext, orderId: string) {
  const purchase = (await listSupermarketPurchases(context)).find((item) => item.id === orderId);
  if (!purchase) throw new ApiError(404, 'La compra no existe.', 'PURCHASE_NOT_FOUND');
  await saveSupermarketPurchase(context, { ...purchase, status: 'ordered' });
}

export async function requestSupermarketPurchaseApproval(context: SupermarketContext, orderId: string, idempotencyKey: string) {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(orderId)) throw new ApiError(400, 'La compra no es valida.', 'INVALID_PURCHASE_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_request_purchase_approval', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context), p_user_id: context.userId,
      p_order_id: orderId, p_idempotency_key: idempotencyKey,
    });
    if (error?.message.includes('PURCHASE_NOT_FOUND')) throw new ApiError(404, 'La compra no existe.', 'PURCHASE_NOT_FOUND');
    if (error?.message.includes('PURCHASE_NOT_DRAFT')) throw new ApiError(409, 'Solo los borradores pueden enviarse a aprobacion.', 'PURCHASE_NOT_DRAFT');
    if (error?.message.includes('APPROVAL_ALREADY_PENDING')) throw new ApiError(409, 'La compra ya tiene una aprobacion pendiente.', 'APPROVAL_ALREADY_PENDING');
    if (error) throw new ApiError(503, 'No se pudo solicitar la aprobacion.', 'PURCHASE_APPROVALS_UNAVAILABLE');
    return data as { requestId: string; status: SupermarketPurchaseApprovalStatus; requiredApprovals: number; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const resultKey = `${context.companyId}:${idempotencyKey}`;
  const previousResult = localState.approvalResults.get(resultKey);
  if (previousResult) return { ...previousResult, duplicate: true };
  const purchase = (await listSupermarketPurchases(context)).find((item) => item.id === orderId);
  if (!purchase) throw new ApiError(404, 'La compra no existe.', 'PURCHASE_NOT_FOUND');
  if (purchase.status !== 'draft') throw new ApiError(409, 'Solo los borradores pueden enviarse a aprobacion.', 'PURCHASE_NOT_DRAFT');
  const key = branchKey(context);
  const current = localState.approvals.get(key) ?? [];
  const previous = current.find((item) => item.orderId === orderId);
  if (previous?.status === 'pending') throw new ApiError(409, 'La compra ya tiene una aprobacion pendiente.', 'APPROVAL_ALREADY_PENDING');
  const policy = await getSupermarketPurchaseApprovalPolicy(context);
  const amount = purchase.quantity * purchase.unitCost;
  const requiredApprovals = !policy.enabled || amount <= policy.autoApproveLimit ? 0 : amount >= policy.secondApprovalThreshold ? 2 : 1;
  const status: SupermarketPurchaseApprovalStatus = requiredApprovals === 0 ? 'auto_approved' : 'pending';
  const approval: LocalApproval = {
    id: previous?.id ?? `approval-${crypto.randomUUID()}`, orderId, orderNumber: null,
    supplierName: purchase.supplier, productName: (await listSupermarketProducts(context)).find((item) => item.id === purchase.productId)?.name ?? 'Producto',
    amount, requiredApprovals, approvalCount: 0, status, requestedBy: context.userId,
    requestedAt: new Date().toISOString(), resolvedAt: requiredApprovals === 0 ? new Date().toISOString() : null,
    canDecide: false, decidedBy: [],
  };
  localState.approvals.set(key, previous ? current.map((item) => item.id === approval.id ? approval : item) : [approval, ...current]);
  if (requiredApprovals === 0) await setLocalPurchaseOrdered(context, orderId);
  const result = { requestId: approval.id, status, requiredApprovals, duplicate: false };
  localState.approvalResults.set(resultKey, result);
  return result;
}

export async function decideSupermarketPurchaseApproval(
  context: SupermarketContext,
  requestId: string,
  decision: 'approved' | 'rejected',
  notes: string,
) {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(requestId)) throw new ApiError(400, 'La solicitud no es valida.', 'INVALID_APPROVAL_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_decide_purchase_approval', {
      p_company_id: context.companyId, p_branch_id: productionBranch(context), p_user_id: context.userId,
      p_request_id: requestId, p_decision: decision, p_notes: notes,
    });
    if (error?.message.includes('SELF_APPROVAL_NOT_ALLOWED')) throw new ApiError(409, 'El solicitante no puede aprobar su propia compra.', 'SELF_APPROVAL_NOT_ALLOWED');
    if (error?.message.includes('APPROVAL_ALREADY_RESOLVED')) throw new ApiError(409, 'La solicitud ya fue resuelta.', 'APPROVAL_ALREADY_RESOLVED');
    if (error?.message.includes('APPROVAL_NOT_FOUND')) throw new ApiError(404, 'La solicitud no existe.', 'APPROVAL_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo registrar la decision.', 'PURCHASE_APPROVALS_UNAVAILABLE');
    return data as { requestId: string; status: SupermarketPurchaseApprovalStatus; approvalCount: number; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const key = branchKey(context);
  const current = localState.approvals.get(key) ?? [];
  const approval = current.find((item) => item.id === requestId);
  if (!approval) throw new ApiError(404, 'La solicitud no existe.', 'APPROVAL_NOT_FOUND');
  if (approval.status !== 'pending') throw new ApiError(409, 'La solicitud ya fue resuelta.', 'APPROVAL_ALREADY_RESOLVED');
  if (approval.requestedBy === context.userId) throw new ApiError(409, 'El solicitante no puede aprobar su propia compra.', 'SELF_APPROVAL_NOT_ALLOWED');
  if (approval.decidedBy.includes(context.userId)) return { requestId, status: approval.status, approvalCount: approval.approvalCount, duplicate: true };
  const approvalCount = decision === 'approved' ? approval.approvalCount + 1 : approval.approvalCount;
  const status: SupermarketPurchaseApprovalStatus = decision === 'rejected' ? 'rejected'
    : approvalCount >= approval.requiredApprovals ? 'approved' : 'pending';
  const updated: LocalApproval = { ...approval, approvalCount, status, decidedBy: [...approval.decidedBy, context.userId], resolvedAt: status === 'pending' ? null : new Date().toISOString() };
  localState.approvals.set(key, current.map((item) => item.id === requestId ? updated : item));
  if (status === 'approved') await setLocalPurchaseOrdered(context, approval.orderId);
  return { requestId, status, approvalCount, duplicate: false };
}
