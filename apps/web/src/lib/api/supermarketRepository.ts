import { ApiError, isUuid } from './core';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

export type SupermarketCategory = 'almacen' | 'bebidas' | 'lacteos' | 'carniceria' | 'verduleria' | 'limpieza' | 'panaderia';
export type SupermarketPromo = 'none' | '2x1' | '30off';
export type SupermarketUnit = 'kg' | 'unit';
export type SupermarketPurchaseStatus = 'draft' | 'ordered' | 'received';

export interface SupermarketContext {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export interface SupermarketProductRecord {
  id: string;
  name: string;
  price: number;
  cost: number;
  barcode: string;
  isWeighed: boolean;
  unit: SupermarketUnit;
  category: SupermarketCategory;
  expirationDate: string;
  daysToExpire: number;
  promo: SupermarketPromo;
  stock: number;
  minStock: number;
  supplier: string;
  imageUrl: string | null;
  active: boolean;
}

export type SupermarketProductInput = Omit<SupermarketProductRecord, 'id' | 'daysToExpire' | 'expirationDate'> & { id?: string };

export interface SupermarketPurchaseRecord {
  id: string;
  supplier: string;
  productId: string;
  quantity: number;
  unitCost: number;
  expectedDate: string;
  status: SupermarketPurchaseStatus;
  lotCode: string;
  expirationDate: string;
}

export type SupermarketPurchaseInput = Omit<SupermarketPurchaseRecord, 'id'> & { id?: string };

export interface SupermarketLotRecord {
  id: string;
  productId: string;
  lotCode: string;
  quantity: number;
  expirationDate: string;
  receivedDate: string;
}

export interface SupermarketCashState {
  isOpen: boolean;
  cashId: string | null;
  name: string;
  openingBalance: number;
  expectedCash: number;
  salesTotal: number;
  cashPayments: number;
  qrPayments: number;
  ticketCount: number;
  openedAt: string | null;
}

export interface SupermarketSaleInput {
  idempotencyKey: string;
  paymentMethod: 'cash' | 'qr';
  items: Array<{ productId: string; quantity: number }>;
}

export interface SupermarketSaleResult {
  saleId: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  discount: number;
  fiscalStatus: 'pending' | 'authorized' | 'rejected' | 'not_required';
  duplicate: boolean;
}

export interface SupermarketSalesReportRecord {
  from: string;
  to: string;
  branchId: string | null;
  summary: {
    salesTotal: number;
    netTotal: number;
    taxTotal: number;
    discountTotal: number;
    costTotal: number;
    grossProfit: number;
    marginPercent: number;
    tickets: number;
    averageTicket: number;
    previousSalesTotal: number;
    previousGrossProfit: number;
    returnsCount: number;
    returnsValue: number;
    costedLines: number;
    totalLines: number;
    costCoveragePercent: number;
  };
  daily: Array<{ day: string; sales: number; cost: number; profit: number; tickets: number }>;
  payments: Array<{ method: 'cash' | 'qr'; amount: number; tickets: number }>;
  categories: Array<{ category: string; quantity: number; netSales: number; cost: number; profit: number; marginPercent: number }>;
  products: Array<{ productId: string; name: string; category: string; quantity: number; netSales: number; cost: number; profit: number; marginPercent: number }>;
  branches: Array<{ branchId: string; name: string; sales: number; cost: number; profit: number; marginPercent: number; tickets: number }>;
}

export interface SupermarketReturnInput {
  idempotencyKey: string;
  barcode: string;
  quantity: number;
  reason: string;
  disposition: 'restock' | 'waste';
}

export interface SupermarketReturnResult {
  returnId: string;
  productId: string;
  productName: string;
  disposition: 'restock' | 'waste';
  duplicate: boolean;
}

export interface SupermarketBranchRecord {
  id: string;
  name: string;
  isMain: boolean;
  productCount: number;
  stockUnits: number;
}

export interface SupermarketInventoryEventRecord {
  id: string;
  productId: string;
  productName: string;
  operation: 'count' | 'waste';
  previousQuantity: number;
  declaredQuantity: number;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface SupermarketInventoryAdjustmentInput {
  idempotencyKey: string;
  productId: string;
  operation: 'count' | 'waste';
  quantity: number;
  reason: string;
}

export interface SupermarketTransferRecord {
  id: string;
  transferNumber: number;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'completed' | 'cancelled';
  notes: string;
  createdAt: string;
}

export interface SupermarketTransferInput {
  idempotencyKey: string;
  destinationBranchId: string;
  productId: string;
  quantity: number;
  notes: string;
}

export interface SupermarketBulkPriceInput {
  idempotencyKey: string;
  description: string;
  items: Array<{ productId: string; newPrice: number; promo: SupermarketPromo }>;
}

export interface SupermarketLocationRecord {
  id: string;
  code: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  description: string;
  active: boolean;
  assignedProducts: number;
}

export type SupermarketLocationInput = Omit<SupermarketLocationRecord, 'id' | 'assignedProducts'> & { id?: string };

export interface SupermarketPlacementRecord {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  locationId: string;
  locationCode: string;
  zone: string;
  facingCount: number;
  capacity: number;
  reorderPoint: number;
  stock: number;
  needsRestock: boolean;
}

export interface SupermarketPlacementInput {
  productId: string;
  locationId: string;
  facingCount: number;
  capacity: number;
  reorderPoint: number;
}

export type SupermarketLabelSize = 'shelf_60x30' | 'promo_80x40';

export interface SupermarketLabelLineRecord {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  price: number;
  promo: SupermarketPromo;
  locationCode: string;
  copies: number;
}

export interface SupermarketLabelJobRecord {
  id: string;
  labelSize: SupermarketLabelSize;
  status: 'pending' | 'printed';
  itemCount: number;
  createdAt: string;
  printedAt: string | null;
  lines: SupermarketLabelLineRecord[];
}

export interface SupermarketLabelJobInput {
  idempotencyKey: string;
  labelSize: SupermarketLabelSize;
  items: Array<{ productId: string; copies: number }>;
}

interface DatabaseProduct {
  id: string;
  name: string;
  price: number | string;
  cost: number | string;
  barcode: string;
  is_weighed: boolean;
  unit: SupermarketUnit;
  category: SupermarketCategory;
  expiration_date: string | null;
  promo: SupermarketPromo;
  stock: number | string;
  min_stock: number | string;
  supplier: string;
  image_url: string | null;
  active: boolean;
}

interface DatabasePurchase {
  id: string;
  supplier: string;
  product_id: string;
  quantity: number | string;
  unit_cost: number | string;
  expected_date: string | null;
  status: SupermarketPurchaseStatus;
  lot_code: string;
  expiration_date: string | null;
}

interface DatabaseLot {
  id: string;
  product_id: string;
  lot_code: string;
  quantity: number | string;
  expiration_date: string | null;
  received_date: string;
}

interface LocalSupermarketSale {
  id: string;
  branchId: string;
  paymentMethod: 'cash' | 'qr';
  total: number;
  netTotal: number;
  taxTotal: number;
  discountTotal: number;
  createdAt: string;
  lines: Array<{
    productId: string;
    name: string;
    category: string;
    quantity: number;
    netSales: number;
    cost: number;
  }>;
}

interface LocalSupermarketState {
  products: Map<string, SupermarketProductRecord[]>;
  purchases: Map<string, SupermarketPurchaseRecord[]>;
  lots: Map<string, SupermarketLotRecord[]>;
  cash: Map<string, SupermarketCashState>;
  saleResults: Map<string, SupermarketSaleResult>;
  sales: Map<string, LocalSupermarketSale[]>;
  returnResults: Map<string, SupermarketReturnResult>;
  inventoryEvents: Map<string, SupermarketInventoryEventRecord[]>;
  transfers: Map<string, SupermarketTransferRecord[]>;
  bulkPriceResults: Map<string, { batchId: string; updatedCount: number; duplicate: boolean }>;
  locations: Map<string, SupermarketLocationRecord[]>;
  placements: Map<string, SupermarketPlacementRecord[]>;
  labelJobs: Map<string, SupermarketLabelJobRecord[]>;
  labelJobResults: Map<string, { labelJobId: string; itemCount: number; duplicate: boolean }>;
}

const globalWithSupermarket = globalThis as typeof globalThis & { __programaSassSupermarket?: LocalSupermarketState };
const localState = globalWithSupermarket.__programaSassSupermarket ?? {
  products: new Map<string, SupermarketProductRecord[]>(),
  purchases: new Map<string, SupermarketPurchaseRecord[]>(),
  lots: new Map<string, SupermarketLotRecord[]>(),
  cash: new Map<string, SupermarketCashState>(),
  saleResults: new Map<string, SupermarketSaleResult>(),
  sales: new Map<string, LocalSupermarketSale[]>(),
  returnResults: new Map<string, SupermarketReturnResult>(),
  inventoryEvents: new Map<string, SupermarketInventoryEventRecord[]>(),
  transfers: new Map<string, SupermarketTransferRecord[]>(),
  bulkPriceResults: new Map<string, { batchId: string; updatedCount: number; duplicate: boolean }>(),
  locations: new Map<string, SupermarketLocationRecord[]>(),
  placements: new Map<string, SupermarketPlacementRecord[]>(),
  labelJobs: new Map<string, SupermarketLabelJobRecord[]>(),
  labelJobResults: new Map<string, { labelJobId: string; itemCount: number; duplicate: boolean }>(),
};
globalWithSupermarket.__programaSassSupermarket = localState;
localState.cash ??= new Map<string, SupermarketCashState>();
localState.saleResults ??= new Map<string, SupermarketSaleResult>();
localState.sales ??= new Map<string, LocalSupermarketSale[]>();
localState.returnResults ??= new Map<string, SupermarketReturnResult>();
localState.inventoryEvents ??= new Map<string, SupermarketInventoryEventRecord[]>();
localState.transfers ??= new Map<string, SupermarketTransferRecord[]>();
localState.bulkPriceResults ??= new Map<string, { batchId: string; updatedCount: number; duplicate: boolean }>();
localState.locations ??= new Map<string, SupermarketLocationRecord[]>();
localState.placements ??= new Map<string, SupermarketPlacementRecord[]>();
localState.labelJobs ??= new Map<string, SupermarketLabelJobRecord[]>();
localState.labelJobResults ??= new Map<string, { labelJobId: string; itemCount: number; duplicate: boolean }>();

function daysUntil(date: string): number {
  if (!date) return 9999;
  return Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000);
}

function branchId(context: SupermarketContext): string {
  if (!context.branchId) throw new ApiError(409, 'Debe seleccionar una sucursal.', 'BRANCH_REQUIRED');
  return context.branchId;
}

function localKey(context: SupermarketContext): string {
  return `${context.companyId}:${context.branchId ?? 'main'}`;
}

function initialProducts(): SupermarketProductRecord[] {
  return [
    { id: 's1', name: 'Leche Entera 1L', price: 1800, cost: 1200, barcode: '779123456001', isWeighed: false, unit: 'unit', category: 'lacteos', expirationDate: '2026-07-28', daysToExpire: daysUntil('2026-07-28'), promo: 'none', stock: 120, minStock: 20, supplier: 'Mastellone SA', imageUrl: null, active: true },
    { id: 's2', name: 'Queso Cremoso', price: 8500, cost: 5800, barcode: '779123456002', isWeighed: true, unit: 'kg', category: 'lacteos', expirationDate: '2026-07-22', daysToExpire: daysUntil('2026-07-22'), promo: '30off', stock: 8, minStock: 15, supplier: 'La Paulina SRL', imageUrl: null, active: true },
    { id: 's3', name: 'Gaseosa Cola 2.25L', price: 3400, cost: 2100, barcode: '779123456003', isWeighed: false, unit: 'unit', category: 'bebidas', expirationDate: '2026-09-15', daysToExpire: daysUntil('2026-09-15'), promo: '2x1', stock: 250, minStock: 50, supplier: 'Distribuidora Central', imageUrl: null, active: true },
    { id: 's4', name: 'Manzana Red', price: 2800, cost: 1600, barcode: '779123456004', isWeighed: true, unit: 'kg', category: 'verduleria', expirationDate: '2026-07-25', daysToExpire: daysUntil('2026-07-25'), promo: 'none', stock: 12, minStock: 30, supplier: 'Central Frutera', imageUrl: null, active: true },
  ];
}

function initialLots(): SupermarketLotRecord[] {
  return [
    { id: 'lot-1', productId: 's1', lotCode: 'LE-260701', quantity: 60, expirationDate: '2026-07-28', receivedDate: '2026-07-01' },
    { id: 'lot-2', productId: 's2', lotCode: 'QC-260708', quantity: 8, expirationDate: '2026-07-22', receivedDate: '2026-07-08' },
  ];
}

function localProducts(context: SupermarketContext): SupermarketProductRecord[] {
  const key = localKey(context);
  const current = localState.products.get(key);
  if (current) return current;
  const seeded = initialProducts();
  localState.products.set(key, seeded);
  return seeded;
}

function localPurchases(context: SupermarketContext): SupermarketPurchaseRecord[] {
  const key = localKey(context);
  const current = localState.purchases.get(key);
  if (current) return current;
  const seeded: SupermarketPurchaseRecord[] = [];
  localState.purchases.set(key, seeded);
  return seeded;
}

function localLots(context: SupermarketContext): SupermarketLotRecord[] {
  const key = localKey(context);
  const current = localState.lots.get(key);
  if (current) return current;
  const seeded = initialLots();
  localState.lots.set(key, seeded);
  return seeded;
}

function localLocations(context: SupermarketContext): SupermarketLocationRecord[] {
  const key = localKey(context);
  const current = localState.locations.get(key);
  if (current) return current;
  const seeded: SupermarketLocationRecord[] = [
    { id: 'loc-1', code: 'A1-G1-E1', zone: 'Almacen', aisle: '1', shelf: '1', bin: '', description: 'Gondola principal', active: true, assignedProducts: 2 },
    { id: 'loc-2', code: 'FRIO-L1-E2', zone: 'Refrigerados', aisle: 'Lacteos', shelf: '2', bin: '', description: 'Heladera de lacteos', active: true, assignedProducts: 2 },
  ];
  localState.locations.set(key, seeded);
  return seeded;
}

function localPlacements(context: SupermarketContext): SupermarketPlacementRecord[] {
  const key = localKey(context);
  const current = localState.placements.get(key);
  if (current) return current;
  const products = localProducts(context);
  const locations = localLocations(context);
  const seeded = products.slice(0, 4).map((product, index): SupermarketPlacementRecord => {
    const location = locations[index < 2 ? 1 : 0];
    const capacity = Math.max(product.minStock * 2, 1);
    return {
      id: `placement-${index + 1}`, productId: product.id, productName: product.name,
      barcode: product.barcode, locationId: location.id, locationCode: location.code,
      zone: location.zone, facingCount: 2, capacity, reorderPoint: product.minStock,
      stock: product.stock, needsRestock: product.stock <= product.minStock,
    };
  });
  localState.placements.set(key, seeded);
  return seeded;
}

function mapProduct(item: DatabaseProduct): SupermarketProductRecord {
  const expirationDate = item.expiration_date ?? '';
  return {
    id: item.id,
    name: item.name,
    price: Number(item.price),
    cost: Number(item.cost),
    barcode: item.barcode,
    isWeighed: item.is_weighed,
    unit: item.unit,
    category: item.category,
    expirationDate,
    daysToExpire: daysUntil(expirationDate),
    promo: item.promo,
    stock: Number(item.stock),
    minStock: Number(item.min_stock),
    supplier: item.supplier,
    imageUrl: item.image_url,
    active: item.active,
  };
}

function mapPurchase(item: DatabasePurchase): SupermarketPurchaseRecord {
  return {
    id: item.id,
    supplier: item.supplier,
    productId: item.product_id,
    quantity: Number(item.quantity),
    unitCost: Number(item.unit_cost),
    expectedDate: item.expected_date ?? '',
    status: item.status,
    lotCode: item.lot_code,
    expirationDate: item.expiration_date ?? '',
  };
}

function mapLot(item: DatabaseLot): SupermarketLotRecord {
  return {
    id: item.id,
    productId: item.product_id,
    lotCode: item.lot_code,
    quantity: Number(item.quantity),
    expirationDate: item.expiration_date ?? '',
    receivedDate: item.received_date,
  };
}

function persistenceUnavailable(): never {
  throw new ApiError(503, 'La persistencia de supermercado no esta configurada.', 'PERSISTENCE_NOT_CONFIGURED');
}

export async function listSupermarketProducts(context: SupermarketContext): Promise<SupermarketProductRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_products', {
      p_company_id: context.companyId,
      p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar el catalogo.', 'SUPERMARKET_CATALOG_UNAVAILABLE');
    return ((data ?? []) as DatabaseProduct[]).map(mapProduct);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localProducts(context).map((item) => ({ ...item }));
}

export async function saveSupermarketProduct(
  context: SupermarketContext,
  input: SupermarketProductInput,
): Promise<SupermarketProductRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'El producto no es valido.', 'INVALID_PRODUCT_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_product', {
      p_company_id: context.companyId,
      p_branch_id: branchId(context),
      p_user_id: context.userId,
      p_product_id: input.id ?? null,
      p_name: input.name,
      p_barcode: input.barcode,
      p_price: input.price,
      p_cost: input.cost,
      p_stock: input.stock,
      p_min_stock: input.minStock,
      p_category: input.category,
      p_unit: input.unit,
      p_is_weighed: input.isWeighed,
      p_promo: input.promo,
      p_supplier: input.supplier,
      p_image_url: input.imageUrl,
      p_active: input.active,
    });
    if (error?.message.includes('BARCODE_ALREADY_EXISTS')) {
      throw new ApiError(409, 'Ya existe un producto con ese codigo de barras.', 'BARCODE_ALREADY_EXISTS');
    }
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar el producto.', 'SUPERMARKET_CATALOG_UNAVAILABLE');
    const saved = (await listSupermarketProducts(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'El producto no pudo recuperarse.', 'SUPERMARKET_CATALOG_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localProducts(context);
  const duplicate = current.find((item) => item.barcode === input.barcode && item.id !== input.id);
  if (duplicate) throw new ApiError(409, 'Ya existe un producto con ese codigo de barras.', 'BARCODE_ALREADY_EXISTS');
  const previous = input.id ? current.find((item) => item.id === input.id) : undefined;
  if (input.id && !previous) throw new ApiError(404, 'El producto no existe.', 'PRODUCT_NOT_FOUND');
  const saved: SupermarketProductRecord = {
    ...input,
    id: previous?.id ?? `sp-${crypto.randomUUID()}`,
    expirationDate: previous?.expirationDate ?? '',
    daysToExpire: daysUntil(previous?.expirationDate ?? ''),
  };
  localState.products.set(localKey(context), previous
    ? current.map((item) => item.id === saved.id ? saved : item)
    : [saved, ...current]);
  return { ...saved };
}

export async function listSupermarketPurchases(context: SupermarketContext): Promise<SupermarketPurchaseRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_purchases', {
      p_company_id: context.companyId,
      p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las compras.', 'SUPERMARKET_PURCHASES_UNAVAILABLE');
    return ((data ?? []) as DatabasePurchase[]).map(mapPurchase);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localPurchases(context).map((item) => ({ ...item }));
}

export async function saveSupermarketPurchase(
  context: SupermarketContext,
  input: SupermarketPurchaseInput,
): Promise<SupermarketPurchaseRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'La compra no es valida.', 'INVALID_PURCHASE_ID');
    if (!isUuid(input.productId)) throw new ApiError(400, 'El producto no es valido.', 'INVALID_PRODUCT_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_purchase', {
      p_company_id: context.companyId,
      p_branch_id: branchId(context),
      p_user_id: context.userId,
      p_order_id: input.id ?? null,
      p_supplier: input.supplier,
      p_product_id: input.productId,
      p_quantity: input.quantity,
      p_unit_cost: input.unitCost,
      p_expected_date: input.expectedDate || null,
      p_status: input.status,
      p_lot_code: input.lotCode,
      p_expiration_date: input.expirationDate || null,
    });
    if (error?.message.includes('PURCHASE_NOT_EDITABLE')) {
      throw new ApiError(409, 'La compra ya no puede modificarse.', 'PURCHASE_NOT_EDITABLE');
    }
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar la compra.', 'SUPERMARKET_PURCHASES_UNAVAILABLE');
    const saved = (await listSupermarketPurchases(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'La compra no pudo recuperarse.', 'SUPERMARKET_PURCHASES_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localPurchases(context);
  const previous = input.id ? current.find((item) => item.id === input.id) : undefined;
  if (input.id && !previous) throw new ApiError(404, 'La compra no existe.', 'PURCHASE_NOT_FOUND');
  const saved: SupermarketPurchaseRecord = { ...input, id: previous?.id ?? `po-${crypto.randomUUID()}` };
  localState.purchases.set(localKey(context), previous
    ? current.map((item) => item.id === saved.id ? saved : item)
    : [saved, ...current]);
  return { ...saved };
}

export async function receiveSupermarketPurchase(
  context: SupermarketContext,
  orderId: string,
): Promise<void> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(orderId)) throw new ApiError(400, 'La compra no es valida.', 'INVALID_PURCHASE_ID');
    const { error } = await createAdminServerClient().rpc('supermarket_receive_purchase', {
      p_company_id: context.companyId,
      p_branch_id: branchId(context),
      p_user_id: context.userId,
      p_order_id: orderId,
    });
    if (error?.message.includes('PURCHASE_NOT_FOUND')) throw new ApiError(404, 'La compra no existe.', 'PURCHASE_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo recibir la compra.', 'SUPERMARKET_PURCHASES_UNAVAILABLE');
    return;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const purchases = localPurchases(context);
  const purchase = purchases.find((item) => item.id === orderId);
  if (!purchase) throw new ApiError(404, 'La compra no existe.', 'PURCHASE_NOT_FOUND');
  if (purchase.status === 'received') return;
  const products = localProducts(context);
  const product = products.find((item) => item.id === purchase.productId);
  if (!product) throw new ApiError(404, 'El producto no existe.', 'PRODUCT_NOT_FOUND');
  const nextStock = product.stock + purchase.quantity;
  const nextCost = nextStock > 0
    ? ((product.stock * product.cost) + (purchase.quantity * purchase.unitCost)) / nextStock
    : purchase.unitCost;
  localState.products.set(localKey(context), products.map((item) => item.id === product.id
    ? { ...item, stock: Number(nextStock.toFixed(3)), cost: Number(nextCost.toFixed(4)) }
    : item));
  localState.purchases.set(localKey(context), purchases.map((item) => item.id === orderId
    ? { ...item, status: 'received' }
    : item));
  localState.lots.set(localKey(context), [{
    id: `lot-${crypto.randomUUID()}`,
    productId: purchase.productId,
    lotCode: purchase.lotCode || `OC-${purchase.id.slice(-8)}`,
    quantity: purchase.quantity,
    expirationDate: purchase.expirationDate,
    receivedDate: new Date().toISOString().slice(0, 10),
  }, ...localLots(context)]);
}

export async function listSupermarketLots(context: SupermarketContext): Promise<SupermarketLotRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_lots', {
      p_company_id: context.companyId,
      p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar los lotes.', 'SUPERMARKET_LOTS_UNAVAILABLE');
    return ((data ?? []) as DatabaseLot[]).map(mapLot);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localLots(context).map((item) => ({ ...item }));
}

function emptyCashState(): SupermarketCashState {
  return {
    isOpen: false, cashId: null, name: 'Caja Supermercado', openingBalance: 0,
    expectedCash: 0, salesTotal: 0, cashPayments: 0, qrPayments: 0,
    ticketCount: 0, openedAt: null,
  };
}

function mapCashState(value: unknown): SupermarketCashState {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    isOpen: item.isOpen === true,
    cashId: typeof item.cashId === 'string' ? item.cashId : null,
    name: typeof item.name === 'string' ? item.name : 'Caja Supermercado',
    openingBalance: Number(item.openingBalance ?? 0),
    expectedCash: Number(item.expectedCash ?? 0),
    salesTotal: Number(item.salesTotal ?? 0),
    cashPayments: Number(item.cashPayments ?? 0),
    qrPayments: Number(item.qrPayments ?? 0),
    ticketCount: Number(item.ticketCount ?? 0),
    openedAt: typeof item.openedAt === 'string' ? item.openedAt : null,
  };
}

export async function getSupermarketCashState(context: SupermarketContext): Promise<SupermarketCashState> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_get_cash_state', {
      p_company_id: context.companyId,
      p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar la caja.', 'SUPERMARKET_CASH_UNAVAILABLE');
    return mapCashState(data);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return { ...(localState.cash.get(localKey(context)) ?? emptyCashState()) };
}

export async function openSupermarketCash(context: SupermarketContext, openingBalance: number): Promise<SupermarketCashState> {
  if (isServerSupabaseAdminConfigured) {
    const { error } = await createAdminServerClient().rpc('supermarket_open_cash', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
      p_user_id: context.userId, p_opening_balance: openingBalance,
    });
    if (error?.message.includes('CASH_ALREADY_OPEN')) throw new ApiError(409, 'Ya existe una caja abierta.', 'CASH_ALREADY_OPEN');
    if (error) throw new ApiError(503, 'No se pudo abrir la caja.', 'SUPERMARKET_CASH_UNAVAILABLE');
    return getSupermarketCashState(context);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const state: SupermarketCashState = {
    ...emptyCashState(), isOpen: true, cashId: `cash-${crypto.randomUUID()}`,
    openingBalance, expectedCash: openingBalance, openedAt: new Date().toISOString(),
  };
  localState.cash.set(localKey(context), state);
  return { ...state };
}

export async function closeSupermarketCash(context: SupermarketContext, declaredCash: number) {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_close_cash', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
      p_user_id: context.userId, p_declared_cash: declaredCash,
    });
    if (error?.message.includes('CASH_NOT_OPEN')) throw new ApiError(409, 'No hay una caja abierta.', 'CASH_NOT_OPEN');
    if (error) throw new ApiError(503, 'No se pudo cerrar la caja.', 'SUPERMARKET_CASH_UNAVAILABLE');
    return data as { cashId: string; expectedCash: number; declaredCash: number; difference: number };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const state = localState.cash.get(localKey(context));
  if (!state?.isOpen) throw new ApiError(409, 'No hay una caja abierta.', 'CASH_NOT_OPEN');
  localState.cash.set(localKey(context), emptyCashState());
  return { cashId: state.cashId!, expectedCash: state.expectedCash, declaredCash, difference: declaredCash - state.expectedCash };
}

export async function commitSupermarketSale(context: SupermarketContext, input: SupermarketSaleInput): Promise<SupermarketSaleResult> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_commit_sale', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_payment_method: input.paymentMethod, p_items: input.items,
    });
    if (error?.message.includes('CASH_NOT_OPEN')) throw new ApiError(409, 'Debe abrir la caja antes de cobrar.', 'CASH_NOT_OPEN');
    if (error?.message.includes('INSUFFICIENT_STOCK')) throw new ApiError(409, 'El stock cambio y ya no alcanza para completar la venta.', 'INSUFFICIENT_STOCK');
    if (error?.message.includes('PRODUCT_NOT_FOUND')) throw new ApiError(404, 'Uno de los productos ya no esta disponible.', 'PRODUCT_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo confirmar la venta.', 'SUPERMARKET_SALE_UNAVAILABLE');
    return data as SupermarketSaleResult;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const resultKey = `${context.companyId}:${input.idempotencyKey}`;
  const previous = localState.saleResults.get(resultKey);
  if (previous) return { ...previous, duplicate: true };
  const cash = localState.cash.get(localKey(context));
  if (!cash?.isOpen) throw new ApiError(409, 'Debe abrir la caja antes de cobrar.', 'CASH_NOT_OPEN');
  const products = localProducts(context);
  let total = 0;
  let netTotal = 0;
  let discountTotal = 0;
  const lines: LocalSupermarketSale['lines'] = [];
  for (const item of input.items) {
    const product = products.find((candidate) => candidate.id === item.productId && candidate.active);
    if (!product) throw new ApiError(404, 'Uno de los productos ya no esta disponible.', 'PRODUCT_NOT_FOUND');
    if (product.stock < item.quantity) throw new ApiError(409, 'El stock ya no alcanza.', 'INSUFFICIENT_STOCK');
    const list = product.price * item.quantity;
    const lineTotal = product.promo === '30off'
      ? list * 0.7
      : product.promo === '2x1' && !product.isWeighed
        ? Math.ceil(item.quantity / 2) * product.price
        : list;
    const lineNet = lineTotal / 1.21;
    total += lineTotal;
    netTotal += lineNet;
    discountTotal += list - lineTotal;
    lines.push({
      productId: product.id, name: product.name, category: product.category,
      quantity: item.quantity, netSales: Number(lineNet.toFixed(2)),
      cost: Number((product.cost * item.quantity).toFixed(2)),
    });
  }
  localState.products.set(localKey(context), products.map((product) => {
    const item = input.items.find((candidate) => candidate.productId === product.id);
    return item ? { ...product, stock: product.stock - item.quantity } : product;
  }));
  const roundedTotal = Number(total.toFixed(2));
  const roundedNet = Number(netTotal.toFixed(2));
  const result: SupermarketSaleResult = {
    saleId: `sale-${crypto.randomUUID()}`, total: roundedTotal,
    subtotal: roundedNet, taxAmount: Number((roundedTotal - roundedNet).toFixed(2)),
    discount: Number(discountTotal.toFixed(2)), fiscalStatus: 'pending', duplicate: false,
  };
  localState.saleResults.set(resultKey, result);
  const companySales = localState.sales.get(context.companyId) ?? [];
  localState.sales.set(context.companyId, [{
    id: result.saleId, branchId: branchId(context), paymentMethod: input.paymentMethod,
    total: result.total, netTotal: result.subtotal, taxTotal: result.taxAmount,
    discountTotal: result.discount, createdAt: new Date().toISOString(), lines,
  }, ...companySales]);
  localState.cash.set(localKey(context), {
    ...cash, salesTotal: cash.salesTotal + roundedTotal, ticketCount: cash.ticketCount + 1,
    cashPayments: cash.cashPayments + (input.paymentMethod === 'cash' ? roundedTotal : 0),
    qrPayments: cash.qrPayments + (input.paymentMethod === 'qr' ? roundedTotal : 0),
    expectedCash: cash.expectedCash + (input.paymentMethod === 'cash' ? roundedTotal : 0),
  });
  return result;
}

function normalizeSupermarketSalesReport(value: Record<string, unknown>): SupermarketSalesReportRecord {
  const summary = (value.summary ?? {}) as Record<string, unknown>;
  const rows = (input: unknown): Array<Record<string, unknown>> => Array.isArray(input) ? input as Array<Record<string, unknown>> : [];
  return {
    from: String(value.from ?? ''), to: String(value.to ?? ''),
    branchId: value.branchId ? String(value.branchId) : null,
    summary: {
      salesTotal: Number(summary.salesTotal ?? 0), netTotal: Number(summary.netTotal ?? 0),
      taxTotal: Number(summary.taxTotal ?? 0), discountTotal: Number(summary.discountTotal ?? 0),
      costTotal: Number(summary.costTotal ?? 0), grossProfit: Number(summary.grossProfit ?? 0),
      marginPercent: Number(summary.marginPercent ?? 0), tickets: Number(summary.tickets ?? 0),
      averageTicket: Number(summary.averageTicket ?? 0), previousSalesTotal: Number(summary.previousSalesTotal ?? 0),
      previousGrossProfit: Number(summary.previousGrossProfit ?? 0), returnsCount: Number(summary.returnsCount ?? 0),
      returnsValue: Number(summary.returnsValue ?? 0), costedLines: Number(summary.costedLines ?? 0),
      totalLines: Number(summary.totalLines ?? 0), costCoveragePercent: Number(summary.costCoveragePercent ?? 100),
    },
    daily: rows(value.daily).map((item) => ({
      day: String(item.day), sales: Number(item.sales), cost: Number(item.cost),
      profit: Number(item.profit), tickets: Number(item.tickets),
    })),
    payments: rows(value.payments).map((item) => ({
      method: item.method as 'cash' | 'qr', amount: Number(item.amount), tickets: Number(item.tickets),
    })),
    categories: rows(value.categories).map((item) => ({
      category: String(item.category), quantity: Number(item.quantity), netSales: Number(item.netSales),
      cost: Number(item.cost), profit: Number(item.profit), marginPercent: Number(item.marginPercent),
    })),
    products: rows(value.products).map((item) => ({
      productId: String(item.productId), name: String(item.name), category: String(item.category),
      quantity: Number(item.quantity), netSales: Number(item.netSales), cost: Number(item.cost),
      profit: Number(item.profit), marginPercent: Number(item.marginPercent),
    })),
    branches: rows(value.branches).map((item) => ({
      branchId: String(item.branchId), name: String(item.name), sales: Number(item.sales),
      cost: Number(item.cost), profit: Number(item.profit), marginPercent: Number(item.marginPercent),
      tickets: Number(item.tickets),
    })),
  };
}

const reportRound = (value: number) => Number(value.toFixed(2));

export async function getSupermarketSalesReport(
  context: SupermarketContext,
  from: Date,
  to: Date,
  selectedBranchId: string | null,
): Promise<SupermarketSalesReportRecord> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_sales_report', {
      p_company_id: context.companyId, p_branch_id: selectedBranchId,
      p_from: from.toISOString(), p_to: to.toISOString(),
    });
    if (error?.message.includes('INVALID_REPORT_PERIOD')) {
      throw new ApiError(400, 'El periodo del reporte no es valido.', 'INVALID_REPORT_PERIOD');
    }
    if (error?.message.includes('BRANCH_COMPANY_MISMATCH')) {
      throw new ApiError(404, 'La sucursal no pertenece a esta empresa.', 'BRANCH_NOT_FOUND');
    }
    if (error || !data || typeof data !== 'object') {
      throw new ApiError(503, 'No se pudo generar el reporte del supermercado.', 'SUPERMARKET_REPORT_UNAVAILABLE');
    }
    return normalizeSupermarketSalesReport(data as Record<string, unknown>);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const allSales = localState.sales.get(context.companyId) ?? [];
  const inScope = (sale: LocalSupermarketSale, start: Date, end: Date) => {
    const createdAt = new Date(sale.createdAt).getTime();
    return createdAt >= start.getTime() && createdAt < end.getTime()
      && (!selectedBranchId || sale.branchId === selectedBranchId);
  };
  const sales = allSales.filter((sale) => inScope(sale, from, to));
  const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));
  const previous = allSales.filter((sale) => inScope(sale, previousFrom, from));
  const categoryMap = new Map<string, SupermarketSalesReportRecord['categories'][number]>();
  const productMap = new Map<string, SupermarketSalesReportRecord['products'][number]>();
  const branchMap = new Map<string, SupermarketSalesReportRecord['branches'][number]>();
  const dailyMap = new Map<string, SupermarketSalesReportRecord['daily'][number]>();
  const paymentMap = new Map<'cash' | 'qr', SupermarketSalesReportRecord['payments'][number]>();
  let totalLines = 0;

  for (const sale of sales) {
    const saleCost = sale.lines.reduce((sum, line) => sum + line.cost, 0);
    const day = sale.createdAt.slice(0, 10);
    const daily = dailyMap.get(day) ?? { day, sales: 0, cost: 0, profit: 0, tickets: 0 };
    daily.sales += sale.total; daily.cost += saleCost; daily.profit += sale.netTotal - saleCost; daily.tickets += 1;
    dailyMap.set(day, daily);
    const payment = paymentMap.get(sale.paymentMethod) ?? { method: sale.paymentMethod, amount: 0, tickets: 0 };
    payment.amount += sale.total; payment.tickets += 1; paymentMap.set(sale.paymentMethod, payment);
    const branch = branchMap.get(sale.branchId) ?? {
      branchId: sale.branchId, name: sale.branchId === context.branchId ? 'Sucursal actual' : 'Sucursal',
      sales: 0, cost: 0, profit: 0, marginPercent: 0, tickets: 0,
    };
    branch.sales += sale.total; branch.cost += saleCost; branch.profit += sale.netTotal - saleCost; branch.tickets += 1;
    branchMap.set(sale.branchId, branch);
    for (const line of sale.lines) {
      totalLines += 1;
      const category = categoryMap.get(line.category) ?? {
        category: line.category, quantity: 0, netSales: 0, cost: 0, profit: 0, marginPercent: 0,
      };
      category.quantity += line.quantity; category.netSales += line.netSales; category.cost += line.cost;
      category.profit += line.netSales - line.cost; categoryMap.set(line.category, category);
      const product = productMap.get(line.productId) ?? {
        productId: line.productId, name: line.name, category: line.category,
        quantity: 0, netSales: 0, cost: 0, profit: 0, marginPercent: 0,
      };
      product.quantity += line.quantity; product.netSales += line.netSales; product.cost += line.cost;
      product.profit += line.netSales - line.cost; productMap.set(line.productId, product);
    }
  }

  const withMargin = <T extends { netSales: number; profit: number }>(row: T) => ({
    ...row, netSales: reportRound(row.netSales), profit: reportRound(row.profit),
    marginPercent: row.netSales ? reportRound(row.profit * 100 / row.netSales) : 0,
  });
  const salesTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
  const netTotal = sales.reduce((sum, sale) => sum + sale.netTotal, 0);
  const costTotal = sales.flatMap((sale) => sale.lines).reduce((sum, line) => sum + line.cost, 0);
  const grossProfit = netTotal - costTotal;
  return {
    from: from.toISOString(), to: to.toISOString(), branchId: selectedBranchId,
    summary: {
      salesTotal: reportRound(salesTotal), netTotal: reportRound(netTotal),
      taxTotal: reportRound(sales.reduce((sum, sale) => sum + sale.taxTotal, 0)),
      discountTotal: reportRound(sales.reduce((sum, sale) => sum + sale.discountTotal, 0)),
      costTotal: reportRound(costTotal), grossProfit: reportRound(grossProfit),
      marginPercent: netTotal ? reportRound(grossProfit * 100 / netTotal) : 0,
      tickets: sales.length, averageTicket: sales.length ? reportRound(salesTotal / sales.length) : 0,
      previousSalesTotal: reportRound(previous.reduce((sum, sale) => sum + sale.total, 0)),
      previousGrossProfit: reportRound(previous.reduce((sum, sale) => sum + sale.netTotal - sale.lines.reduce((lineSum, line) => lineSum + line.cost, 0), 0)),
      returnsCount: 0, returnsValue: 0, costedLines: totalLines, totalLines, costCoveragePercent: 100,
    },
    daily: [...dailyMap.values()].map((row) => ({ ...row, sales: reportRound(row.sales), cost: reportRound(row.cost), profit: reportRound(row.profit) })).sort((a, b) => a.day.localeCompare(b.day)),
    payments: [...paymentMap.values()].map((row) => ({ ...row, amount: reportRound(row.amount) })).sort((a, b) => b.amount - a.amount),
    categories: [...categoryMap.values()].map(withMargin).map((row) => ({ ...row, cost: reportRound(row.cost) })).sort((a, b) => b.netSales - a.netSales),
    products: [...productMap.values()].map(withMargin).map((row) => ({ ...row, cost: reportRound(row.cost) })).sort((a, b) => b.netSales - a.netSales),
    branches: [...branchMap.values()].map((row) => ({
      ...row, sales: reportRound(row.sales), cost: reportRound(row.cost), profit: reportRound(row.profit),
      marginPercent: row.profit + row.cost ? reportRound(row.profit * 100 / (row.profit + row.cost)) : 0,
    })).sort((a, b) => b.sales - a.sales),
  };
}

export async function registerSupermarketReturn(context: SupermarketContext, input: SupermarketReturnInput): Promise<SupermarketReturnResult> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_register_return', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_barcode: input.barcode,
      p_quantity: input.quantity, p_reason: input.reason, p_disposition: input.disposition,
    });
    if (error?.message.includes('CASH_NOT_OPEN')) throw new ApiError(409, 'Debe abrir la caja para registrar la devolucion.', 'CASH_NOT_OPEN');
    if (error?.message.includes('PRODUCT_NOT_FOUND')) throw new ApiError(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo registrar la devolucion.', 'SUPERMARKET_RETURN_UNAVAILABLE');
    return data as SupermarketReturnResult;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const resultKey = `${context.companyId}:${input.idempotencyKey}`;
  const previous = localState.returnResults.get(resultKey);
  if (previous) return { ...previous, duplicate: true };
  const products = localProducts(context);
  const product = products.find((candidate) => candidate.barcode === input.barcode);
  if (!product) throw new ApiError(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND');
  if (input.disposition === 'restock') localState.products.set(localKey(context), products.map((candidate) => candidate.id === product.id ? { ...candidate, stock: candidate.stock + input.quantity } : candidate));
  const result: SupermarketReturnResult = { returnId: `return-${crypto.randomUUID()}`, productId: product.id, productName: product.name, disposition: input.disposition, duplicate: false };
  localState.returnResults.set(resultKey, result);
  return result;
}

export async function listSupermarketBranches(context: SupermarketContext): Promise<SupermarketBranchRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_branches', {
      p_company_id: context.companyId,
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las sucursales.', 'SUPERMARKET_BRANCHES_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), name: String(item.name), isMain: item.is_main === true,
      productCount: Number(item.product_count ?? 0), stockUnits: Number(item.stock_units ?? 0),
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const currentBranch = branchId(context);
  return [{
    id: currentBranch, name: 'Sucursal actual', isMain: true,
    productCount: localProducts(context).length,
    stockUnits: localProducts(context).reduce((sum, product) => sum + product.stock, 0),
  }];
}

export async function listSupermarketInventoryEvents(context: SupermarketContext): Promise<SupermarketInventoryEventRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_inventory_events', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar el historial de inventario.', 'SUPERMARKET_INVENTORY_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), productId: String(item.product_id), productName: String(item.product_name),
      operation: item.operation as 'count' | 'waste', previousQuantity: Number(item.previous_quantity),
      declaredQuantity: Number(item.declared_quantity), delta: Number(item.delta),
      reason: String(item.reason), createdAt: String(item.created_at),
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return (localState.inventoryEvents.get(localKey(context)) ?? []).map((item) => ({ ...item }));
}

export async function adjustSupermarketInventory(
  context: SupermarketContext,
  input: SupermarketInventoryAdjustmentInput,
): Promise<{ eventId: string; operation: 'count' | 'waste'; previousQuantity: number; newQuantity: number; delta: number; duplicate: boolean }> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.productId)) throw new ApiError(400, 'El producto no es valido.', 'INVALID_PRODUCT_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_adjust_inventory', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_product_id: input.productId,
      p_operation: input.operation, p_quantity: input.quantity, p_reason: input.reason,
    });
    if (error?.message.includes('INSUFFICIENT_STOCK')) throw new ApiError(409, 'La merma supera el stock disponible.', 'INSUFFICIENT_STOCK');
    if (error?.message.includes('PRODUCT_NOT_FOUND')) throw new ApiError(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo registrar el control de inventario.', 'SUPERMARKET_INVENTORY_UNAVAILABLE');
    return data as { eventId: string; operation: 'count' | 'waste'; previousQuantity: number; newQuantity: number; delta: number; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const events = localState.inventoryEvents.get(localKey(context)) ?? [];
  const duplicate = events.find((event) => event.id === input.idempotencyKey);
  if (duplicate) return { eventId: duplicate.id, operation: duplicate.operation, previousQuantity: duplicate.previousQuantity, newQuantity: duplicate.previousQuantity + duplicate.delta, delta: duplicate.delta, duplicate: true };
  const products = localProducts(context);
  const product = products.find((item) => item.id === input.productId);
  if (!product) throw new ApiError(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND');
  const delta = input.operation === 'count' ? input.quantity - product.stock : -input.quantity;
  if (product.stock + delta < 0) throw new ApiError(409, 'La merma supera el stock disponible.', 'INSUFFICIENT_STOCK');
  localState.products.set(localKey(context), products.map((item) => item.id === product.id ? { ...item, stock: item.stock + delta } : item));
  const event: SupermarketInventoryEventRecord = {
    id: input.idempotencyKey, productId: product.id, productName: product.name, operation: input.operation,
    previousQuantity: product.stock, declaredQuantity: input.quantity, delta,
    reason: input.reason, createdAt: new Date().toISOString(),
  };
  localState.inventoryEvents.set(localKey(context), [event, ...events]);
  return { eventId: event.id, operation: event.operation, previousQuantity: product.stock, newQuantity: product.stock + delta, delta, duplicate: false };
}

export async function listSupermarketTransfers(context: SupermarketContext): Promise<SupermarketTransferRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_transfers', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las transferencias.', 'SUPERMARKET_TRANSFERS_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), transferNumber: Number(item.transfer_number),
      sourceBranchId: String(item.source_branch_id), sourceBranchName: String(item.source_branch_name),
      destinationBranchId: String(item.destination_branch_id), destinationBranchName: String(item.destination_branch_name),
      productId: String(item.product_id), productName: String(item.product_name), quantity: Number(item.quantity),
      status: item.status as 'completed' | 'cancelled', notes: String(item.notes ?? ''), createdAt: String(item.created_at),
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return (localState.transfers.get(localKey(context)) ?? []).map((item) => ({ ...item }));
}

export async function createSupermarketTransfer(
  context: SupermarketContext,
  input: SupermarketTransferInput,
): Promise<{ transferId: string; transferNumber: number; duplicate: boolean }> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.destinationBranchId) || !isUuid(input.productId)) throw new ApiError(400, 'La transferencia no es valida.', 'INVALID_TRANSFER');
    const { data, error } = await createAdminServerClient().rpc('supermarket_create_transfer', {
      p_company_id: context.companyId, p_source_branch_id: branchId(context),
      p_destination_branch_id: input.destinationBranchId, p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_product_id: input.productId,
      p_quantity: input.quantity, p_notes: input.notes,
    });
    if (error?.message.includes('INSUFFICIENT_STOCK')) throw new ApiError(409, 'No hay stock suficiente para transferir.', 'INSUFFICIENT_STOCK');
    if (error?.message.includes('BRANCH_COMPANY_MISMATCH')) throw new ApiError(404, 'La sucursal destino no pertenece a la empresa.', 'BRANCH_NOT_FOUND');
    if (error?.message.includes('PRODUCT_NOT_FOUND')) throw new ApiError(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo completar la transferencia.', 'SUPERMARKET_TRANSFERS_UNAVAILABLE');
    return data as { transferId: string; transferNumber: number; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  throw new ApiError(409, 'Debe configurar una segunda sucursal para transferir stock.', 'DESTINATION_BRANCH_REQUIRED');
}

export async function applySupermarketBulkPrices(
  context: SupermarketContext,
  input: SupermarketBulkPriceInput,
): Promise<{ batchId: string; updatedCount: number; duplicate: boolean }> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_apply_bulk_prices', {
      p_company_id: context.companyId, p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_description: input.description, p_items: input.items,
    });
    if (error?.message.includes('PRODUCT_NOT_FOUND')) throw new ApiError(404, 'Uno de los productos no existe.', 'PRODUCT_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo aplicar el lote de precios.', 'SUPERMARKET_PRICES_UNAVAILABLE');
    return data as { batchId: string; updatedCount: number; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const resultKey = `${context.companyId}:${input.idempotencyKey}`;
  const previous = localState.bulkPriceResults.get(resultKey);
  if (previous) return { ...previous, duplicate: true };
  const products = localProducts(context);
  for (const item of input.items) {
    if (!products.some((product) => product.id === item.productId)) throw new ApiError(404, 'Uno de los productos no existe.', 'PRODUCT_NOT_FOUND');
  }
  localState.products.set(localKey(context), products.map((product) => {
    const update = input.items.find((item) => item.productId === product.id);
    return update ? { ...product, price: update.newPrice, promo: update.promo } : product;
  }));
  const result = { batchId: `prices-${crypto.randomUUID()}`, updatedCount: input.items.length, duplicate: false };
  localState.bulkPriceResults.set(resultKey, result);
  return result;
}

export async function listSupermarketLocations(context: SupermarketContext): Promise<SupermarketLocationRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_locations', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las ubicaciones.', 'SUPERMARKET_LAYOUT_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), code: String(item.code), zone: String(item.zone),
      aisle: String(item.aisle ?? ''), shelf: String(item.shelf ?? ''), bin: String(item.bin ?? ''),
      description: String(item.description ?? ''), active: item.active === true,
      assignedProducts: Number(item.assigned_products ?? 0),
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localLocations(context).map((item) => ({ ...item }));
}

export async function saveSupermarketLocation(
  context: SupermarketContext,
  input: SupermarketLocationInput,
): Promise<SupermarketLocationRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'La ubicacion no es valida.', 'INVALID_LOCATION_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_location', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_location_id: input.id ?? null, p_code: input.code, p_zone: input.zone,
      p_aisle: input.aisle, p_shelf: input.shelf, p_bin: input.bin,
      p_description: input.description, p_active: input.active,
    });
    if (error?.message.includes('STORE_LOCATION_CODE_EXISTS')) throw new ApiError(409, 'Ya existe una ubicacion con ese codigo.', 'STORE_LOCATION_CODE_EXISTS');
    if (error?.message.includes('STORE_LOCATION_NOT_FOUND')) throw new ApiError(404, 'La ubicacion no existe.', 'STORE_LOCATION_NOT_FOUND');
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar la ubicacion.', 'SUPERMARKET_LAYOUT_UNAVAILABLE');
    const saved = (await listSupermarketLocations(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'La ubicacion no pudo recuperarse.', 'SUPERMARKET_LAYOUT_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const locations = localLocations(context);
  const duplicate = locations.find((item) => item.code.toUpperCase() === input.code.toUpperCase() && item.id !== input.id);
  if (duplicate) throw new ApiError(409, 'Ya existe una ubicacion con ese codigo.', 'STORE_LOCATION_CODE_EXISTS');
  const previous = input.id ? locations.find((item) => item.id === input.id) : undefined;
  if (input.id && !previous) throw new ApiError(404, 'La ubicacion no existe.', 'STORE_LOCATION_NOT_FOUND');
  const saved: SupermarketLocationRecord = {
    ...input, id: previous?.id ?? `location-${crypto.randomUUID()}`,
    code: input.code.toUpperCase(), assignedProducts: previous?.assignedProducts ?? 0,
  };
  localState.locations.set(localKey(context), previous
    ? locations.map((item) => item.id === saved.id ? saved : item)
    : [saved, ...locations]);
  return { ...saved };
}

export async function listSupermarketPlacements(context: SupermarketContext): Promise<SupermarketPlacementRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_placements', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar la distribucion de productos.', 'SUPERMARKET_LAYOUT_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), productId: String(item.product_id), productName: String(item.product_name),
      barcode: String(item.barcode ?? ''), locationId: String(item.location_id),
      locationCode: String(item.location_code), zone: String(item.zone),
      facingCount: Number(item.facing_count), capacity: Number(item.capacity),
      reorderPoint: Number(item.reorder_point), stock: Number(item.stock),
      needsRestock: item.needs_restock === true,
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const products = localProducts(context);
  return localPlacements(context).map((item) => {
    const stock = products.find((product) => product.id === item.productId)?.stock ?? item.stock;
    return { ...item, stock, needsRestock: stock <= item.reorderPoint };
  });
}

export async function saveSupermarketPlacement(
  context: SupermarketContext,
  input: SupermarketPlacementInput,
): Promise<SupermarketPlacementRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.productId) || !isUuid(input.locationId)) throw new ApiError(400, 'La asignacion no es valida.', 'INVALID_PLACEMENT');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_placement', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_product_id: input.productId, p_location_id: input.locationId,
      p_facing_count: input.facingCount, p_capacity: input.capacity, p_reorder_point: input.reorderPoint,
    });
    if (error?.message.includes('PRODUCT_NOT_FOUND')) throw new ApiError(404, 'El producto no existe.', 'PRODUCT_NOT_FOUND');
    if (error?.message.includes('STORE_LOCATION_NOT_FOUND')) throw new ApiError(404, 'La ubicacion no existe o esta inactiva.', 'STORE_LOCATION_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo asignar el producto.', 'SUPERMARKET_LAYOUT_UNAVAILABLE');
    const saved = (await listSupermarketPlacements(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'La asignacion no pudo recuperarse.', 'SUPERMARKET_LAYOUT_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const product = localProducts(context).find((item) => item.id === input.productId);
  const location = localLocations(context).find((item) => item.id === input.locationId && item.active);
  if (!product) throw new ApiError(404, 'El producto no existe.', 'PRODUCT_NOT_FOUND');
  if (!location) throw new ApiError(404, 'La ubicacion no existe o esta inactiva.', 'STORE_LOCATION_NOT_FOUND');
  const placements = localPlacements(context);
  const previous = placements.find((item) => item.productId === input.productId);
  const saved: SupermarketPlacementRecord = {
    id: previous?.id ?? `placement-${crypto.randomUUID()}`, productId: product.id,
    productName: product.name, barcode: product.barcode, locationId: location.id,
    locationCode: location.code, zone: location.zone, facingCount: input.facingCount,
    capacity: input.capacity, reorderPoint: input.reorderPoint, stock: product.stock,
    needsRestock: product.stock <= input.reorderPoint,
  };
  localState.placements.set(localKey(context), previous
    ? placements.map((item) => item.id === previous.id ? saved : item)
    : [saved, ...placements]);
  localState.locations.set(localKey(context), localLocations(context).map((item) => ({
    ...item, assignedProducts: (previous?.locationId === item.id ? item.assignedProducts - 1 : item.assignedProducts)
      + (location.id === item.id ? 1 : 0),
  })));
  return { ...saved };
}

export async function listSupermarketLabelJobs(context: SupermarketContext): Promise<SupermarketLabelJobRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_label_jobs', {
      p_company_id: context.companyId, p_branch_id: branchId(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las etiquetas.', 'SUPERMARKET_LABELS_UNAVAILABLE');
    const jobs = new Map<string, SupermarketLabelJobRecord>();
    for (const item of (data ?? []) as Array<Record<string, unknown>>) {
      const id = String(item.job_id);
      const job = jobs.get(id) ?? {
        id, labelSize: item.label_size as SupermarketLabelSize,
        status: item.status as 'pending' | 'printed', itemCount: Number(item.item_count),
        createdAt: String(item.created_at), printedAt: item.printed_at ? String(item.printed_at) : null, lines: [],
      };
      job.lines.push({
        id: String(item.line_id), productId: String(item.product_id), productName: String(item.product_name),
        barcode: String(item.barcode ?? ''), price: Number(item.price), promo: item.promo as SupermarketPromo,
        locationCode: String(item.location_code ?? ''), copies: Number(item.copies),
      });
      jobs.set(id, job);
    }
    return Array.from(jobs.values());
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return (localState.labelJobs.get(localKey(context)) ?? []).map((job) => ({ ...job, lines: job.lines.map((line) => ({ ...line })) }));
}

export async function createSupermarketLabelJob(
  context: SupermarketContext,
  input: SupermarketLabelJobInput,
): Promise<{ job: SupermarketLabelJobRecord; duplicate: boolean }> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_create_label_job', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_label_size: input.labelSize, p_items: input.items,
    });
    if (error?.message.includes('PRODUCT_NOT_FOUND')) throw new ApiError(404, 'Uno de los productos no existe.', 'PRODUCT_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo crear el trabajo de etiquetas.', 'SUPERMARKET_LABELS_UNAVAILABLE');
    const result = data as { labelJobId: string; duplicate: boolean };
    const job = (await listSupermarketLabelJobs(context)).find((item) => item.id === result.labelJobId);
    if (!job) throw new ApiError(503, 'El trabajo de etiquetas no pudo recuperarse.', 'SUPERMARKET_LABELS_UNAVAILABLE');
    return { job, duplicate: result.duplicate };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const resultKey = `${context.companyId}:${input.idempotencyKey}`;
  const previousResult = localState.labelJobResults.get(resultKey);
  if (previousResult) {
    const previousJob = (localState.labelJobs.get(localKey(context)) ?? []).find((item) => item.id === previousResult.labelJobId);
    if (previousJob) return { job: { ...previousJob, lines: previousJob.lines.map((line) => ({ ...line })) }, duplicate: true };
  }
  const products = localProducts(context);
  const placements = localPlacements(context);
  const lines = input.items.map((item): SupermarketLabelLineRecord => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw new ApiError(404, 'Uno de los productos no existe.', 'PRODUCT_NOT_FOUND');
    return {
      id: `label-line-${crypto.randomUUID()}`, productId: product.id, productName: product.name,
      barcode: product.barcode, price: product.price, promo: product.promo,
      locationCode: placements.find((candidate) => candidate.productId === product.id)?.locationCode ?? '', copies: item.copies,
    };
  });
  const job: SupermarketLabelJobRecord = {
    id: `label-job-${crypto.randomUUID()}`, labelSize: input.labelSize, status: 'pending',
    itemCount: lines.reduce((sum, line) => sum + line.copies, 0), createdAt: new Date().toISOString(),
    printedAt: null, lines,
  };
  localState.labelJobs.set(localKey(context), [job, ...(localState.labelJobs.get(localKey(context)) ?? [])]);
  localState.labelJobResults.set(resultKey, { labelJobId: job.id, itemCount: job.itemCount, duplicate: false });
  return { job: { ...job, lines: job.lines.map((line) => ({ ...line })) }, duplicate: false };
}

export async function markSupermarketLabelJobPrinted(
  context: SupermarketContext,
  jobId: string,
): Promise<{ labelJobId: string; status: 'printed'; duplicate: boolean }> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(jobId)) throw new ApiError(400, 'El trabajo de etiquetas no es valido.', 'INVALID_LABEL_JOB');
    const { data, error } = await createAdminServerClient().rpc('supermarket_mark_label_job_printed', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId, p_job_id: jobId,
    });
    if (error?.message.includes('LABEL_JOB_NOT_FOUND')) throw new ApiError(404, 'El trabajo de etiquetas no existe.', 'LABEL_JOB_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudo confirmar la impresion.', 'SUPERMARKET_LABELS_UNAVAILABLE');
    return data as { labelJobId: string; status: 'printed'; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const jobs = localState.labelJobs.get(localKey(context)) ?? [];
  const job = jobs.find((item) => item.id === jobId);
  if (!job) throw new ApiError(404, 'El trabajo de etiquetas no existe.', 'LABEL_JOB_NOT_FOUND');
  const duplicate = job.status === 'printed';
  localState.labelJobs.set(localKey(context), jobs.map((item) => item.id === jobId
    ? { ...item, status: 'printed', printedAt: item.printedAt ?? new Date().toISOString() }
    : item));
  return { labelJobId: jobId, status: 'printed', duplicate };
}
