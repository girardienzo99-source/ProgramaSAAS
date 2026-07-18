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

interface LocalSupermarketState {
  products: Map<string, SupermarketProductRecord[]>;
  purchases: Map<string, SupermarketPurchaseRecord[]>;
  lots: Map<string, SupermarketLotRecord[]>;
}

const globalWithSupermarket = globalThis as typeof globalThis & { __programaSassSupermarket?: LocalSupermarketState };
const localState = globalWithSupermarket.__programaSassSupermarket ?? {
  products: new Map<string, SupermarketProductRecord[]>(),
  purchases: new Map<string, SupermarketPurchaseRecord[]>(),
  lots: new Map<string, SupermarketLotRecord[]>(),
};
globalWithSupermarket.__programaSassSupermarket = localState;

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
