import { createHash, randomBytes } from 'node:crypto';
import { ApiError, isUuid } from './core';
import { listSupermarketProducts, listSupermarketPurchases, type SupermarketContext } from './supermarketRepository';
import { listSupermarketSuppliers } from './supermarketSupplyRepository';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

export interface SupermarketSupplierPortalAccessRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  label: string;
  expiresAt: string;
  active: boolean;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export type SupplierDeliveryStatus = 'confirmed' | 'rescheduled' | 'unavailable';

export interface SupplierPortalOrder {
  id: string;
  orderNumber: number | null;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  expectedDate: string;
  status: 'ordered' | 'received';
  deliveryStatus: SupplierDeliveryStatus | null;
  promisedDate: string;
  notes: string;
  confirmedAt: string | null;
}

export interface SupplierPortalSnapshot {
  supplier: { id: string; name: string; email: string; phone: string };
  access: { label: string; expiresAt: string };
  orders: SupplierPortalOrder[];
}

interface LocalAccess extends SupermarketSupplierPortalAccessRecord {
  companyId: string;
  branchId: string;
  tokenHash: string;
}

interface LocalConfirmation {
  orderId: string;
  status: SupplierDeliveryStatus;
  promisedDate: string;
  notes: string;
  confirmedAt: string;
  idempotencyKey: string;
}

interface LocalPortalState {
  access: LocalAccess[];
  confirmations: Map<string, LocalConfirmation>;
  results: Map<string, { confirmationId: string; status: SupplierDeliveryStatus; duplicate: boolean }>;
}

const globalPortal = globalThis as typeof globalThis & { __programaSassSupplierPortal?: LocalPortalState };
const localState: LocalPortalState = globalPortal.__programaSassSupplierPortal ?? {
  access: [], confirmations: new Map(), results: new Map(),
};
globalPortal.__programaSassSupplierPortal = localState;

function branchId(context: SupermarketContext): string {
  if (!context.branchId) throw new ApiError(409, 'Debe seleccionar una sucursal.', 'BRANCH_REQUIRED');
  return context.branchId;
}

function unavailable(): never {
  throw new ApiError(503, 'El portal de proveedores no esta disponible.', 'SUPPLIER_PORTAL_UNAVAILABLE');
}

export function supplierPortalTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readSupplierPortalToken(request: Request): string {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || !/^ps_supplier_[A-Za-z0-9_-]{40,80}$/.test(token)) {
    throw new ApiError(401, 'El acceso del proveedor no es valido.', 'UNAUTHORIZED');
  }
  return token;
}

function mapAccess(item: Record<string, unknown>): SupermarketSupplierPortalAccessRecord {
  return {
    id: String(item.id), supplierId: String(item.supplier_id), supplierName: String(item.supplier_name),
    label: String(item.label), expiresAt: String(item.expires_at), active: item.active === true,
    createdAt: String(item.created_at), revokedAt: item.revoked_at ? String(item.revoked_at) : null,
    lastUsedAt: item.last_used_at ? String(item.last_used_at) : null,
  };
}

function mapSnapshot(value: unknown): SupplierPortalSnapshot {
  const item = (value ?? {}) as Record<string, unknown>;
  const supplier = (item.supplier ?? {}) as Record<string, unknown>;
  const access = (item.access ?? {}) as Record<string, unknown>;
  const orders = Array.isArray(item.orders) ? item.orders as Array<Record<string, unknown>> : [];
  return {
    supplier: { id: String(supplier.id), name: String(supplier.name), email: String(supplier.email ?? ''), phone: String(supplier.phone ?? '') },
    access: { label: String(access.label), expiresAt: String(access.expiresAt) },
    orders: orders.map((order) => ({
      id: String(order.id), orderNumber: order.orderNumber === null ? null : Number(order.orderNumber),
      productName: String(order.productName), quantity: Number(order.quantity), unitCost: Number(order.unitCost),
      total: Number(order.total), expectedDate: order.expectedDate ? String(order.expectedDate) : '',
      status: order.status as SupplierPortalOrder['status'],
      deliveryStatus: order.deliveryStatus ? order.deliveryStatus as SupplierDeliveryStatus : null,
      promisedDate: order.promisedDate ? String(order.promisedDate) : '', notes: String(order.notes ?? ''),
      confirmedAt: order.confirmedAt ? String(order.confirmedAt) : null,
    })),
  };
}

export async function listSupplierPortalAccess(context: SupermarketContext): Promise<SupermarketSupplierPortalAccessRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_supplier_portal_access', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
    });
    if (error) unavailable();
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapAccess);
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  const now = Date.now();
  return localState.access.filter((item) => item.companyId === context.companyId && item.branchId === branchId(context))
    .map(({ companyId: _companyId, branchId: _branchId, tokenHash: _tokenHash, ...item }) => ({
      ...item, active: item.active && new Date(item.expiresAt).getTime() > now,
    }));
}

export async function createSupplierPortalAccess(
  context: SupermarketContext,
  input: { supplierId: string; label: string; expiresInDays: number },
) {
  if (!isUuid(input.supplierId)) throw new ApiError(400, 'El proveedor no es valido.', 'INVALID_SUPPLIER_ID');
  const token = `ps_supplier_${randomBytes(32).toString('base64url')}`;
  const tokenHash = supplierPortalTokenHash(token);
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86400000).toISOString();
  let id: string;
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_create_supplier_portal_access', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_supplier_id: input.supplierId, p_token_hash: tokenHash, p_label: input.label, p_expires_at: expiresAt,
    });
    if (error?.message.includes('SUPPLIER_NOT_FOUND')) throw new ApiError(404, 'El proveedor no existe.', 'SUPPLIER_NOT_FOUND');
    if (error || typeof data !== 'string') unavailable();
    id = data;
  } else {
    if (process.env.NODE_ENV === 'production') unavailable();
    const supplier = (await listSupermarketSuppliers(context)).find((item) => item.id === input.supplierId && item.active);
    if (!supplier) throw new ApiError(404, 'El proveedor no existe.', 'SUPPLIER_NOT_FOUND');
    id = `portal-${crypto.randomUUID()}`;
    localState.access.unshift({
      id, supplierId: supplier.id, supplierName: supplier.name, label: input.label,
      expiresAt, active: true, createdAt: new Date().toISOString(), revokedAt: null,
      lastUsedAt: null, companyId: context.companyId, branchId: branchId(context), tokenHash,
    });
  }
  return { id, token, expiresAt };
}

export async function revokeSupplierPortalAccess(context: SupermarketContext, accessId: string): Promise<void> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(accessId)) throw new ApiError(400, 'El acceso no es valido.', 'INVALID_PORTAL_ACCESS_ID');
    const { error } = await createAdminServerClient().rpc('supermarket_revoke_supplier_portal_access', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_access_id: accessId,
    });
    if (error?.message.includes('SUPPLIER_PORTAL_ACCESS_NOT_FOUND')) throw new ApiError(404, 'El acceso no existe o ya fue revocado.', 'PORTAL_ACCESS_NOT_FOUND');
    if (error) unavailable();
    return;
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  const access = localState.access.find((item) => item.id === accessId && item.companyId === context.companyId && item.branchId === branchId(context));
  if (!access?.active) throw new ApiError(404, 'El acceso no existe o ya fue revocado.', 'PORTAL_ACCESS_NOT_FOUND');
  access.active = false; access.revokedAt = new Date().toISOString();
}

export async function getSupplierPortalSnapshot(token: string): Promise<SupplierPortalSnapshot> {
  const tokenHash = supplierPortalTokenHash(token);
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_supplier_portal_snapshot', { p_token_hash: tokenHash });
    if (error?.message.includes('INVALID_SUPPLIER_PORTAL_TOKEN')) throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
    if (error) unavailable();
    return mapSnapshot(data);
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  const access = localState.access.find((item) => item.tokenHash === tokenHash && item.active && new Date(item.expiresAt).getTime() > Date.now());
  if (!access) throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
  access.lastUsedAt = new Date().toISOString();
  const context: SupermarketContext = { companyId: access.companyId, branchId: access.branchId, userId: 'supplier-portal' };
  const supplier = (await listSupermarketSuppliers(context)).find((item) => item.id === access.supplierId);
  if (!supplier) throw new ApiError(401, 'El proveedor ya no esta activo.', 'UNAUTHORIZED');
  const products = await listSupermarketProducts(context);
  const orders = (await listSupermarketPurchases(context)).filter((order) =>
    (order.status === 'ordered' || order.status === 'received') && order.supplier.toLowerCase() === supplier.name.toLowerCase(),
  ).map((order) => {
    const confirmation = localState.confirmations.get(`${access.companyId}:${order.id}`);
    return {
      id: order.id, orderNumber: null, productName: products.find((item) => item.id === order.productId)?.name ?? 'Producto',
      quantity: order.quantity, unitCost: order.unitCost, total: order.quantity * order.unitCost,
      expectedDate: order.expectedDate, status: order.status as SupplierPortalOrder['status'],
      deliveryStatus: confirmation?.status ?? null, promisedDate: confirmation?.promisedDate ?? '',
      notes: confirmation?.notes ?? '', confirmedAt: confirmation?.confirmedAt ?? null,
    };
  });
  return { supplier: { id: supplier.id, name: supplier.name, email: supplier.email, phone: supplier.phone }, access: { label: access.label, expiresAt: access.expiresAt }, orders };
}

export async function confirmSupplierPortalDelivery(
  token: string,
  input: { orderId: string; idempotencyKey: string; status: SupplierDeliveryStatus; promisedDate: string; notes: string },
) {
  const tokenHash = supplierPortalTokenHash(token);
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.orderId)) throw new ApiError(400, 'La orden no es valida.', 'INVALID_PURCHASE_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_supplier_confirm_delivery', {
      p_token_hash: tokenHash, p_order_id: input.orderId, p_idempotency_key: input.idempotencyKey,
      p_status: input.status, p_promised_date: input.promisedDate || null, p_notes: input.notes,
    });
    if (error?.message.includes('INVALID_SUPPLIER_PORTAL_TOKEN')) throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
    if (error?.message.includes('SUPPLIER_ORDER_NOT_FOUND')) throw new ApiError(404, 'La orden no pertenece al proveedor o ya fue recibida.', 'SUPPLIER_ORDER_NOT_FOUND');
    if (error?.message.includes('INVALID_PROMISED_DATE')) throw new ApiError(400, 'La fecha comprometida no es valida.', 'INVALID_PROMISED_DATE');
    if (error) unavailable();
    return data as { confirmationId: string; status: SupplierDeliveryStatus; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  const resultKey = `${tokenHash}:${input.idempotencyKey}`;
  const previous = localState.results.get(resultKey);
  if (previous) return { ...previous, duplicate: true };
  const snapshot = await getSupplierPortalSnapshot(token);
  const order = snapshot.orders.find((item) => item.id === input.orderId && item.status === 'ordered');
  if (!order) throw new ApiError(404, 'La orden no pertenece al proveedor o ya fue recibida.', 'SUPPLIER_ORDER_NOT_FOUND');
  const confirmedAt = new Date().toISOString();
  localState.confirmations.set(`${localState.access.find((item) => item.tokenHash === tokenHash)!.companyId}:${order.id}`, {
    orderId: order.id, status: input.status, promisedDate: input.status === 'unavailable' ? '' : input.promisedDate,
    notes: input.notes, confirmedAt, idempotencyKey: input.idempotencyKey,
  });
  const result = { confirmationId: `confirmation-${crypto.randomUUID()}`, status: input.status, duplicate: false };
  localState.results.set(resultKey, result);
  return result;
}
