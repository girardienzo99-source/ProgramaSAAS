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
export type SupplierShipmentStatus = 'announced' | 'in_transit' | 'delivered' | 'cancelled';
export type SupplierClaimStatus = 'open' | 'acknowledged' | 'disputed' | 'resolved';
export type SupplierClaimType = 'partial_delivery' | 'rejected_items' | 'document_mismatch' | 'missing_asn';

export interface SupplierPortalClaim {
  id: string;
  claimNumber: number;
  orderId: string;
  orderNumber: number | null;
  receiptNumber: number;
  productName: string;
  claimType: SupplierClaimType;
  status: SupplierClaimStatus;
  priority: 'normal' | 'urgent';
  subject: string;
  description: string;
  claimedQuantity: number;
  responseDueOn: string;
  resolutionNotes: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupermarketSupplierClaimRecord extends SupplierPortalClaim {
  supplierId: string | null;
  supplierName: string;
  receiptId: string;
  productId: string;
  eventCount: number;
}

export interface SupplierPortalShipment {
  id: string;
  dispatchNumber: string;
  carrier: string;
  trackingNumber: string;
  shippedOn: string;
  estimatedArrival: string;
  packageCount: number;
  palletCount: number;
  status: SupplierShipmentStatus;
  notes: string;
  documentName: string;
  documentAvailable: boolean;
}

export interface SupermarketSupplierShipmentRecord extends SupplierPortalShipment {
  supplierId: string;
  supplierName: string;
  orderId: string;
  orderNumber: number | null;
  productName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPortalOrder {
  id: string;
  orderNumber: number | null;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  expectedDate: string;
  status: 'ordered' | 'partially_received' | 'received';
  receivedQuantity: number;
  remainingQuantity: number;
  deliveryStatus: SupplierDeliveryStatus | null;
  promisedDate: string;
  notes: string;
  confirmedAt: string | null;
  shipment: SupplierPortalShipment | null;
}

export interface SupplierPortalSnapshot {
  supplier: { id: string; name: string; email: string; phone: string };
  access: { label: string; expiresAt: string };
  orders: SupplierPortalOrder[];
  claims: SupplierPortalClaim[];
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

interface LocalShipment extends SupplierPortalShipment {
  companyId: string;
  branchId: string;
  supplierId: string;
  supplierName: string;
  orderId: string;
  orderNumber: number | null;
  productName: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalClaim extends SupermarketSupplierClaimRecord {
  companyId: string;
  branchId: string;
}

interface LocalPortalState {
  access: LocalAccess[];
  confirmations: Map<string, LocalConfirmation>;
  results: Map<string, { confirmationId: string; status: SupplierDeliveryStatus; duplicate: boolean }>;
  shipments: Map<string, LocalShipment>;
  shipmentResults: Map<string, { shipmentId: string; status: SupplierShipmentStatus; duplicate: boolean }>;
  claims: Map<string, LocalClaim>;
  claimResults: Map<string, { claimId: string; status: SupplierClaimStatus; duplicate: boolean }>;
}

const globalPortal = globalThis as typeof globalThis & { __programaSassSupplierPortal?: LocalPortalState };
const localState: LocalPortalState = globalPortal.__programaSassSupplierPortal ?? {
  access: [], confirmations: new Map(), results: new Map(),
  shipments: new Map(), shipmentResults: new Map(),
  claims: new Map(), claimResults: new Map(),
};
localState.shipments ??= new Map();
localState.shipmentResults ??= new Map();
localState.claims ??= new Map();
localState.claimResults ??= new Map();
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
  const claims = Array.isArray(item.claims) ? item.claims as Array<Record<string, unknown>> : [];
  return {
    supplier: { id: String(supplier.id), name: String(supplier.name), email: String(supplier.email ?? ''), phone: String(supplier.phone ?? '') },
    access: { label: String(access.label), expiresAt: String(access.expiresAt) },
    claims: claims.map(mapPortalClaim),
    orders: orders.map((order) => {
      const shipment = order.shipment && typeof order.shipment === 'object'
        ? order.shipment as Record<string, unknown>
        : null;
      return {
      id: String(order.id), orderNumber: order.orderNumber === null ? null : Number(order.orderNumber),
      productName: String(order.productName), quantity: Number(order.quantity), unitCost: Number(order.unitCost),
      total: Number(order.total), expectedDate: order.expectedDate ? String(order.expectedDate) : '',
      status: order.status as SupplierPortalOrder['status'],
      receivedQuantity: Number(order.receivedQuantity ?? 0), remainingQuantity: Number(order.remainingQuantity ?? order.quantity ?? 0),
      deliveryStatus: order.deliveryStatus ? order.deliveryStatus as SupplierDeliveryStatus : null,
      promisedDate: order.promisedDate ? String(order.promisedDate) : '', notes: String(order.notes ?? ''),
      confirmedAt: order.confirmedAt ? String(order.confirmedAt) : null,
      shipment: shipment ? {
        id: String(shipment.id), dispatchNumber: String(shipment.dispatchNumber), carrier: String(shipment.carrier),
        trackingNumber: String(shipment.trackingNumber ?? ''), shippedOn: String(shipment.shippedOn),
        estimatedArrival: String(shipment.estimatedArrival), packageCount: Number(shipment.packageCount ?? 0),
        palletCount: Number(shipment.palletCount ?? 0), status: shipment.status as SupplierShipmentStatus,
        notes: String(shipment.notes ?? ''), documentName: String(shipment.documentName ?? ''),
        documentAvailable: shipment.documentAvailable === true,
      } : null,
    };
    }),
  };
}

function mapPortalClaim(item: Record<string, unknown>): SupplierPortalClaim {
  return {
    id: String(item.id), claimNumber: Number(item.claim_number ?? item.claimNumber),
    orderId: String(item.order_id ?? item.orderId),
    orderNumber: (item.order_number ?? item.orderNumber) === null ? null : Number(item.order_number ?? item.orderNumber),
    receiptNumber: Number(item.receipt_number ?? item.receiptNumber),
    productName: String(item.product_name ?? item.productName),
    claimType: String(item.claim_type ?? item.claimType) as SupplierClaimType,
    status: String(item.status) as SupplierClaimStatus,
    priority: String(item.priority) as SupplierPortalClaim['priority'],
    subject: String(item.subject), description: String(item.description ?? ''),
    claimedQuantity: Number(item.claimed_quantity ?? item.claimedQuantity ?? 0),
    responseDueOn: String(item.response_due_on ?? item.responseDueOn),
    resolutionNotes: String(item.resolution_notes ?? item.resolutionNotes ?? ''),
    acknowledgedAt: (item.acknowledged_at ?? item.acknowledgedAt) ? String(item.acknowledged_at ?? item.acknowledgedAt) : null,
    resolvedAt: (item.resolved_at ?? item.resolvedAt) ? String(item.resolved_at ?? item.resolvedAt) : null,
    createdAt: String(item.created_at ?? item.createdAt), updatedAt: String(item.updated_at ?? item.updatedAt),
  };
}

function mapClaim(item: Record<string, unknown>): SupermarketSupplierClaimRecord {
  return {
    ...mapPortalClaim(item), supplierId: item.supplier_id ? String(item.supplier_id) : null,
    supplierName: String(item.supplier_name), receiptId: String(item.receipt_id),
    productId: String(item.product_id), eventCount: Number(item.event_count ?? 0),
  };
}

function mapShipment(item: Record<string, unknown>): SupermarketSupplierShipmentRecord {
  return {
    id: String(item.id), supplierId: String(item.supplier_id), supplierName: String(item.supplier_name),
    orderId: String(item.order_id), orderNumber: item.order_number === null ? null : Number(item.order_number),
    productName: String(item.product_name), dispatchNumber: String(item.dispatch_number),
    carrier: String(item.carrier), trackingNumber: String(item.tracking_number ?? ''),
    shippedOn: String(item.shipped_on), estimatedArrival: String(item.estimated_arrival),
    packageCount: Number(item.package_count ?? 0), palletCount: Number(item.pallet_count ?? 0),
    status: item.status as SupplierShipmentStatus, notes: String(item.notes ?? ''),
    documentName: String(item.document_name ?? ''), documentAvailable: item.document_available === true,
    createdAt: String(item.created_at), updatedAt: String(item.updated_at),
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

export async function listSupplierShipments(
  context: SupermarketContext,
  supplierId?: string,
): Promise<SupermarketSupplierShipmentRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    if (supplierId && !isUuid(supplierId)) throw new ApiError(400, 'El proveedor no es valido.', 'INVALID_SUPPLIER_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_supplier_shipments', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_supplier_id: supplierId ?? null,
    });
    if (error) unavailable();
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapShipment);
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  return [...localState.shipments.values()]
    .filter((item) => item.companyId === context.companyId && item.branchId === branchId(context)
      && (!supplierId || item.supplierId === supplierId))
    .map(({ companyId: _companyId, branchId: _branchId, idempotencyKey: _key, ...item }) => ({ ...item }));
}

export async function listSupermarketSupplierClaims(
  context: SupermarketContext,
  filters: { supplierId?: string; status?: SupplierClaimStatus } = {},
): Promise<SupermarketSupplierClaimRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    if (filters.supplierId && !isUuid(filters.supplierId)) throw new ApiError(400, 'El proveedor no es valido.', 'INVALID_SUPPLIER_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_supplier_claims', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
      p_supplier_id: filters.supplierId ?? null, p_status: filters.status ?? null,
    });
    if (error?.message.includes('INVALID_CLAIM_STATUS')) throw new ApiError(400, 'El estado del reclamo no es valido.', 'INVALID_CLAIM_STATUS');
    if (error) unavailable();
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapClaim);
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  return [...localState.claims.values()]
    .filter((item) => item.companyId === context.companyId && item.branchId === branchId(context)
      && (!filters.supplierId || item.supplierId === filters.supplierId)
      && (!filters.status || item.status === filters.status))
    .map(({ companyId: _companyId, branchId: _branchId, ...item }) => ({ ...item }));
}

export async function updateSupermarketSupplierClaim(
  context: SupermarketContext,
  input: { claimId: string; idempotencyKey: string; status: Exclude<SupplierClaimStatus, 'open'>; notes: string },
) {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.claimId)) throw new ApiError(400, 'El reclamo no es valido.', 'INVALID_CLAIM_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_update_supplier_claim', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_claim_id: input.claimId, p_idempotency_key: input.idempotencyKey,
      p_status: input.status, p_notes: input.notes,
    });
    if (error?.message.includes('SUPPLIER_CLAIM_NOT_FOUND')) throw new ApiError(404, 'El reclamo no existe.', 'SUPPLIER_CLAIM_NOT_FOUND');
    if (error?.message.includes('INVALID_CLAIM_TRANSITION')) throw new ApiError(409, 'El reclamo ya no admite ese cambio.', 'INVALID_CLAIM_TRANSITION');
    if (error) unavailable();
    return data as { claimId: string; status: SupplierClaimStatus; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  const resultKey = `${context.companyId}:${input.idempotencyKey}`;
  const previous = localState.claimResults.get(resultKey);
  if (previous) return { ...previous, duplicate: true };
  const claim = localState.claims.get(input.claimId);
  if (!claim || claim.companyId !== context.companyId || claim.branchId !== branchId(context)) {
    throw new ApiError(404, 'El reclamo no existe.', 'SUPPLIER_CLAIM_NOT_FOUND');
  }
  if (claim.status === 'resolved' || claim.status === input.status) throw new ApiError(409, 'El reclamo ya no admite ese cambio.', 'INVALID_CLAIM_TRANSITION');
  claim.status = input.status; claim.updatedAt = new Date().toISOString(); claim.eventCount += 1;
  if (input.status === 'acknowledged') claim.acknowledgedAt ??= claim.updatedAt;
  if (input.status === 'resolved') { claim.resolvedAt = claim.updatedAt; claim.resolutionNotes = input.notes; }
  const result = { claimId: claim.id, status: claim.status, duplicate: false };
  localState.claimResults.set(resultKey, result);
  return result;
}

async function createPrivateDocumentUrl(path: string, fileName: string) {
  const { data, error } = await createAdminServerClient().storage.from('private-assets').createSignedUrl(path, 300, {
    download: fileName || 'remito.pdf',
  });
  if (error || !data?.signedUrl) throw new ApiError(503, 'No se pudo abrir el remito.', 'SUPPLIER_DOCUMENT_UNAVAILABLE');
  return { url: data.signedUrl, expiresIn: 300, fileName: fileName || 'remito.pdf' };
}

export async function getInternalSupplierShipmentDocumentUrl(context: SupermarketContext, shipmentId: string) {
  if (!isUuid(shipmentId)) throw new ApiError(400, 'El despacho no es valido.', 'INVALID_SHIPMENT_ID');
  if (!isServerSupabaseAdminConfigured) unavailable();
  const { data, error } = await createAdminServerClient().from('supermarket_supplier_shipments')
    .select('document_path, document_name')
    .eq('id', shipmentId).eq('company_id', context.companyId).eq('branch_id', branchId(context)).maybeSingle();
  if (error || !data?.document_path) throw new ApiError(404, 'El despacho no tiene un remito disponible.', 'SUPPLIER_DOCUMENT_NOT_FOUND');
  return createPrivateDocumentUrl(data.document_path, data.document_name ?? 'remito.pdf');
}

export async function getSupplierPortalSnapshot(token: string): Promise<SupplierPortalSnapshot> {
  const tokenHash = supplierPortalTokenHash(token);
  if (isServerSupabaseAdminConfigured) {
    const client = createAdminServerClient();
    const [snapshotResult, claimResult] = await Promise.all([
      client.rpc('supermarket_supplier_portal_snapshot', { p_token_hash: tokenHash }),
      client.rpc('supermarket_supplier_portal_claims', { p_token_hash: tokenHash }),
    ]);
    if (snapshotResult.error?.message.includes('INVALID_SUPPLIER_PORTAL_TOKEN') || claimResult.error?.message.includes('INVALID_SUPPLIER_PORTAL_TOKEN')) {
      throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
    }
    if (snapshotResult.error || claimResult.error) unavailable();
    const snapshot = (snapshotResult.data ?? {}) as Record<string, unknown>;
    return mapSnapshot({ ...snapshot, claims: claimResult.data ?? [] });
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
    (order.status === 'ordered' || order.status === 'partially_received' || order.status === 'received') && order.supplier.toLowerCase() === supplier.name.toLowerCase(),
  ).map((order) => {
    const confirmation = localState.confirmations.get(`${access.companyId}:${order.id}`);
    return {
      id: order.id, orderNumber: null, productName: products.find((item) => item.id === order.productId)?.name ?? 'Producto',
      quantity: order.quantity, unitCost: order.unitCost, total: order.quantity * order.unitCost,
      expectedDate: order.expectedDate, status: order.status as SupplierPortalOrder['status'],
      receivedQuantity: order.receivedQuantity, remainingQuantity: order.remainingQuantity,
      deliveryStatus: confirmation?.status ?? null, promisedDate: confirmation?.promisedDate ?? '',
      notes: confirmation?.notes ?? '', confirmedAt: confirmation?.confirmedAt ?? null,
      shipment: localState.shipments.get(`${access.companyId}:${order.id}`) ?? null,
    };
  });
  const claims = [...localState.claims.values()]
    .filter((item) => item.companyId === access.companyId && item.branchId === access.branchId
      && (item.supplierId === supplier.id || item.supplierName.toLowerCase() === supplier.name.toLowerCase()))
    .map(({ companyId: _companyId, branchId: _branchId, supplierId: _supplierId, supplierName: _supplierName,
      receiptId: _receiptId, productId: _productId, eventCount: _eventCount, ...item }) => ({ ...item }));
  return { supplier: { id: supplier.id, name: supplier.name, email: supplier.email, phone: supplier.phone }, access: { label: access.label, expiresAt: access.expiresAt }, orders, claims };
}

export async function respondSupplierPortalClaim(
  token: string,
  input: { claimId: string; idempotencyKey: string; status: 'acknowledged' | 'disputed'; notes: string },
) {
  const tokenHash = supplierPortalTokenHash(token);
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.claimId)) throw new ApiError(400, 'El reclamo no es valido.', 'INVALID_CLAIM_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_supplier_respond_claim', {
      p_token_hash: tokenHash, p_claim_id: input.claimId, p_idempotency_key: input.idempotencyKey,
      p_status: input.status, p_notes: input.notes,
    });
    if (error?.message.includes('INVALID_SUPPLIER_PORTAL_TOKEN')) throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
    if (error?.message.includes('SUPPLIER_CLAIM_NOT_FOUND')) throw new ApiError(404, 'El reclamo no pertenece a este proveedor.', 'SUPPLIER_CLAIM_NOT_FOUND');
    if (error?.message.includes('INVALID_CLAIM_TRANSITION')) throw new ApiError(409, 'El reclamo ya no admite esa respuesta.', 'INVALID_CLAIM_TRANSITION');
    if (error) unavailable();
    return data as { claimId: string; status: SupplierClaimStatus; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  const access = localState.access.find((item) => item.tokenHash === tokenHash && item.active && new Date(item.expiresAt).getTime() > Date.now());
  if (!access) throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
  const resultKey = `${access.companyId}:${input.idempotencyKey}`;
  const previous = localState.claimResults.get(resultKey);
  if (previous) return { ...previous, duplicate: true };
  const claim = localState.claims.get(input.claimId);
  if (!claim || claim.companyId !== access.companyId || claim.branchId !== access.branchId || claim.supplierId !== access.supplierId) {
    throw new ApiError(404, 'El reclamo no pertenece a este proveedor.', 'SUPPLIER_CLAIM_NOT_FOUND');
  }
  if (claim.status === 'resolved' || claim.status === input.status) throw new ApiError(409, 'El reclamo ya no admite esa respuesta.', 'INVALID_CLAIM_TRANSITION');
  claim.status = input.status; claim.updatedAt = new Date().toISOString(); claim.eventCount += 1;
  if (input.status === 'acknowledged') claim.acknowledgedAt ??= claim.updatedAt;
  const result = { claimId: claim.id, status: claim.status, duplicate: false };
  localState.claimResults.set(resultKey, result);
  return result;
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

export async function upsertSupplierPortalShipment(
  token: string,
  input: {
    orderId: string;
    idempotencyKey: string;
    dispatchNumber: string;
    carrier: string;
    trackingNumber: string;
    shippedOn: string;
    estimatedArrival: string;
    packageCount: number;
    palletCount: number;
    notes: string;
  },
) {
  const tokenHash = supplierPortalTokenHash(token);
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.orderId)) throw new ApiError(400, 'La orden no es valida.', 'INVALID_PURCHASE_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_supplier_upsert_shipment', {
      p_token_hash: tokenHash, p_order_id: input.orderId, p_idempotency_key: input.idempotencyKey,
      p_dispatch_number: input.dispatchNumber, p_carrier: input.carrier,
      p_tracking_number: input.trackingNumber, p_shipped_on: input.shippedOn,
      p_estimated_arrival: input.estimatedArrival, p_package_count: input.packageCount,
      p_pallet_count: input.palletCount, p_notes: input.notes,
    });
    if (error?.message.includes('INVALID_SUPPLIER_PORTAL_TOKEN')) throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
    if (error?.message.includes('SUPPLIER_ORDER_NOT_FOUND')) throw new ApiError(404, 'La orden no pertenece al proveedor o ya fue recibida.', 'SUPPLIER_ORDER_NOT_FOUND');
    if (error?.message.includes('SUPPLIER_SHIPMENT_ALREADY_EXISTS')) throw new ApiError(409, 'El numero de remito ya fue utilizado.', 'SUPPLIER_SHIPMENT_ALREADY_EXISTS');
    if (error?.message.includes('INVALID_SUPPLIER_SHIPMENT')) throw new ApiError(400, 'Los datos del despacho no son validos.', 'INVALID_SUPPLIER_SHIPMENT');
    if (error) unavailable();
    return data as { shipmentId: string; status: SupplierShipmentStatus; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') unavailable();
  const resultKey = `${tokenHash}:${input.idempotencyKey}`;
  const previous = localState.shipmentResults.get(resultKey);
  if (previous) return { ...previous, duplicate: true };
  const snapshot = await getSupplierPortalSnapshot(token);
  const order = snapshot.orders.find((item) => item.id === input.orderId && item.status === 'ordered');
  const access = localState.access.find((item) => item.tokenHash === tokenHash);
  if (!order || !access) throw new ApiError(404, 'La orden no pertenece al proveedor o ya fue recibida.', 'SUPPLIER_ORDER_NOT_FOUND');
  const now = new Date().toISOString();
  const current = localState.shipments.get(`${access.companyId}:${order.id}`);
  const shipment: LocalShipment = {
    id: current?.id ?? `shipment-${crypto.randomUUID()}`, companyId: access.companyId, branchId: access.branchId,
    supplierId: snapshot.supplier.id, supplierName: snapshot.supplier.name, orderId: order.id,
    orderNumber: order.orderNumber, productName: order.productName, idempotencyKey: input.idempotencyKey,
    dispatchNumber: input.dispatchNumber, carrier: input.carrier, trackingNumber: input.trackingNumber,
    shippedOn: input.shippedOn, estimatedArrival: input.estimatedArrival,
    packageCount: input.packageCount, palletCount: input.palletCount, status: 'announced', notes: input.notes,
    documentName: current?.documentName ?? '', documentAvailable: current?.documentAvailable ?? false,
    createdAt: current?.createdAt ?? now, updatedAt: now,
  };
  localState.shipments.set(`${access.companyId}:${order.id}`, shipment);
  const result = { shipmentId: shipment.id, status: shipment.status, duplicate: false };
  localState.shipmentResults.set(resultKey, result);
  return result;
}

interface ShipmentUploadScope {
  companyId: string;
  branchId: string;
  supplierId: string;
  orderId: string;
  shipmentId: string;
  documentPath: string;
  documentName: string;
}

async function supplierShipmentScope(tokenHash: string, shipmentId: string): Promise<ShipmentUploadScope> {
  if (!isUuid(shipmentId)) throw new ApiError(400, 'El despacho no es valido.', 'INVALID_SHIPMENT_ID');
  const { data, error } = await createAdminServerClient().rpc('supermarket_supplier_shipment_upload_scope', {
    p_token_hash: tokenHash, p_shipment_id: shipmentId,
  });
  if (error?.message.includes('INVALID_SUPPLIER_PORTAL_TOKEN')) throw new ApiError(401, 'El enlace expiro o fue revocado.', 'UNAUTHORIZED');
  if (error?.message.includes('SUPPLIER_SHIPMENT_NOT_FOUND')) throw new ApiError(404, 'El despacho no pertenece al proveedor.', 'SUPPLIER_SHIPMENT_NOT_FOUND');
  if (error || !data || typeof data !== 'object') unavailable();
  const item = data as Record<string, unknown>;
  return {
    companyId: String(item.companyId), branchId: String(item.branchId), supplierId: String(item.supplierId),
    orderId: String(item.orderId), shipmentId: String(item.shipmentId),
    documentPath: String(item.documentPath ?? ''), documentName: String(item.documentName ?? ''),
  };
}

export async function attachSupplierShipmentPdf(
  token: string,
  shipmentId: string,
  file: { bytes: Uint8Array; safeName: string; digest: string; size: number },
) {
  if (!isServerSupabaseAdminConfigured) unavailable();
  const tokenHash = supplierPortalTokenHash(token);
  const scope = await supplierShipmentScope(tokenHash, shipmentId);
  const objectPath = `${scope.companyId}/supermarket/supplier-portal/${scope.supplierId}/${scope.orderId}/${crypto.randomUUID()}.pdf`;
  const supabase = createAdminServerClient();
  const { error: uploadError } = await supabase.storage.from('private-assets').upload(objectPath, file.bytes, {
    contentType: 'application/pdf', cacheControl: '3600', upsert: false,
  });
  if (uploadError) throw new ApiError(503, 'No se pudo almacenar el remito.', 'SUPPLIER_DOCUMENT_UPLOAD_FAILED');
  const { error: attachError } = await supabase.rpc('supermarket_supplier_attach_shipment_document', {
    p_token_hash: tokenHash, p_shipment_id: shipmentId, p_object_path: objectPath,
    p_file_name: file.safeName, p_content_type: 'application/pdf', p_file_size: file.size,
    p_sha256: file.digest,
  });
  if (attachError) {
    await supabase.storage.from('private-assets').remove([objectPath]);
    unavailable();
  }
  if (scope.documentPath && scope.documentPath !== objectPath) {
    await supabase.storage.from('private-assets').remove([scope.documentPath]);
  }
  return { shipmentId, fileName: file.safeName, size: file.size };
}

export async function getSupplierShipmentDocumentUrl(token: string, shipmentId: string) {
  if (!isServerSupabaseAdminConfigured) unavailable();
  const scope = await supplierShipmentScope(supplierPortalTokenHash(token), shipmentId);
  if (!scope.documentPath) throw new ApiError(404, 'El despacho no tiene un remito disponible.', 'SUPPLIER_DOCUMENT_NOT_FOUND');
  return createPrivateDocumentUrl(scope.documentPath, scope.documentName);
}
