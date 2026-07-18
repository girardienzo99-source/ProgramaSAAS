import { ApiError, isUuid } from './core';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

export interface GastronomyMenuItemRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  vatRate: number;
  active: boolean;
  imageUrl: string | null;
  createdAt: string;
}

interface DatabaseMenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number | string;
  cost: number | string;
  stock: number | string;
  min_stock: number | string;
  vat_rate: number | string;
  active: boolean;
  image_url: string | null;
  created_at: string;
}

export type GastronomyMenuItemInput = Omit<GastronomyMenuItemRecord, 'id' | 'createdAt'> & { id?: string };

export interface GastronomyIngredientRecord {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  costPerUnit: number;
  supplier: string;
  active: boolean;
  createdAt: string;
}

export type GastronomyIngredientInput = Omit<GastronomyIngredientRecord, 'id' | 'createdAt'> & { id?: string };

export interface GastronomyRecipeLineRecord {
  ingredientId: string;
  quantity: number;
}

export interface GastronomyRecipeRecord {
  productId: string;
  portions: number;
  lines: GastronomyRecipeLineRecord[];
  updatedAt: string;
}

export interface GastronomyOrderInput {
  tableId?: string;
  tableName?: string;
  waiterName?: string;
  channel: 'dine_in' | 'takeaway' | 'delivery';
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface GastronomyOrderResult {
  orderId: string;
  orderNumber: number;
  subtotal: number;
  total: number;
  status: 'sent';
}

export interface GastronomyTableItemRecord {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface GastronomyDiningTableRecord {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked';
  capacity: number;
  total: number;
  waiter: string;
  items: GastronomyTableItemRecord[];
}

export interface GastronomyKdsOrderRecord {
  id: string;
  orderNumber: number;
  tableId: string | null;
  tableName: string;
  waiterName: string;
  items: Array<{ productId?: string; name: string; qty: number; price: number }>;
  openedAt: string;
  status: 'pending' | 'preparing' | 'ready';
}

export type GastronomyReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
export type GastronomyReservationSource = 'manual' | 'whatsapp' | 'instagram' | 'web' | 'phone';

export interface GastronomyReservationRecord {
  id: string;
  tableId: string | null;
  tableName: string;
  customerName: string;
  phone: string;
  guests: number;
  reservedFor: string;
  durationMinutes: number;
  status: GastronomyReservationStatus;
  source: GastronomyReservationSource;
  notes: string;
  createdAt: string;
}

export interface GastronomyReservationInput {
  id?: string;
  tableId?: string;
  customerName: string;
  phone: string;
  guests: number;
  reservedFor: string;
  durationMinutes: number;
  source: GastronomyReservationSource;
  notes: string;
}

export interface GastronomySupplierRecord {
  id: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export type GastronomySupplierInput = Omit<GastronomySupplierRecord, 'id' | 'createdAt'> & { id?: string };

export type GastronomyPurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface GastronomyPurchaseLineRecord {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface GastronomyPurchaseOrderRecord {
  id: string;
  orderNumber: number;
  supplierId: string;
  supplierName: string;
  status: GastronomyPurchaseStatus;
  expectedAt: string | null;
  notes: string;
  totalEstimated: number;
  createdAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
  lines: GastronomyPurchaseLineRecord[];
}

export interface GastronomyPurchaseOrderInput {
  id?: string;
  supplierId: string;
  status: 'draft' | 'ordered';
  expectedAt?: string;
  notes: string;
  lines: Array<{ ingredientId: string; quantity: number; unitCost: number }>;
}

export interface GastronomyPurchaseReceiptInput {
  orderId: string;
  notes: string;
  lines: Array<{ ingredientId: string; quantity: number; unitCost: number }>;
}

export interface GastronomyPurchaseReceiptResult {
  receiptId: string;
  receiptNumber: number;
  orderId: string;
  status: 'partially_received' | 'received';
}

export type GastronomyPaymentMethod = 'cash' | 'card' | 'qr';

export interface GastronomyCashState {
  isOpen: boolean;
  cashId: string | null;
  name: string;
  openingBalance: number;
  expectedCash: number;
  salesTotal: number;
  cashPayments: number;
  cardPayments: number;
  qrPayments: number;
  tipsTotal: number;
  openedAt: string | null;
}

export interface GastronomySettlementPaymentRecord {
  paymentNumber: number;
  method: GastronomyPaymentMethod;
  amount: number;
  reference: string;
}

export interface GastronomySettlementRecord {
  id: string;
  settlementNumber: number;
  tableName: string;
  saleId: string;
  saleTotal: number;
  tipAmount: number;
  chargedTotal: number;
  splitCount: number;
  fiscalStatus: 'pending' | 'authorized' | 'rejected' | 'not_required';
  payments: GastronomySettlementPaymentRecord[];
  createdAt: string;
  cashId?: string;
  tableId?: string;
  idempotencyKey?: string;
  subtotal?: number;
  taxAmount?: number;
  items?: Array<{ productId: string; name: string; quantity: number; total: number }>;
}

export interface GastronomySalesReportRecord {
  from: string;
  to: string;
  summary: {
    salesTotal: number;
    netTotal: number;
    taxTotal: number;
    tipsTotal: number;
    chargedTotal: number;
    settlementsCount: number;
    averageTicket: number;
    previousSalesTotal: number;
  };
  daily: Array<{ day: string; sales: number; tips: number; settlements: number }>;
  payments: Array<{ method: GastronomyPaymentMethod; amount: number; payments: number }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; total: number }>;
  fiscal: Array<{ status: GastronomySettlementRecord['fiscalStatus']; count: number; total: number }>;
}

export interface GastronomySettlementInput {
  tableId: string;
  idempotencyKey: string;
  splitCount: number;
  tipAmount: number;
  payments: Array<{ method: GastronomyPaymentMethod; amount: number; reference?: string }>;
}

export interface GastronomySettlementResult {
  settlementId: string;
  settlementNumber: number;
  saleId: string;
  saleTotal: number;
  tipAmount: number;
  chargedTotal: number;
  fiscalStatus: 'pending';
  duplicate: boolean;
}

interface LocalCashSession {
  id: string;
  openingBalance: number;
  openedAt: string;
}

type LocalKdsOrder = Omit<GastronomyKdsOrderRecord, 'status'> & {
  status: GastronomyKdsOrderRecord['status'] | 'served';
};

interface LocalGastronomyState {
  menus: Map<string, GastronomyMenuItemRecord[]>;
  ingredients: Map<string, GastronomyIngredientRecord[]>;
  recipes: Map<string, GastronomyRecipeRecord[]>;
  orderCounters: Map<string, number>;
  diningTables: Map<string, GastronomyDiningTableRecord[]>;
  kdsOrders: Map<string, LocalKdsOrder[]>;
  reservations: Map<string, GastronomyReservationRecord[]>;
  suppliers: Map<string, GastronomySupplierRecord[]>;
  purchaseOrders: Map<string, GastronomyPurchaseOrderRecord[]>;
  purchaseCounters: Map<string, number>;
  receiptCounters: Map<string, number>;
  cashSessions: Map<string, LocalCashSession>;
  settlements: Map<string, GastronomySettlementRecord[]>;
  settlementCounters: Map<string, number>;
}

const gastronomyGlobal = globalThis as typeof globalThis & {
  __programaSassGastronomyState?: LocalGastronomyState;
};
const localState: LocalGastronomyState = gastronomyGlobal.__programaSassGastronomyState ?? {
  menus: new Map<string, GastronomyMenuItemRecord[]>(),
  ingredients: new Map<string, GastronomyIngredientRecord[]>(),
  recipes: new Map<string, GastronomyRecipeRecord[]>(),
  orderCounters: new Map<string, number>(),
  diningTables: new Map<string, GastronomyDiningTableRecord[]>(),
  kdsOrders: new Map<string, LocalKdsOrder[]>(),
  reservations: new Map<string, GastronomyReservationRecord[]>(),
  suppliers: new Map<string, GastronomySupplierRecord[]>(),
  purchaseOrders: new Map<string, GastronomyPurchaseOrderRecord[]>(),
  purchaseCounters: new Map<string, number>(),
  receiptCounters: new Map<string, number>(),
  cashSessions: new Map<string, LocalCashSession>(),
  settlements: new Map<string, GastronomySettlementRecord[]>(),
  settlementCounters: new Map<string, number>(),
};
localState.reservations ??= new Map<string, GastronomyReservationRecord[]>();
localState.suppliers ??= new Map<string, GastronomySupplierRecord[]>();
localState.purchaseOrders ??= new Map<string, GastronomyPurchaseOrderRecord[]>();
localState.purchaseCounters ??= new Map<string, number>();
localState.receiptCounters ??= new Map<string, number>();
localState.cashSessions ??= new Map<string, LocalCashSession>();
localState.settlements ??= new Map<string, GastronomySettlementRecord[]>();
localState.settlementCounters ??= new Map<string, number>();
if (process.env.NODE_ENV !== 'production') gastronomyGlobal.__programaSassGastronomyState = localState;

const localMenus = localState.menus;
const localIngredients = localState.ingredients;
const localRecipes = localState.recipes;
const localOrderCounters = localState.orderCounters;
const localDiningTables = localState.diningTables;
const localKdsOrders = localState.kdsOrders;
const localReservations = localState.reservations;
const localSuppliers = localState.suppliers;
const localPurchaseOrders = localState.purchaseOrders;
const localPurchaseCounters = localState.purchaseCounters;
const localReceiptCounters = localState.receiptCounters;
const localCashSessions = localState.cashSessions;
const localSettlements = localState.settlements;
const localSettlementCounters = localState.settlementCounters;

function initialMenu(): GastronomyMenuItemRecord[] {
  const now = new Date().toISOString();
  return [
    { id: 'g1', name: 'Pizza Muzarella Grande', description: 'Masa artesanal, salsa y muzarella.', category: 'Principales', sku: 'GAS-001', price: 12500, cost: 4500, stock: 28, minStock: 8, vatRate: 21, active: true, imageUrl: null, createdAt: now },
    { id: 'g2', name: 'Hamburguesa Doble Cheddar', description: 'Doble medallon, cheddar y papas.', category: 'Principales', sku: 'GAS-002', price: 9500, cost: 3800, stock: 16, minStock: 8, vatRate: 21, active: true, imageUrl: null, createdAt: now },
    { id: 'g3', name: 'Cerveza Patagonia IPA 500ml', description: 'Botella individual fria.', category: 'Bebidas', sku: 'GAS-003', price: 4200, cost: 1500, stock: 7, minStock: 12, vatRate: 21, active: true, imageUrl: null, createdAt: now },
    { id: 'g4', name: 'Gaseosa Cola 350ml', description: 'Lata individual.', category: 'Bebidas', sku: 'GAS-004', price: 2500, cost: 800, stock: 34, minStock: 12, vatRate: 21, active: true, imageUrl: null, createdAt: now },
    { id: 'g5', name: 'Flan Casero con Dulce', description: 'Porcion individual con dulce de leche.', category: 'Postres', sku: 'GAS-005', price: 3500, cost: 1000, stock: 9, minStock: 6, vatRate: 10.5, active: true, imageUrl: null, createdAt: now },
    { id: 'g6', name: 'Cafe Cortado', description: 'Cafe espresso y leche vaporizada.', category: 'Cafeteria', sku: 'GAS-006', price: 2200, cost: 600, stock: 40, minStock: 10, vatRate: 10.5, active: true, imageUrl: null, createdAt: now },
  ];
}

function initialIngredients(): GastronomyIngredientRecord[] {
  const now = new Date().toISOString();
  return [
    { id: 'i1', name: 'Harina 000', unit: 'kg', stock: 18, minStock: 8, costPerUnit: 1100, supplier: 'Molino Central', active: true, createdAt: now },
    { id: 'i2', name: 'Muzarella', unit: 'kg', stock: 6.2, minStock: 5, costPerUnit: 8900, supplier: 'Lacteos Sur', active: true, createdAt: now },
    { id: 'i3', name: 'Salsa de tomate', unit: 'kg', stock: 4, minStock: 4.5, costPerUnit: 2600, supplier: 'Mercado Norte', active: true, createdAt: now },
    { id: 'i4', name: 'Medallon de carne', unit: 'unidad', stock: 42, minStock: 30, costPerUnit: 1150, supplier: 'Frigorifico Uno', active: true, createdAt: now },
    { id: 'i5', name: 'Cheddar', unit: 'feta', stock: 55, minStock: 40, costPerUnit: 260, supplier: 'Lacteos Sur', active: true, createdAt: now },
    { id: 'i6', name: 'Papas', unit: 'kg', stock: 9, minStock: 10, costPerUnit: 1400, supplier: 'Mercado Norte', active: true, createdAt: now },
    { id: 'i7', name: 'Cafe en grano', unit: 'kg', stock: 2.4, minStock: 1.5, costPerUnit: 18500, supplier: 'Cafe Federal', active: true, createdAt: now },
    { id: 'i8', name: 'Leche', unit: 'litro', stock: 11, minStock: 8, costPerUnit: 1600, supplier: 'Lacteos Sur', active: true, createdAt: now },
  ];
}

function initialRecipes(): GastronomyRecipeRecord[] {
  const now = new Date().toISOString();
  return [
    { productId: 'g1', portions: 1, lines: [{ ingredientId: 'i1', quantity: 0.35 }, { ingredientId: 'i2', quantity: 0.3 }, { ingredientId: 'i3', quantity: 0.18 }], updatedAt: now },
    { productId: 'g2', portions: 1, lines: [{ ingredientId: 'i4', quantity: 2 }, { ingredientId: 'i5', quantity: 2 }, { ingredientId: 'i6', quantity: 0.25 }], updatedAt: now },
    { productId: 'g6', portions: 1, lines: [{ ingredientId: 'i7', quantity: 0.018 }, { ingredientId: 'i8', quantity: 0.08 }], updatedAt: now },
  ];
}

function initialDiningTables(): GastronomyDiningTableRecord[] {
  return [
    { id: 'table-1', name: 'Mesa 1', status: 'available', capacity: 4, total: 0, waiter: '', items: [] },
    { id: 'table-2', name: 'Mesa 2', status: 'available', capacity: 2, total: 0, waiter: '', items: [] },
    { id: 'table-3', name: 'Mesa 3', status: 'reserved', capacity: 6, total: 0, waiter: '', items: [] },
    { id: 'table-4', name: 'Mesa 4', status: 'available', capacity: 4, total: 0, waiter: '', items: [] },
    { id: 'table-5', name: 'Mesa 5', status: 'available', capacity: 4, total: 0, waiter: '', items: [] },
    { id: 'table-6', name: 'Mesa 6', status: 'available', capacity: 2, total: 0, waiter: '', items: [] },
  ];
}

function localMenu(companyId: string) {
  const current = localMenus.get(companyId);
  if (current) return current;
  const seeded = initialMenu();
  localMenus.set(companyId, seeded);
  return seeded;
}

function localIngredientList(companyId: string) {
  const current = localIngredients.get(companyId);
  if (current) return current;
  const seeded = initialIngredients();
  localIngredients.set(companyId, seeded);
  return seeded;
}

function localRecipeList(companyId: string) {
  const current = localRecipes.get(companyId);
  if (current) return current;
  const seeded = initialRecipes();
  localRecipes.set(companyId, seeded);
  return seeded;
}

function localTableList(companyId: string) {
  const current = localDiningTables.get(companyId);
  if (current) return current;
  const seeded = initialDiningTables();
  localDiningTables.set(companyId, seeded);
  return seeded;
}

function localKdsOrderList(companyId: string) {
  const current = localKdsOrders.get(companyId);
  if (current) return current;
  const seeded: LocalKdsOrder[] = [];
  localKdsOrders.set(companyId, seeded);
  return seeded;
}

function persistenceUnavailable(): never {
  throw new ApiError(503, 'La persistencia gastronomica no esta configurada.', 'PERSISTENCE_NOT_CONFIGURED');
}

function mapDatabaseItem(item: DatabaseMenuItem): GastronomyMenuItemRecord {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    sku: item.sku,
    price: Number(item.price),
    cost: Number(item.cost),
    stock: Number(item.stock),
    minStock: Number(item.min_stock),
    vatRate: Number(item.vat_rate),
    active: item.active,
    imageUrl: item.image_url,
    createdAt: item.created_at,
  };
}

export async function listGastronomyMenu(companyId: string): Promise<GastronomyMenuItemRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_menu', {
      p_company_id: companyId,
    });
    if (error) throw new ApiError(503, 'No se pudo consultar la carta.', 'GASTRONOMY_CATALOG_UNAVAILABLE');
    return ((data ?? []) as DatabaseMenuItem[]).map(mapDatabaseItem);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'La persistencia gastronomica no esta configurada.', 'PERSISTENCE_NOT_CONFIGURED');
  }
  return localMenu(companyId).map((item) => ({ ...item }));
}

export async function saveGastronomyMenuItem(
  context: { companyId: string; userId: string; branchId: string | null },
  input: GastronomyMenuItemInput,
): Promise<GastronomyMenuItemRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (!context.branchId) {
      throw new ApiError(409, 'Debe seleccionar una sucursal para modificar stock.', 'BRANCH_REQUIRED');
    }
    if (input.id && !isUuid(input.id)) {
      throw new ApiError(400, 'El identificador del producto no es valido.', 'INVALID_PRODUCT_ID');
    }

    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc('gastronomy_save_menu_item', {
      p_company_id: context.companyId,
      p_user_id: context.userId,
      p_branch_id: context.branchId,
      p_product_id: input.id ?? null,
      p_name: input.name,
      p_description: input.description,
      p_category: input.category,
      p_sku: input.sku,
      p_price: input.price,
      p_cost: input.cost,
      p_stock: input.stock,
      p_min_stock: input.minStock,
      p_vat_rate: input.vatRate,
      p_active: input.active,
      p_image_url: input.imageUrl,
    });
    if (error?.message.includes('SKU_ALREADY_EXISTS')) {
      throw new ApiError(409, 'Ya existe otro producto con ese SKU.', 'SKU_ALREADY_EXISTS');
    }
    if (error || typeof data !== 'string') {
      throw new ApiError(503, 'No se pudo guardar el producto.', 'GASTRONOMY_CATALOG_UNAVAILABLE');
    }
    const menu = await listGastronomyMenu(context.companyId);
    const saved = menu.find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'El producto se guardo pero no pudo recuperarse.', 'GASTRONOMY_CATALOG_UNAVAILABLE');
    return saved;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'La persistencia gastronomica no esta configurada.', 'PERSISTENCE_NOT_CONFIGURED');
  }
  const current = localMenu(context.companyId);
  const duplicate = current.find((item) => item.sku === input.sku && item.id !== input.id);
  if (duplicate) throw new ApiError(409, 'Ya existe otro producto con ese SKU.', 'SKU_ALREADY_EXISTS');

  const saved: GastronomyMenuItemRecord = {
    ...input,
    id: input.id || `g-${crypto.randomUUID()}`,
    createdAt: input.id
      ? current.find((item) => item.id === input.id)?.createdAt ?? new Date().toISOString()
      : new Date().toISOString(),
  };
  localMenus.set(
    context.companyId,
    input.id ? current.map((item) => item.id === input.id ? saved : item) : [saved, ...current],
  );
  return { ...saved };
}

interface DatabaseIngredient {
  id: string;
  name: string;
  unit: string;
  stock: number | string;
  min_stock: number | string;
  cost_per_unit: number | string;
  supplier: string;
  active: boolean;
  created_at: string;
}

interface DatabaseRecipe {
  product_id: string;
  portions: number | string;
  lines: Array<{ ingredientId: string; quantity: number | string }>;
  updated_at: string;
}

function mapDatabaseIngredient(item: DatabaseIngredient): GastronomyIngredientRecord {
  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    stock: Number(item.stock),
    minStock: Number(item.min_stock),
    costPerUnit: Number(item.cost_per_unit),
    supplier: item.supplier,
    active: item.active,
    createdAt: item.created_at,
  };
}

function mapDatabaseRecipe(item: DatabaseRecipe): GastronomyRecipeRecord {
  return {
    productId: item.product_id,
    portions: Number(item.portions),
    lines: (item.lines ?? []).map((line) => ({
      ingredientId: line.ingredientId,
      quantity: Number(line.quantity),
    })),
    updatedAt: item.updated_at,
  };
}

export async function listGastronomyIngredients(companyId: string): Promise<GastronomyIngredientRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_ingredients', {
      p_company_id: companyId,
    });
    if (error) throw new ApiError(503, 'No se pudo consultar el inventario de insumos.', 'GASTRONOMY_INVENTORY_UNAVAILABLE');
    return ((data ?? []) as DatabaseIngredient[]).map(mapDatabaseIngredient);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localIngredientList(companyId).map((item) => ({ ...item }));
}

export async function saveGastronomyIngredient(
  context: { companyId: string },
  input: GastronomyIngredientInput,
): Promise<GastronomyIngredientRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) {
      throw new ApiError(400, 'El identificador del insumo no es valido.', 'INVALID_INGREDIENT_ID');
    }
    const { data, error } = await createAdminServerClient().rpc('gastronomy_save_ingredient', {
      p_company_id: context.companyId,
      p_ingredient_id: input.id ?? null,
      p_name: input.name,
      p_unit: input.unit,
      p_stock: input.stock,
      p_min_stock: input.minStock,
      p_cost_per_unit: input.costPerUnit,
      p_supplier: input.supplier,
      p_active: input.active,
    });
    if (error?.message.includes('INGREDIENT_ALREADY_EXISTS')) {
      throw new ApiError(409, 'Ya existe un insumo con ese nombre.', 'INGREDIENT_ALREADY_EXISTS');
    }
    if (error || typeof data !== 'string') {
      throw new ApiError(503, 'No se pudo guardar el insumo.', 'GASTRONOMY_INVENTORY_UNAVAILABLE');
    }
    const items = await listGastronomyIngredients(context.companyId);
    const saved = items.find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'El insumo se guardo pero no pudo recuperarse.', 'GASTRONOMY_INVENTORY_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localIngredientList(context.companyId);
  const duplicate = current.find((item) => item.name.toLowerCase() === input.name.toLowerCase() && item.id !== input.id);
  if (duplicate) throw new ApiError(409, 'Ya existe un insumo con ese nombre.', 'INGREDIENT_ALREADY_EXISTS');
  const saved: GastronomyIngredientRecord = {
    ...input,
    id: input.id || `i-${crypto.randomUUID()}`,
    createdAt: input.id
      ? current.find((item) => item.id === input.id)?.createdAt ?? new Date().toISOString()
      : new Date().toISOString(),
  };
  localIngredients.set(
    context.companyId,
    input.id ? current.map((item) => item.id === input.id ? saved : item) : [saved, ...current],
  );
  return { ...saved };
}

export async function listGastronomyRecipes(companyId: string): Promise<GastronomyRecipeRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_recipes', {
      p_company_id: companyId,
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las recetas.', 'GASTRONOMY_RECIPES_UNAVAILABLE');
    return ((data ?? []) as DatabaseRecipe[]).map(mapDatabaseRecipe);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localRecipeList(companyId).map((recipe) => ({
    ...recipe,
    lines: recipe.lines.map((line) => ({ ...line })),
  }));
}

export async function saveGastronomyRecipe(
  context: { companyId: string },
  input: Omit<GastronomyRecipeRecord, 'updatedAt'>,
): Promise<GastronomyRecipeRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.productId) || input.lines.some((line) => !isUuid(line.ingredientId))) {
      throw new ApiError(400, 'La receta contiene identificadores invalidos.', 'INVALID_RECIPE_ID');
    }
    const { error } = await createAdminServerClient().rpc('gastronomy_save_recipe', {
      p_company_id: context.companyId,
      p_product_id: input.productId,
      p_portions: input.portions,
      p_lines: input.lines,
    });
    if (error) throw new ApiError(503, 'No se pudo guardar la receta.', 'GASTRONOMY_RECIPES_UNAVAILABLE');
    const recipes = await listGastronomyRecipes(context.companyId);
    const saved = recipes.find((recipe) => recipe.productId === input.productId);
    if (!saved) throw new ApiError(503, 'La receta se guardo pero no pudo recuperarse.', 'GASTRONOMY_RECIPES_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const menu = localMenu(context.companyId);
  const ingredients = localIngredientList(context.companyId);
  if (!menu.some((item) => item.id === input.productId)) {
    throw new ApiError(404, 'El producto de la receta no existe.', 'PRODUCT_NOT_FOUND');
  }
  if (input.lines.some((line) => !ingredients.some((ingredient) => ingredient.id === line.ingredientId))) {
    throw new ApiError(400, 'La receta contiene un insumo inexistente.', 'INGREDIENT_NOT_FOUND');
  }
  const saved: GastronomyRecipeRecord = {
    ...input,
    lines: input.lines.map((line) => ({ ...line })),
    updatedAt: new Date().toISOString(),
  };
  const current = localRecipeList(context.companyId);
  localRecipes.set(
    context.companyId,
    current.some((recipe) => recipe.productId === input.productId)
      ? current.map((recipe) => recipe.productId === input.productId ? saved : recipe)
      : [saved, ...current],
  );
  return { ...saved, lines: saved.lines.map((line) => ({ ...line })) };
}

function mapOrderError(message: string): ApiError {
  if (message.includes('INSUFFICIENT_PRODUCT_STOCK')) {
    return new ApiError(409, 'No hay stock suficiente de uno de los productos.', 'INSUFFICIENT_PRODUCT_STOCK');
  }
  if (message.includes('INSUFFICIENT_INGREDIENT_STOCK')) {
    return new ApiError(409, 'No hay insumos suficientes para preparar la comanda.', 'INSUFFICIENT_INGREDIENT_STOCK');
  }
  if (message.includes('ORDER_PRODUCT_NOT_FOUND')) {
    return new ApiError(404, 'Uno de los productos no esta disponible en esta sucursal.', 'ORDER_PRODUCT_NOT_FOUND');
  }
  return new ApiError(503, 'No se pudo confirmar la comanda.', 'GASTRONOMY_ORDER_UNAVAILABLE');
}

export async function commitGastronomyOrder(
  context: { companyId: string; userId: string; branchId: string | null },
  input: GastronomyOrderInput,
): Promise<GastronomyOrderResult> {
  if (isServerSupabaseAdminConfigured) {
    if (!context.branchId) throw new ApiError(409, 'Debe seleccionar una sucursal para enviar comandas.', 'BRANCH_REQUIRED');
    if (input.tableId && !isUuid(input.tableId)) throw new ApiError(400, 'La mesa no es valida.', 'INVALID_TABLE_ID');
    if (input.items.some((item) => !isUuid(item.productId))) {
      throw new ApiError(400, 'La comanda contiene productos invalidos.', 'INVALID_PRODUCT_ID');
    }
    const notes = [input.tableName ? `Mesa: ${input.tableName}` : '', input.notes ?? ''].filter(Boolean).join('. ');
    const { data, error } = await createAdminServerClient().rpc('gastronomy_commit_order', {
      p_company_id: context.companyId,
      p_user_id: context.userId,
      p_branch_id: context.branchId,
      p_table_id: input.tableId ?? null,
      p_channel: input.channel,
      p_notes: notes,
      p_items: input.items,
    });
    if (error) throw mapOrderError(error.message);
    const result = data as Record<string, unknown> | null;
    if (!result || typeof result.orderId !== 'string') throw mapOrderError('INVALID_RESULT');
    return {
      orderId: result.orderId,
      orderNumber: Number(result.orderNumber),
      subtotal: Number(result.subtotal),
      total: Number(result.total),
      status: 'sent',
    };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const table = input.tableId ? localTableList(context.companyId).find((item) => item.id === input.tableId) : undefined;
  if (input.tableId && !table) throw new ApiError(404, 'La mesa seleccionada no existe.', 'TABLE_NOT_FOUND');
  const menu = localMenu(context.companyId).map((item) => ({ ...item }));
  const ingredients = localIngredientList(context.companyId).map((item) => ({ ...item }));
  const recipes = localRecipeList(context.companyId);
  const consolidated = new Map<string, number>();
  input.items.forEach((item) => consolidated.set(item.productId, (consolidated.get(item.productId) ?? 0) + item.quantity));
  let total = 0;
  for (const [productId, ordered] of consolidated) {
    const product = menu.find((item) => item.id === productId && item.active);
    if (!product) throw new ApiError(404, 'Uno de los productos ya no esta disponible.', 'ORDER_PRODUCT_NOT_FOUND');
    if (product.stock < ordered) throw new ApiError(409, `Stock insuficiente para ${product.name}.`, 'INSUFFICIENT_PRODUCT_STOCK');
    product.stock = Number((product.stock - ordered).toFixed(3));
    total += product.price * ordered;
  }
  for (const ingredient of ingredients) {
    const required = Array.from(consolidated).reduce((sum, [productId, ordered]) => {
      const recipe = recipes.find((item) => item.productId === productId);
      const line = recipe?.lines.find((item) => item.ingredientId === ingredient.id);
      return sum + (line && recipe ? (line.quantity / recipe.portions) * ordered : 0);
    }, 0);
    if (ingredient.stock < required) {
      throw new ApiError(409, `Stock insuficiente de ${ingredient.name}.`, 'INSUFFICIENT_INGREDIENT_STOCK');
    }
    ingredient.stock = Number((ingredient.stock - required).toFixed(3));
  }

  localMenus.set(context.companyId, menu);
  localIngredients.set(context.companyId, ingredients);
  const orderNumber = (localOrderCounters.get(context.companyId) ?? 0) + 1;
  localOrderCounters.set(context.companyId, orderNumber);
  const orderId = `order-${crypto.randomUUID()}`;
  const order: LocalKdsOrder = {
    id: orderId,
    orderNumber,
    tableId: input.tableId ?? null,
    tableName: table?.name ?? input.tableName ?? (input.channel === 'delivery' ? 'Delivery' : 'Retiro'),
    waiterName: input.waiterName ?? 'Equipo de salon',
    items: Array.from(consolidated).map(([productId, ordered]) => {
      const product = menu.find((item) => item.id === productId)!;
      return { productId, name: product.name, qty: ordered, price: product.price };
    }),
    openedAt: new Date().toISOString(),
    status: 'pending',
  };
  localKdsOrders.set(context.companyId, [...localKdsOrderList(context.companyId), order]);
  if (table) {
    localDiningTables.set(context.companyId, localTableList(context.companyId).map((item) => item.id === table.id
      ? { ...item, status: 'occupied', waiter: input.waiterName ?? item.waiter }
      : item));
  }
  return {
    orderId,
    orderNumber,
    subtotal: total,
    total,
    status: 'sent',
  };
}

interface DatabaseDiningTable {
  id: string;
  name: string;
  status: GastronomyDiningTableRecord['status'];
  capacity: number;
  total: number | string;
  waiter: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number | string;
    unitPrice: number | string;
    vatRate: number | string;
  }>;
}

interface DatabaseKdsOrder {
  id: string;
  order_number: number | string;
  table_id: string | null;
  table_name: string;
  status: 'sent' | 'preparing' | 'ready';
  opened_at: string;
  items: Array<{ name: string; qty: number | string; price: number | string }>;
}

type OperationalContext = { companyId: string; branchId: string | null };

function productionBranch(context: OperationalContext): string {
  if (!context.branchId) throw new ApiError(409, 'Debe seleccionar una sucursal para gestionar el salon.', 'BRANCH_REQUIRED');
  return context.branchId;
}

function mapDatabaseTable(table: DatabaseDiningTable): GastronomyDiningTableRecord {
  return {
    id: table.id,
    name: table.name,
    status: table.status,
    capacity: table.capacity,
    total: Number(table.total),
    waiter: table.waiter,
    items: (table.items ?? []).map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      vatRate: Number(item.vatRate),
    })),
  };
}

function mapDatabaseKdsOrder(order: DatabaseKdsOrder): GastronomyKdsOrderRecord {
  return {
    id: order.id,
    orderNumber: Number(order.order_number),
    tableId: order.table_id,
    tableName: order.table_name,
    waiterName: 'Equipo de salon',
    items: (order.items ?? []).map((item) => ({
      name: item.name,
      qty: Number(item.qty),
      price: Number(item.price),
    })),
    openedAt: order.opened_at,
    status: order.status === 'sent' ? 'pending' : order.status,
  };
}

export async function listGastronomyTables(context: OperationalContext): Promise<GastronomyDiningTableRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_tables', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar el plano de mesas.', 'GASTRONOMY_TABLES_UNAVAILABLE');
    return ((data ?? []) as DatabaseDiningTable[]).map(mapDatabaseTable);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const menu = localMenu(context.companyId);
  const orders = localKdsOrderList(context.companyId);
  return localTableList(context.companyId).map((table) => {
    const tableOrders = orders.filter((order) => order.tableId === table.id);
    const grouped = new Map<string, GastronomyTableItemRecord>();
    tableOrders.flatMap((order) => order.items).forEach((item) => {
      const key = item.productId ?? item.name;
      const product = menu.find((candidate) => candidate.id === item.productId || candidate.name === item.name);
      const current = grouped.get(key);
      grouped.set(key, {
        productId: item.productId ?? product?.id ?? key,
        name: item.name,
        quantity: (current?.quantity ?? 0) + item.qty,
        unitPrice: item.price,
        vatRate: product?.vatRate ?? 21,
      });
    });
    return {
      ...table,
      total: tableOrders.reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + item.price * item.qty, 0), 0),
      items: Array.from(grouped.values()),
    };
  });
}

export async function saveGastronomyTable(
  context: OperationalContext,
  input: { id?: string; name: string; capacity: number },
): Promise<GastronomyDiningTableRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'La mesa no es valida.', 'INVALID_TABLE_ID');
    const { data, error } = await createAdminServerClient().rpc('gastronomy_save_table', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_table_id: input.id ?? null,
      p_name: input.name,
      p_capacity: input.capacity,
    });
    if (error?.message.includes('TABLE_NAME_ALREADY_EXISTS')) {
      throw new ApiError(409, 'Ya existe una mesa con ese nombre.', 'TABLE_NAME_ALREADY_EXISTS');
    }
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar la mesa.', 'GASTRONOMY_TABLES_UNAVAILABLE');
    const tables = await listGastronomyTables(context);
    const saved = tables.find((table) => table.id === data);
    if (!saved) throw new ApiError(503, 'La mesa se guardo pero no pudo recuperarse.', 'GASTRONOMY_TABLES_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localTableList(context.companyId);
  const duplicate = current.find((table) => table.name.toLowerCase() === input.name.toLowerCase() && table.id !== input.id);
  if (duplicate) throw new ApiError(409, 'Ya existe una mesa con ese nombre.', 'TABLE_NAME_ALREADY_EXISTS');
  const previous = input.id ? current.find((table) => table.id === input.id) : undefined;
  if (input.id && !previous) throw new ApiError(404, 'La mesa no existe.', 'TABLE_NOT_FOUND');
  const saved: GastronomyDiningTableRecord = previous
    ? { ...previous, name: input.name, capacity: input.capacity }
    : { id: `table-${crypto.randomUUID()}`, name: input.name, capacity: input.capacity, status: 'available', total: 0, waiter: '', items: [] };
  localDiningTables.set(context.companyId, previous
    ? current.map((table) => table.id === saved.id ? saved : table)
    : [...current, saved]);
  return { ...saved, items: saved.items.map((item) => ({ ...item })) };
}

export async function deleteGastronomyTable(context: OperationalContext, tableId: string): Promise<void> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(tableId)) throw new ApiError(400, 'La mesa no es valida.', 'INVALID_TABLE_ID');
    const { error } = await createAdminServerClient().rpc('gastronomy_delete_table', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_table_id: tableId,
    });
    if (error?.message.includes('TABLE_HAS_OPEN_ORDERS')) {
      throw new ApiError(409, 'No se puede eliminar una mesa con comandas abiertas.', 'TABLE_HAS_OPEN_ORDERS');
    }
    if (error) throw new ApiError(503, 'No se pudo eliminar la mesa.', 'GASTRONOMY_TABLES_UNAVAILABLE');
    return;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localTableList(context.companyId);
  const table = current.find((item) => item.id === tableId);
  if (!table) throw new ApiError(404, 'La mesa no existe.', 'TABLE_NOT_FOUND');
  if (table.status === 'occupied' || localKdsOrderList(context.companyId).some((order) => order.tableId === tableId)) {
    throw new ApiError(409, 'No se puede eliminar una mesa con comandas abiertas.', 'TABLE_HAS_OPEN_ORDERS');
  }
  localDiningTables.set(context.companyId, current.filter((item) => item.id !== tableId));
}

export async function listGastronomyKdsOrders(context: OperationalContext): Promise<GastronomyKdsOrderRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_kds_orders', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar la cola de cocina.', 'GASTRONOMY_KDS_UNAVAILABLE');
    return ((data ?? []) as DatabaseKdsOrder[]).map(mapDatabaseKdsOrder);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localKdsOrderList(context.companyId)
    .filter((order): order is GastronomyKdsOrderRecord => order.status !== 'served')
    .map((order) => ({ ...order, items: order.items.map((item) => ({ ...item })) }));
}

export async function updateGastronomyKdsStatus(
  context: OperationalContext,
  orderId: string,
  status: 'preparing' | 'ready' | 'served',
): Promise<void> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(orderId)) throw new ApiError(400, 'La comanda no es valida.', 'INVALID_ORDER_ID');
    const { error } = await createAdminServerClient().rpc('gastronomy_update_kds_status', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_order_id: orderId,
      p_status: status,
    });
    if (error?.message.includes('INVALID_KDS_TRANSITION')) {
      throw new ApiError(409, 'La comanda ya avanzo y no puede volver al estado anterior.', 'INVALID_KDS_TRANSITION');
    }
    if (error) throw new ApiError(503, 'No se pudo actualizar la comanda.', 'GASTRONOMY_KDS_UNAVAILABLE');
    return;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localKdsOrderList(context.companyId);
  const order = current.find((item) => item.id === orderId);
  if (!order) throw new ApiError(404, 'La comanda no existe.', 'ORDER_NOT_FOUND');
  const ranks = { pending: 0, preparing: 1, ready: 2, served: 3 } as const;
  if (ranks[status] < ranks[order.status]) {
    throw new ApiError(409, 'La comanda ya avanzo y no puede volver al estado anterior.', 'INVALID_KDS_TRANSITION');
  }
  localKdsOrders.set(context.companyId, current.map((item) => item.id === orderId ? { ...item, status } : item));
}

interface DatabaseReservation {
  id: string;
  table_id: string | null;
  table_name: string;
  customer_name: string;
  phone: string;
  guests: number;
  reserved_for: string;
  duration_minutes: number;
  status: GastronomyReservationStatus;
  source: GastronomyReservationSource;
  notes: string;
  created_at: string;
}

function mapDatabaseReservation(item: DatabaseReservation): GastronomyReservationRecord {
  return {
    id: item.id,
    tableId: item.table_id,
    tableName: item.table_name,
    customerName: item.customer_name,
    phone: item.phone,
    guests: item.guests,
    reservedFor: item.reserved_for,
    durationMinutes: item.duration_minutes,
    status: item.status,
    source: item.source,
    notes: item.notes,
    createdAt: item.created_at,
  };
}

function localReservationList(companyId: string) {
  const current = localReservations.get(companyId);
  if (current) return current;
  const seeded: GastronomyReservationRecord[] = [];
  localReservations.set(companyId, seeded);
  return seeded;
}

function reservationOverlaps(
  candidate: Pick<GastronomyReservationRecord, 'reservedFor' | 'durationMinutes'>,
  reservedFor: string,
  durationMinutes: number,
) {
  const candidateStart = new Date(candidate.reservedFor).getTime();
  const candidateEnd = candidateStart + candidate.durationMinutes * 60_000;
  const requestedStart = new Date(reservedFor).getTime();
  const requestedEnd = requestedStart + durationMinutes * 60_000;
  return candidateStart < requestedEnd && candidateEnd > requestedStart;
}

function reservationIsNear(record: Pick<GastronomyReservationRecord, 'reservedFor' | 'durationMinutes'>) {
  const now = Date.now();
  const start = new Date(record.reservedFor).getTime();
  return start <= now + 2 * 60 * 60_000 && start + record.durationMinutes * 60_000 >= now;
}

export async function listGastronomyReservations(context: OperationalContext): Promise<GastronomyReservationRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_reservations', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
    });
    if (error) throw new ApiError(503, 'No se pudo consultar la agenda de reservas.', 'GASTRONOMY_RESERVATIONS_UNAVAILABLE');
    return ((data ?? []) as DatabaseReservation[]).map(mapDatabaseReservation);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const minimum = Date.now() - 12 * 60 * 60_000;
  const maximum = Date.now() + 60 * 24 * 60 * 60_000;
  return localReservationList(context.companyId)
    .filter((item) => {
      const time = new Date(item.reservedFor).getTime();
      return time >= minimum && time < maximum;
    })
    .sort((left, right) => left.reservedFor.localeCompare(right.reservedFor))
    .map((item) => ({ ...item }));
}

export async function saveGastronomyReservation(
  context: OperationalContext & { userId: string },
  input: GastronomyReservationInput,
): Promise<GastronomyReservationRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'La reserva no es valida.', 'INVALID_RESERVATION_ID');
    if (input.tableId && !isUuid(input.tableId)) throw new ApiError(400, 'La mesa no es valida.', 'INVALID_TABLE_ID');
    const { data, error } = await createAdminServerClient().rpc('gastronomy_save_reservation', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_user_id: context.userId,
      p_reservation_id: input.id ?? null,
      p_table_id: input.tableId ?? null,
      p_customer_name: input.customerName,
      p_phone: input.phone,
      p_guests: input.guests,
      p_reserved_for: input.reservedFor,
      p_duration_minutes: input.durationMinutes,
      p_source: input.source,
      p_notes: input.notes,
    });
    if (error?.message.includes('RESERVATION_TIME_CONFLICT')) {
      throw new ApiError(409, 'La mesa ya tiene una reserva en ese horario.', 'RESERVATION_TIME_CONFLICT');
    }
    if (error?.message.includes('TABLE_CAPACITY_MISMATCH')) {
      throw new ApiError(409, 'La mesa no tiene capacidad suficiente o no esta disponible.', 'TABLE_CAPACITY_MISMATCH');
    }
    if (error?.message.includes('RESERVATION_IN_PAST')) {
      throw new ApiError(400, 'La reserva no puede quedar en el pasado.', 'RESERVATION_IN_PAST');
    }
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar la reserva.', 'GASTRONOMY_RESERVATIONS_UNAVAILABLE');
    const reservations = await listGastronomyReservations(context);
    const saved = reservations.find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'La reserva se guardo pero no pudo recuperarse.', 'GASTRONOMY_RESERVATIONS_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const start = new Date(input.reservedFor).getTime();
  if (!Number.isFinite(start) || start < Date.now() - 30 * 60_000) {
    throw new ApiError(400, 'La reserva no puede quedar en el pasado.', 'RESERVATION_IN_PAST');
  }
  const tables = localTableList(context.companyId);
  const table = input.tableId ? tables.find((item) => item.id === input.tableId) : undefined;
  if (input.tableId && (!table || table.capacity < input.guests)) {
    throw new ApiError(409, 'La mesa no tiene capacidad suficiente o no esta disponible.', 'TABLE_CAPACITY_MISMATCH');
  }
  const current = localReservationList(context.companyId);
  const conflict = input.tableId && current.some((item) => item.id !== input.id
    && item.tableId === input.tableId
    && ['pending', 'confirmed', 'seated'].includes(item.status)
    && reservationOverlaps(item, input.reservedFor, input.durationMinutes));
  if (conflict) throw new ApiError(409, 'La mesa ya tiene una reserva en ese horario.', 'RESERVATION_TIME_CONFLICT');

  const previous = input.id ? current.find((item) => item.id === input.id) : undefined;
  if (input.id && (!previous || !['pending', 'confirmed'].includes(previous.status))) {
    throw new ApiError(409, 'La reserva ya no puede editarse.', 'RESERVATION_NOT_EDITABLE');
  }
  const saved: GastronomyReservationRecord = {
    ...input,
    id: input.id ?? `reservation-${crypto.randomUUID()}`,
    tableId: input.tableId ?? null,
    tableName: table?.name ?? 'Sin mesa',
    status: previous?.status ?? 'confirmed',
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  };
  localReservations.set(context.companyId, previous
    ? current.map((item) => item.id === saved.id ? saved : item)
    : [...current, saved]);
  if (table && reservationIsNear(saved) && table.status === 'available') {
    localDiningTables.set(context.companyId, tables.map((item) => item.id === table.id ? { ...item, status: 'reserved' } : item));
  }
  return { ...saved };
}

export async function updateGastronomyReservationStatus(
  context: OperationalContext,
  reservationId: string,
  status: Exclude<GastronomyReservationStatus, 'pending'>,
): Promise<void> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(reservationId)) throw new ApiError(400, 'La reserva no es valida.', 'INVALID_RESERVATION_ID');
    const { error } = await createAdminServerClient().rpc('gastronomy_update_reservation_status', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_reservation_id: reservationId,
      p_status: status,
    });
    if (error?.message.includes('INVALID_RESERVATION_TRANSITION')) {
      throw new ApiError(409, 'La reserva no puede pasar a ese estado.', 'INVALID_RESERVATION_TRANSITION');
    }
    if (error?.message.includes('TABLE_ALREADY_OCCUPIED')) {
      throw new ApiError(409, 'La mesa ya se encuentra ocupada.', 'TABLE_ALREADY_OCCUPIED');
    }
    if (error) throw new ApiError(503, 'No se pudo actualizar la reserva.', 'GASTRONOMY_RESERVATIONS_UNAVAILABLE');
    return;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localReservationList(context.companyId);
  const reservation = current.find((item) => item.id === reservationId);
  if (!reservation) throw new ApiError(404, 'La reserva no existe.', 'RESERVATION_NOT_FOUND');
  const allowed: Record<GastronomyReservationStatus, GastronomyReservationStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  if (status !== reservation.status && !allowed[reservation.status].includes(status)) {
    throw new ApiError(409, 'La reserva no puede pasar a ese estado.', 'INVALID_RESERVATION_TRANSITION');
  }
  const table = reservation.tableId ? localTableList(context.companyId).find((item) => item.id === reservation.tableId) : undefined;
  if (status === 'seated' && !table) throw new ApiError(409, 'La reserva necesita una mesa asignada.', 'RESERVATION_TABLE_REQUIRED');
  if (status === 'seated' && table?.status === 'occupied') {
    throw new ApiError(409, 'La mesa ya se encuentra ocupada.', 'TABLE_ALREADY_OCCUPIED');
  }
  localReservations.set(context.companyId, current.map((item) => item.id === reservationId ? { ...item, status } : item));
  if (table && status === 'seated') {
    localDiningTables.set(context.companyId, localTableList(context.companyId).map((item) => item.id === table.id ? { ...item, status: 'occupied' } : item));
  } else if (table && ['completed', 'cancelled', 'no_show'].includes(status)) {
    const hasOrders = localKdsOrderList(context.companyId).some((order) => order.tableId === table.id);
    const hasUpcoming = current.some((item) => item.id !== reservationId && item.tableId === table.id
      && ['pending', 'confirmed', 'seated'].includes(item.status) && reservationIsNear(item));
    if (!hasOrders && !hasUpcoming) {
      localDiningTables.set(context.companyId, localTableList(context.companyId).map((item) => item.id === table.id ? { ...item, status: 'available' } : item));
    }
  }
}

interface DatabaseSupplier {
  id: string;
  name: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
  created_at: string;
}

interface DatabasePurchaseOrder {
  id: string;
  order_number: number | string;
  supplier_id: string;
  supplier_name: string;
  status: GastronomyPurchaseStatus;
  expected_at: string | null;
  notes: string;
  total_estimated: number | string;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
  lines: Array<{
    id: string;
    ingredientId: string;
    ingredientName: string;
    unit: string;
    quantityOrdered: number | string;
    quantityReceived: number | string;
    unitCost: number | string;
  }>;
}

function mapDatabaseSupplier(item: DatabaseSupplier): GastronomySupplierRecord {
  return {
    id: item.id,
    name: item.name,
    taxId: item.tax_id,
    phone: item.phone,
    email: item.email,
    address: item.address,
    active: item.active,
    createdAt: item.created_at,
  };
}

function mapDatabasePurchaseOrder(item: DatabasePurchaseOrder): GastronomyPurchaseOrderRecord {
  return {
    id: item.id,
    orderNumber: Number(item.order_number),
    supplierId: item.supplier_id,
    supplierName: item.supplier_name,
    status: item.status,
    expectedAt: item.expected_at,
    notes: item.notes,
    totalEstimated: Number(item.total_estimated),
    createdAt: item.created_at,
    orderedAt: item.ordered_at,
    receivedAt: item.received_at,
    lines: (item.lines ?? []).map((line) => ({
      id: line.id,
      ingredientId: line.ingredientId,
      ingredientName: line.ingredientName,
      unit: line.unit,
      quantityOrdered: Number(line.quantityOrdered),
      quantityReceived: Number(line.quantityReceived),
      unitCost: Number(line.unitCost),
    })),
  };
}

function clonePurchaseOrder(order: GastronomyPurchaseOrderRecord): GastronomyPurchaseOrderRecord {
  return { ...order, lines: order.lines.map((line) => ({ ...line })) };
}

function localSupplierList(companyId: string): GastronomySupplierRecord[] {
  const current = localSuppliers.get(companyId);
  if (current) return current;
  const now = new Date().toISOString();
  const names = Array.from(new Set(initialIngredients().map((item) => item.supplier).filter(Boolean)));
  const seeded = names.map((name, index) => ({
    id: `supplier-${index + 1}`,
    name,
    taxId: '',
    phone: '',
    email: '',
    address: '',
    active: true,
    createdAt: now,
  }));
  localSuppliers.set(companyId, seeded);
  return seeded;
}

function localPurchaseOrderList(companyId: string): GastronomyPurchaseOrderRecord[] {
  const current = localPurchaseOrders.get(companyId);
  if (current) return current;
  const seeded: GastronomyPurchaseOrderRecord[] = [];
  localPurchaseOrders.set(companyId, seeded);
  return seeded;
}

export async function listGastronomySuppliers(companyId: string): Promise<GastronomySupplierRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_suppliers', {
      p_company_id: companyId,
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar los proveedores.', 'GASTRONOMY_SUPPLIERS_UNAVAILABLE');
    return ((data ?? []) as DatabaseSupplier[]).map(mapDatabaseSupplier);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localSupplierList(companyId).map((item) => ({ ...item }));
}

export async function saveGastronomySupplier(
  context: { companyId: string },
  input: GastronomySupplierInput,
): Promise<GastronomySupplierRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'El proveedor no es valido.', 'INVALID_SUPPLIER_ID');
    const { data, error } = await createAdminServerClient().rpc('gastronomy_save_supplier', {
      p_company_id: context.companyId,
      p_supplier_id: input.id ?? null,
      p_name: input.name,
      p_tax_id: input.taxId,
      p_phone: input.phone,
      p_email: input.email,
      p_address: input.address,
      p_active: input.active,
    });
    if (error?.message.includes('SUPPLIER_ALREADY_EXISTS')) {
      throw new ApiError(409, 'Ya existe un proveedor con ese nombre o CUIT.', 'SUPPLIER_ALREADY_EXISTS');
    }
    if (error || typeof data !== 'string') {
      throw new ApiError(503, 'No se pudo guardar el proveedor.', 'GASTRONOMY_SUPPLIERS_UNAVAILABLE');
    }
    const suppliers = await listGastronomySuppliers(context.companyId);
    const saved = suppliers.find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'El proveedor se guardo pero no pudo recuperarse.', 'GASTRONOMY_SUPPLIERS_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const current = localSupplierList(context.companyId);
  const duplicate = current.find((item) => item.id !== input.id && (
    item.name.toLowerCase() === input.name.toLowerCase()
    || Boolean(input.taxId && item.taxId === input.taxId)
  ));
  if (duplicate) throw new ApiError(409, 'Ya existe un proveedor con ese nombre o CUIT.', 'SUPPLIER_ALREADY_EXISTS');
  const previous = input.id ? current.find((item) => item.id === input.id) : undefined;
  if (input.id && !previous) throw new ApiError(404, 'El proveedor no existe.', 'SUPPLIER_NOT_FOUND');
  const saved: GastronomySupplierRecord = {
    ...input,
    id: input.id ?? `supplier-${crypto.randomUUID()}`,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  };
  localSuppliers.set(context.companyId, previous
    ? current.map((item) => item.id === saved.id ? saved : item)
    : [saved, ...current]);
  return { ...saved };
}

export async function listGastronomyPurchaseOrders(
  context: OperationalContext,
): Promise<GastronomyPurchaseOrderRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_purchase_orders', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar las ordenes de compra.', 'GASTRONOMY_PURCHASES_UNAVAILABLE');
    return ((data ?? []) as DatabasePurchaseOrder[]).map(mapDatabasePurchaseOrder);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localPurchaseOrderList(context.companyId).map(clonePurchaseOrder);
}

export async function saveGastronomyPurchaseOrder(
  context: OperationalContext & { userId: string },
  input: GastronomyPurchaseOrderInput,
): Promise<GastronomyPurchaseOrderRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'La orden no es valida.', 'INVALID_PURCHASE_ORDER_ID');
    if (!isUuid(input.supplierId) || input.lines.some((line) => !isUuid(line.ingredientId))) {
      throw new ApiError(400, 'La orden contiene identificadores invalidos.', 'INVALID_PURCHASE_ORDER_ID');
    }
    const { data, error } = await createAdminServerClient().rpc('gastronomy_save_purchase_order', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_user_id: context.userId,
      p_order_id: input.id ?? null,
      p_supplier_id: input.supplierId,
      p_status: input.status,
      p_expected_at: input.expectedAt || null,
      p_notes: input.notes,
      p_lines: input.lines,
    });
    if (error?.message.includes('PURCHASE_ORDER_NOT_EDITABLE')) {
      throw new ApiError(409, 'La orden ya no puede modificarse.', 'PURCHASE_ORDER_NOT_EDITABLE');
    }
    if (error?.message.includes('SUPPLIER_NOT_FOUND')) {
      throw new ApiError(404, 'El proveedor no existe o esta inactivo.', 'SUPPLIER_NOT_FOUND');
    }
    if (error || typeof data !== 'string') {
      throw new ApiError(503, 'No se pudo guardar la orden de compra.', 'GASTRONOMY_PURCHASES_UNAVAILABLE');
    }
    const orders = await listGastronomyPurchaseOrders(context);
    const saved = orders.find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'La orden se guardo pero no pudo recuperarse.', 'GASTRONOMY_PURCHASES_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const supplier = localSupplierList(context.companyId).find((item) => item.id === input.supplierId && item.active);
  if (!supplier) throw new ApiError(404, 'El proveedor no existe o esta inactivo.', 'SUPPLIER_NOT_FOUND');
  const ingredients = localIngredientList(context.companyId);
  const ingredientIds = new Set(input.lines.map((line) => line.ingredientId));
  if (ingredientIds.size !== input.lines.length || input.lines.some((line) => (
    line.quantity <= 0 || line.unitCost < 0 || !ingredients.some((item) => item.id === line.ingredientId && item.active)
  ))) throw new ApiError(400, 'La orden contiene renglones invalidos o repetidos.', 'INVALID_PURCHASE_LINE');

  const current = localPurchaseOrderList(context.companyId);
  const previous = input.id ? current.find((item) => item.id === input.id) : undefined;
  if (input.id && (!previous || !['draft', 'ordered'].includes(previous.status))) {
    throw new ApiError(409, 'La orden ya no puede modificarse.', 'PURCHASE_ORDER_NOT_EDITABLE');
  }
  const now = new Date().toISOString();
  const orderNumber = previous?.orderNumber ?? ((localPurchaseCounters.get(context.companyId) ?? 0) + 1);
  if (!previous) localPurchaseCounters.set(context.companyId, orderNumber);
  const saved: GastronomyPurchaseOrderRecord = {
    id: input.id ?? `purchase-${crypto.randomUUID()}`,
    orderNumber,
    supplierId: supplier.id,
    supplierName: supplier.name,
    status: input.status,
    expectedAt: input.expectedAt || null,
    notes: input.notes,
    totalEstimated: Number(input.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0).toFixed(2)),
    createdAt: previous?.createdAt ?? now,
    orderedAt: input.status === 'ordered' ? previous?.orderedAt ?? now : null,
    receivedAt: null,
    lines: input.lines.map((line) => {
      const ingredient = ingredients.find((item) => item.id === line.ingredientId)!;
      return {
        id: `purchase-line-${crypto.randomUUID()}`,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        quantityOrdered: line.quantity,
        quantityReceived: 0,
        unitCost: line.unitCost,
      };
    }),
  };
  localPurchaseOrders.set(context.companyId, previous
    ? current.map((item) => item.id === saved.id ? saved : item)
    : [saved, ...current]);
  return clonePurchaseOrder(saved);
}

export async function receiveGastronomyPurchaseOrder(
  context: OperationalContext & { userId: string },
  input: GastronomyPurchaseReceiptInput,
): Promise<GastronomyPurchaseReceiptResult> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.orderId) || input.lines.some((line) => !isUuid(line.ingredientId))) {
      throw new ApiError(400, 'La recepcion contiene identificadores invalidos.', 'INVALID_PURCHASE_RECEIPT');
    }
    const { data, error } = await createAdminServerClient().rpc('gastronomy_receive_purchase_order', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_user_id: context.userId,
      p_order_id: input.orderId,
      p_notes: input.notes,
      p_lines: input.lines,
    });
    if (error?.message.includes('PURCHASE_OVER_RECEIPT')) {
      throw new ApiError(409, 'La cantidad recibida supera lo pendiente.', 'PURCHASE_OVER_RECEIPT');
    }
    if (error?.message.includes('PURCHASE_ORDER_NOT_RECEIVABLE')) {
      throw new ApiError(409, 'La orden no admite nuevas recepciones.', 'PURCHASE_ORDER_NOT_RECEIVABLE');
    }
    if (error || !data || typeof data !== 'object') {
      throw new ApiError(503, 'No se pudo registrar la recepcion.', 'GASTRONOMY_PURCHASES_UNAVAILABLE');
    }
    const result = data as Record<string, unknown>;
    return {
      receiptId: String(result.receiptId),
      receiptNumber: Number(result.receiptNumber),
      orderId: String(result.orderId),
      status: result.status as GastronomyPurchaseReceiptResult['status'],
    };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const orders = localPurchaseOrderList(context.companyId);
  const order = orders.find((item) => item.id === input.orderId);
  if (!order) throw new ApiError(404, 'La orden no existe.', 'PURCHASE_ORDER_NOT_FOUND');
  if (!['ordered', 'partially_received'].includes(order.status)) {
    throw new ApiError(409, 'La orden no admite nuevas recepciones.', 'PURCHASE_ORDER_NOT_RECEIVABLE');
  }
  const ingredientIds = new Set(input.lines.map((line) => line.ingredientId));
  if (ingredientIds.size !== input.lines.length || input.lines.some((line) => line.quantity <= 0 || line.unitCost < 0)) {
    throw new ApiError(400, 'La recepcion contiene renglones invalidos o repetidos.', 'INVALID_PURCHASE_RECEIPT');
  }
  input.lines.forEach((line) => {
    const orderedLine = order.lines.find((item) => item.ingredientId === line.ingredientId);
    if (!orderedLine) throw new ApiError(400, 'La recepcion contiene un insumo ajeno a la orden.', 'PURCHASE_LINE_NOT_FOUND');
    if (orderedLine.quantityReceived + line.quantity > orderedLine.quantityOrdered) {
      throw new ApiError(409, 'La cantidad recibida supera lo pendiente.', 'PURCHASE_OVER_RECEIPT');
    }
  });

  const ingredients = localIngredientList(context.companyId);
  const updatedIngredients = ingredients.map((ingredient) => {
    const received = input.lines.find((line) => line.ingredientId === ingredient.id);
    if (!received) return ingredient;
    const newStock = ingredient.stock + received.quantity;
    const weightedCost = newStock
      ? ((ingredient.stock * ingredient.costPerUnit) + (received.quantity * received.unitCost)) / newStock
      : received.unitCost;
    return {
      ...ingredient,
      stock: Number(newStock.toFixed(3)),
      costPerUnit: Number(weightedCost.toFixed(4)),
      supplier: order.supplierName,
    };
  });
  const updatedLines = order.lines.map((line) => {
    const received = input.lines.find((item) => item.ingredientId === line.ingredientId);
    return received ? {
      ...line,
      quantityReceived: Number((line.quantityReceived + received.quantity).toFixed(3)),
      unitCost: received.unitCost,
    } : line;
  });
  const status = updatedLines.every((line) => line.quantityReceived >= line.quantityOrdered)
    ? 'received' as const
    : 'partially_received' as const;
  const updatedOrder: GastronomyPurchaseOrderRecord = {
    ...order,
    status,
    receivedAt: status === 'received' ? new Date().toISOString() : null,
    lines: updatedLines,
  };
  localIngredients.set(context.companyId, updatedIngredients);
  localPurchaseOrders.set(context.companyId, orders.map((item) => item.id === order.id ? updatedOrder : item));
  const receiptNumber = (localReceiptCounters.get(context.companyId) ?? 0) + 1;
  localReceiptCounters.set(context.companyId, receiptNumber);
  return {
    receiptId: `receipt-${crypto.randomUUID()}`,
    receiptNumber,
    orderId: order.id,
    status,
  };
}

interface DatabaseSettlement {
  id: string;
  settlement_number: number | string;
  table_name: string;
  sale_id: string;
  sale_total: number | string;
  tip_amount: number | string;
  charged_total: number | string;
  split_count: number;
  fiscal_status: GastronomySettlementRecord['fiscalStatus'];
  payments: Array<{
    paymentNumber: number;
    method: GastronomyPaymentMethod;
    amount: number | string;
    reference: string;
  }>;
  created_at: string;
}

function mapDatabaseSettlement(item: DatabaseSettlement): GastronomySettlementRecord {
  return {
    id: item.id,
    settlementNumber: Number(item.settlement_number),
    tableName: item.table_name,
    saleId: item.sale_id,
    saleTotal: Number(item.sale_total),
    tipAmount: Number(item.tip_amount),
    chargedTotal: Number(item.charged_total),
    splitCount: item.split_count,
    fiscalStatus: item.fiscal_status,
    payments: (item.payments ?? []).map((payment) => ({
      paymentNumber: payment.paymentNumber,
      method: payment.method,
      amount: Number(payment.amount),
      reference: payment.reference,
    })),
    createdAt: item.created_at,
  };
}

function localSettlementList(companyId: string): GastronomySettlementRecord[] {
  const current = localSettlements.get(companyId);
  if (current) return current;
  const seeded: GastronomySettlementRecord[] = [];
  localSettlements.set(companyId, seeded);
  return seeded;
}

function normalizeCashState(value: Record<string, unknown>): GastronomyCashState {
  return {
    isOpen: value.isOpen === true,
    cashId: typeof value.cashId === 'string' ? value.cashId : null,
    name: String(value.name ?? 'Caja Gastronomia'),
    openingBalance: Number(value.openingBalance ?? 0),
    expectedCash: Number(value.expectedCash ?? 0),
    salesTotal: Number(value.salesTotal ?? 0),
    cashPayments: Number(value.cashPayments ?? 0),
    cardPayments: Number(value.cardPayments ?? 0),
    qrPayments: Number(value.qrPayments ?? 0),
    tipsTotal: Number(value.tipsTotal ?? 0),
    openedAt: typeof value.openedAt === 'string' ? value.openedAt : null,
  };
}

export async function getGastronomyCashState(context: OperationalContext): Promise<GastronomyCashState> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_get_cash_state', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
    });
    if (error || !data || typeof data !== 'object') {
      throw new ApiError(503, 'No se pudo consultar el estado de caja.', 'GASTRONOMY_CASH_UNAVAILABLE');
    }
    return normalizeCashState(data as Record<string, unknown>);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const cash = localCashSessions.get(context.companyId);
  if (!cash) return normalizeCashState({ isOpen: false });
  const settlements = localSettlementList(context.companyId).filter((item) => item.cashId === cash.id);
  const payments = settlements.flatMap((item) => item.payments);
  const totalBy = (method: GastronomyPaymentMethod) => payments
    .filter((item) => item.method === method)
    .reduce((sum, item) => sum + item.amount, 0);
  const cashPayments = totalBy('cash');
  return {
    isOpen: true,
    cashId: cash.id,
    name: 'Caja Gastronomia',
    openingBalance: cash.openingBalance,
    expectedCash: Number((cash.openingBalance + cashPayments).toFixed(2)),
    salesTotal: Number(settlements.reduce((sum, item) => sum + item.saleTotal, 0).toFixed(2)),
    cashPayments: Number(cashPayments.toFixed(2)),
    cardPayments: Number(totalBy('card').toFixed(2)),
    qrPayments: Number(totalBy('qr').toFixed(2)),
    tipsTotal: Number(settlements.reduce((sum, item) => sum + item.tipAmount, 0).toFixed(2)),
    openedAt: cash.openedAt,
  };
}

export async function openGastronomyCash(
  context: OperationalContext & { userId: string },
  openingBalance: number,
): Promise<GastronomyCashState> {
  if (isServerSupabaseAdminConfigured) {
    const { error } = await createAdminServerClient().rpc('gastronomy_open_cash', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_user_id: context.userId,
      p_opening_balance: openingBalance,
    });
    if (error?.message.includes('CASH_ALREADY_OPEN')) {
      throw new ApiError(409, 'Ya existe una caja abierta en la sucursal.', 'CASH_ALREADY_OPEN');
    }
    if (error) throw new ApiError(503, 'No se pudo abrir la caja.', 'GASTRONOMY_CASH_UNAVAILABLE');
    return getGastronomyCashState(context);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  if (localCashSessions.has(context.companyId)) {
    throw new ApiError(409, 'Ya existe una caja abierta en la sucursal.', 'CASH_ALREADY_OPEN');
  }
  localCashSessions.set(context.companyId, {
    id: `cash-${crypto.randomUUID()}`,
    openingBalance,
    openedAt: new Date().toISOString(),
  });
  return getGastronomyCashState(context);
}

export async function closeGastronomyCash(
  context: OperationalContext & { userId: string },
  declaredCash: number,
): Promise<{ cashId: string; expectedCash: number; declaredCash: number; difference: number }> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_close_cash', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_user_id: context.userId,
      p_declared_cash: declaredCash,
    });
    if (error?.message.includes('CASH_NOT_OPEN')) throw new ApiError(409, 'No hay una caja abierta.', 'CASH_NOT_OPEN');
    if (error || !data || typeof data !== 'object') {
      throw new ApiError(503, 'No se pudo cerrar la caja.', 'GASTRONOMY_CASH_UNAVAILABLE');
    }
    const result = data as Record<string, unknown>;
    return {
      cashId: String(result.cashId),
      expectedCash: Number(result.expectedCash),
      declaredCash: Number(result.declaredCash),
      difference: Number(result.difference),
    };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const cash = localCashSessions.get(context.companyId);
  if (!cash) throw new ApiError(409, 'No hay una caja abierta.', 'CASH_NOT_OPEN');
  const state = await getGastronomyCashState(context);
  localCashSessions.delete(context.companyId);
  return {
    cashId: cash.id,
    expectedCash: state.expectedCash,
    declaredCash,
    difference: Number((declaredCash - state.expectedCash).toFixed(2)),
  };
}

export async function listGastronomySettlements(
  context: OperationalContext,
): Promise<GastronomySettlementRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_list_settlements', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar los cierres.', 'GASTRONOMY_SETTLEMENTS_UNAVAILABLE');
    return ((data ?? []) as DatabaseSettlement[]).map(mapDatabaseSettlement);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localSettlementList(context.companyId).map((item) => ({
    ...item,
    payments: item.payments.map((payment) => ({ ...payment })),
  }));
}

export async function settleGastronomyTable(
  context: OperationalContext & { userId: string },
  input: GastronomySettlementInput,
): Promise<GastronomySettlementResult> {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.tableId)) throw new ApiError(400, 'La mesa no es valida.', 'INVALID_TABLE_ID');
    const { data, error } = await createAdminServerClient().rpc('gastronomy_settle_table', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_user_id: context.userId,
      p_table_id: input.tableId,
      p_idempotency_key: input.idempotencyKey,
      p_split_count: input.splitCount,
      p_tip_amount: input.tipAmount,
      p_payments: input.payments,
    });
    if (error?.message.includes('CASH_NOT_OPEN')) throw new ApiError(409, 'Debe abrir la caja antes de cobrar.', 'CASH_NOT_OPEN');
    if (error?.message.includes('TABLE_HAS_NO_OPEN_ORDERS')) throw new ApiError(409, 'La mesa ya no tiene consumos pendientes.', 'TABLE_HAS_NO_OPEN_ORDERS');
    if (error?.message.includes('SETTLEMENT_TOTAL_MISMATCH')) throw new ApiError(409, 'La suma de pagos no coincide con el total.', 'SETTLEMENT_TOTAL_MISMATCH');
    if (error || !data || typeof data !== 'object') {
      throw new ApiError(503, 'No se pudo cerrar y cobrar la mesa.', 'GASTRONOMY_SETTLEMENTS_UNAVAILABLE');
    }
    const result = data as Record<string, unknown>;
    return {
      settlementId: String(result.settlementId),
      settlementNumber: Number(result.settlementNumber),
      saleId: String(result.saleId),
      saleTotal: Number(result.saleTotal),
      tipAmount: Number(result.tipAmount),
      chargedTotal: Number(result.chargedTotal),
      fiscalStatus: 'pending',
      duplicate: result.duplicate === true,
    };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();

  const existing = localSettlementList(context.companyId).find((item) => item.idempotencyKey === input.idempotencyKey);
  if (existing) return {
    settlementId: existing.id,
    settlementNumber: existing.settlementNumber,
    saleId: existing.saleId,
    saleTotal: existing.saleTotal,
    tipAmount: existing.tipAmount,
    chargedTotal: existing.chargedTotal,
    fiscalStatus: 'pending',
    duplicate: true,
  };
  const cash = localCashSessions.get(context.companyId);
  if (!cash) throw new ApiError(409, 'Debe abrir la caja antes de cobrar.', 'CASH_NOT_OPEN');
  const table = localTableList(context.companyId).find((item) => item.id === input.tableId);
  if (!table) throw new ApiError(404, 'La mesa no existe.', 'TABLE_NOT_FOUND');
  const orders = localKdsOrderList(context.companyId);
  const tableOrders = orders.filter((item) => item.tableId === input.tableId);
  if (!tableOrders.length) throw new ApiError(409, 'La mesa ya no tiene consumos pendientes.', 'TABLE_HAS_NO_OPEN_ORDERS');
  if (input.splitCount !== input.payments.length || input.splitCount < 1 || input.splitCount > 20) {
    throw new ApiError(400, 'La division de pagos no es valida.', 'INVALID_SETTLEMENT');
  }
  const saleTotal = Number(tableOrders.reduce((sum, order) => sum + order.items.reduce(
    (orderSum, item) => orderSum + item.price * item.qty,
    0,
  ), 0).toFixed(2));
  const menuById = new Map(localMenu(context.companyId).map((item) => [item.id, item]));
  const reportItems = new Map<string, { productId: string; name: string; quantity: number; total: number }>();
  let taxAmount = 0;
  tableOrders.forEach((order) => order.items.forEach((item) => {
    const productId = item.productId ?? item.name;
    const lineTotal = item.price * item.qty;
    const current = reportItems.get(productId);
    reportItems.set(productId, {
      productId,
      name: item.name,
      quantity: (current?.quantity ?? 0) + item.qty,
      total: Number(((current?.total ?? 0) + lineTotal).toFixed(2)),
    });
    const vatRate = menuById.get(item.productId ?? '')?.vatRate ?? 0;
    taxAmount += lineTotal - lineTotal / (1 + vatRate / 100);
  }));
  taxAmount = Number(taxAmount.toFixed(2));
  const chargedTotal = Number((saleTotal + input.tipAmount).toFixed(2));
  const paymentTotal = Number(input.payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2));
  if (Math.abs(paymentTotal - chargedTotal) > 0.01) {
    throw new ApiError(409, 'La suma de pagos no coincide con el total.', 'SETTLEMENT_TOTAL_MISMATCH');
  }
  const settlementNumber = (localSettlementCounters.get(context.companyId) ?? 0) + 1;
  localSettlementCounters.set(context.companyId, settlementNumber);
  const settlement: GastronomySettlementRecord = {
    id: `settlement-${crypto.randomUUID()}`,
    settlementNumber,
    tableName: table.name,
    tableId: table.id,
    cashId: cash.id,
    saleId: `sale-${crypto.randomUUID()}`,
    saleTotal,
    tipAmount: input.tipAmount,
    chargedTotal,
    splitCount: input.splitCount,
    fiscalStatus: 'pending',
    idempotencyKey: input.idempotencyKey,
    subtotal: Number((saleTotal - taxAmount).toFixed(2)),
    taxAmount,
    items: [...reportItems.values()],
    payments: input.payments.map((payment, index) => ({
      paymentNumber: index + 1,
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference ?? '',
    })),
    createdAt: new Date().toISOString(),
  };
  localSettlements.set(context.companyId, [settlement, ...localSettlementList(context.companyId)]);
  localKdsOrders.set(context.companyId, orders.filter((item) => item.tableId !== input.tableId));
  localDiningTables.set(context.companyId, localTableList(context.companyId).map((item) => item.id === table.id
    ? { ...item, status: 'available', total: 0, waiter: '', items: [] }
    : item));
  return {
    settlementId: settlement.id,
    settlementNumber,
    saleId: settlement.saleId,
    saleTotal,
    tipAmount: input.tipAmount,
    chargedTotal,
    fiscalStatus: 'pending',
    duplicate: false,
  };
}

function normalizeSalesReport(value: Record<string, unknown>): GastronomySalesReportRecord {
  const summary = (value.summary ?? {}) as Record<string, unknown>;
  const rows = <T>(input: unknown): T[] => Array.isArray(input) ? input as T[] : [];
  return {
    from: String(value.from ?? ''),
    to: String(value.to ?? ''),
    summary: {
      salesTotal: Number(summary.salesTotal ?? 0),
      netTotal: Number(summary.netTotal ?? 0),
      taxTotal: Number(summary.taxTotal ?? 0),
      tipsTotal: Number(summary.tipsTotal ?? 0),
      chargedTotal: Number(summary.chargedTotal ?? 0),
      settlementsCount: Number(summary.settlementsCount ?? 0),
      averageTicket: Number(summary.averageTicket ?? 0),
      previousSalesTotal: Number(summary.previousSalesTotal ?? 0),
    },
    daily: rows<Record<string, unknown>>(value.daily).map((item) => ({
      day: String(item.day), sales: Number(item.sales), tips: Number(item.tips), settlements: Number(item.settlements),
    })),
    payments: rows<Record<string, unknown>>(value.payments).map((item) => ({
      method: item.method as GastronomyPaymentMethod, amount: Number(item.amount), payments: Number(item.payments),
    })),
    topProducts: rows<Record<string, unknown>>(value.topProducts).map((item) => ({
      productId: String(item.productId), name: String(item.name), quantity: Number(item.quantity), total: Number(item.total),
    })),
    fiscal: rows<Record<string, unknown>>(value.fiscal).map((item) => ({
      status: item.status as GastronomySettlementRecord['fiscalStatus'], count: Number(item.count), total: Number(item.total),
    })),
  };
}

export async function getGastronomySalesReport(
  context: OperationalContext,
  from: Date,
  to: Date,
): Promise<GastronomySalesReportRecord> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('gastronomy_sales_report', {
      p_company_id: context.companyId,
      p_branch_id: productionBranch(context),
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });
    if (error?.message.includes('INVALID_REPORT_PERIOD')) {
      throw new ApiError(400, 'El periodo del reporte no es valido.', 'INVALID_REPORT_PERIOD');
    }
    if (error || !data || typeof data !== 'object') {
      throw new ApiError(503, 'No se pudo generar el reporte gastronomico.', 'GASTRONOMY_REPORT_UNAVAILABLE');
    }
    return normalizeSalesReport(data as Record<string, unknown>);
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const settlements = localSettlementList(context.companyId).filter((item) => {
    const createdAt = new Date(item.createdAt).getTime();
    return createdAt >= from.getTime() && createdAt < to.getTime();
  });
  const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));
  const previousSalesTotal = localSettlementList(context.companyId)
    .filter((item) => new Date(item.createdAt) >= previousFrom && new Date(item.createdAt) < from)
    .reduce((sum, item) => sum + item.saleTotal, 0);
  const daily = new Map<string, { day: string; sales: number; tips: number; settlements: number }>();
  const payments = new Map<GastronomyPaymentMethod, { method: GastronomyPaymentMethod; amount: number; payments: number }>();
  const products = new Map<string, { productId: string; name: string; quantity: number; total: number }>();
  const fiscal = new Map<GastronomySettlementRecord['fiscalStatus'], { status: GastronomySettlementRecord['fiscalStatus']; count: number; total: number }>();
  settlements.forEach((settlement) => {
    const day = settlement.createdAt.slice(0, 10);
    const dayRow = daily.get(day) ?? { day, sales: 0, tips: 0, settlements: 0 };
    dayRow.sales += settlement.saleTotal;
    dayRow.tips += settlement.tipAmount;
    dayRow.settlements += 1;
    daily.set(day, dayRow);
    settlement.payments.forEach((payment) => {
      const row = payments.get(payment.method) ?? { method: payment.method, amount: 0, payments: 0 };
      row.amount += payment.amount;
      row.payments += 1;
      payments.set(payment.method, row);
    });
    (settlement.items ?? []).forEach((item) => {
      const row = products.get(item.productId) ?? { productId: item.productId, name: item.name, quantity: 0, total: 0 };
      row.quantity += item.quantity;
      row.total += item.total;
      products.set(item.productId, row);
    });
    const fiscalRow = fiscal.get(settlement.fiscalStatus) ?? { status: settlement.fiscalStatus, count: 0, total: 0 };
    fiscalRow.count += 1;
    fiscalRow.total += settlement.saleTotal;
    fiscal.set(settlement.fiscalStatus, fiscalRow);
  });
  const salesTotal = settlements.reduce((sum, item) => sum + item.saleTotal, 0);
  const taxTotal = settlements.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    summary: {
      salesTotal: Number(salesTotal.toFixed(2)),
      netTotal: Number((salesTotal - taxTotal).toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      tipsTotal: Number(settlements.reduce((sum, item) => sum + item.tipAmount, 0).toFixed(2)),
      chargedTotal: Number(settlements.reduce((sum, item) => sum + item.chargedTotal, 0).toFixed(2)),
      settlementsCount: settlements.length,
      averageTicket: settlements.length ? Number((salesTotal / settlements.length).toFixed(2)) : 0,
      previousSalesTotal: Number(previousSalesTotal.toFixed(2)),
    },
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
    payments: [...payments.values()].sort((a, b) => b.amount - a.amount),
    topProducts: [...products.values()].sort((a, b) => b.total - a.total).slice(0, 10),
    fiscal: [...fiscal.values()].sort((a, b) => a.status.localeCompare(b.status)),
  };
}
