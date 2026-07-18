'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Barcode,
  Boxes,
  CalendarClock,
  Camera,
  ClipboardCheck,
  Gift,
  Image as ImageIcon,
  LayoutGrid,
  MapPin,
  PackageCheck,
  PackageSearch,
  Pencil,
  Plus,
  Percent,
  Printer,
  Search,
  ShoppingCart,
  Truck,
  X,
} from 'lucide-react';
import { apiFetch, uploadCatalogImage } from '@/lib/client/apiFetch';
import SupermarketConsole, {
  SUPERMARKET_PRODUCTS,
  type SupermarketCashState,
  type SupermarketProduct,
  type SupermarketSaleResult,
} from './SupermarketConsole';
import SupermarketLoyaltyConsole from './SupermarketLoyaltyConsole';
import SupermarketReportsConsole from './SupermarketReportsConsole';
import SupermarketSupplyConsole from './SupermarketSupplyConsole';

type Area = 'pos' | 'catalog' | 'inventory' | 'purchases' | 'lots' | 'operations' | 'layout' | 'loyalty' | 'reports' | 'supply';
type ProductFilter = 'all' | 'active' | 'paused' | 'low' | 'expiring';
type PurchaseStatus = 'draft' | 'ordered' | 'received';

interface Purchase {
  id: string;
  supplier: string;
  productId: string;
  quantity: number;
  unitCost: number;
  expectedDate: string;
  status: PurchaseStatus;
  lotCode: string;
  expirationDate: string;
}

interface StockLot {
  id: string;
  productId: string;
  lotCode: string;
  quantity: number;
  expirationDate: string;
  receivedDate: string;
}

interface Branch {
  id: string;
  name: string;
  isMain: boolean;
  productCount: number;
  stockUnits: number;
}

interface InventoryEvent {
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

interface Transfer {
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

interface StoreLocation {
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

interface ProductPlacement {
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

interface LabelJobLine {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  price: number;
  promo: SupermarketProduct['promo'];
  locationCode: string;
  copies: number;
}

interface LabelJob {
  id: string;
  labelSize: 'shelf_60x30' | 'promo_80x40';
  status: 'pending' | 'printed';
  itemCount: number;
  createdAt: string;
  printedAt: string | null;
  lines: LabelJobLine[];
}

const INITIAL_PRODUCTS = SUPERMARKET_PRODUCTS.map((product) => ({ ...product, imageUrl: null, active: true }));
const EMPTY_PRODUCT: SupermarketProduct = {
  id: '', name: '', price: 0, cost: 0, barcode: '', isWeighed: false, unit: 'unit', category: 'almacen',
  expirationDate: '', daysToExpire: 0, promo: 'none', stock: 0, minStock: 0, supplier: '', imageUrl: null, active: true,
};

const INITIAL_PURCHASES: Purchase[] = [
  { id: 'oc-1042', supplier: 'La Paulina SRL', productId: 's2', quantity: 24, unitCost: 5700, expectedDate: '2026-07-13', status: 'ordered', lotCode: 'QC-260713', expirationDate: '2026-08-02' },
  { id: 'oc-1043', supplier: 'Central Frutera', productId: 's4', quantity: 40, unitCost: 1550, expectedDate: '2026-07-12', status: 'draft', lotCode: 'MZ-260712', expirationDate: '2026-07-22' },
];

const INITIAL_LOTS: StockLot[] = [
  { id: 'lot-1', productId: 's1', lotCode: 'LE-260701', quantity: 60, expirationDate: '2026-07-28', receivedDate: '2026-07-01' },
  { id: 'lot-2', productId: 's2', lotCode: 'QC-260708', quantity: 8, expirationDate: '2026-07-12', receivedDate: '2026-07-08' },
  { id: 'lot-3', productId: 's4', lotCode: 'MZ-260710', quantity: 12, expirationDate: '2026-07-15', receivedDate: '2026-07-10' },
  { id: 'lot-4', productId: 's6', lotCode: 'PA-260711', quantity: 5, expirationDate: '2026-07-11', receivedDate: '2026-07-11' },
];

const money = (value: number) => `$${Math.round(value).toLocaleString('es-AR')}`;
const daysUntil = (date: string) => date ? Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000) : 9999;

export default function SupermarketWorkspaceConsole() {
  const [area, setArea] = useState<Area>('pos');
  const [products, setProducts] = useState<SupermarketProduct[]>(INITIAL_PRODUCTS);
  const [purchases, setPurchases] = useState<Purchase[]>(INITIAL_PURCHASES);
  const [lots, setLots] = useState<StockLot[]>(INITIAL_LOTS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [inventoryEvents, setInventoryEvents] = useState<InventoryEvent[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [placements, setPlacements] = useState<ProductPlacement[]>([]);
  const [labelJobs, setLabelJobs] = useState<LabelJob[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [editingProduct, setEditingProduct] = useState<SupermarketProduct | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [feedback, setFeedback] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [cashState, setCashState] = useState<SupermarketCashState>({
    isOpen: false, cashId: null, openingBalance: 0, expectedCash: 0,
    salesTotal: 0, cashPayments: 0, qrPayments: 0, ticketCount: 0, openedAt: null,
  });

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1) as Area;
      if (['pos', 'catalog', 'inventory', 'purchases', 'lots', 'operations', 'layout', 'loyalty', 'reports', 'supply'].includes(hash)) setArea(hash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    let active = true;
    setSyncing(true);
    Promise.all([
      apiFetch<{ items: SupermarketProduct[] }>('/api/rubros/supermarket/catalog'),
      apiFetch<{ items: Purchase[] }>('/api/rubros/supermarket/purchases'),
      apiFetch<{ items: StockLot[] }>('/api/rubros/supermarket/lots'),
      apiFetch<{ state: SupermarketCashState }>('/api/rubros/supermarket/cash'),
      apiFetch<{ items: Branch[]; currentBranchId: string | null }>('/api/rubros/supermarket/branches'),
      apiFetch<{ items: InventoryEvent[] }>('/api/rubros/supermarket/inventory-events'),
      apiFetch<{ items: Transfer[] }>('/api/rubros/supermarket/transfers'),
      apiFetch<{ items: StoreLocation[] }>('/api/rubros/supermarket/locations'),
      apiFetch<{ items: ProductPlacement[] }>('/api/rubros/supermarket/placements'),
      apiFetch<{ items: LabelJob[] }>('/api/rubros/supermarket/labels'),
    ])
      .then(([catalogResponse, purchasesResponse, lotsResponse, cashResponse, branchesResponse, eventsResponse, transfersResponse, locationsResponse, placementsResponse, labelsResponse]) => {
        if (!active) return;
        setProducts(catalogResponse.items);
        setPurchases(purchasesResponse.items);
        setLots(lotsResponse.items);
        setCashState(cashResponse.state);
        setBranches(branchesResponse.items);
        setCurrentBranchId(branchesResponse.currentBranchId);
        setInventoryEvents(eventsResponse.items);
        setTransfers(transfersResponse.items);
        setLocations(locationsResponse.items);
        setPlacements(placementsResponse.items);
        setLabelJobs(labelsResponse.items);
      })
      .catch((error: unknown) => {
        if (active) setFeedback(error instanceof Error ? error.message : 'No se pudieron sincronizar los datos del supermercado.');
      })
      .finally(() => {
        if (active) setSyncing(false);
      });
    return () => { active = false; };
  }, []);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3000);
  };

  const navigate = (next: Area) => {
    setArea(next);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
  };

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matches = `${product.name} ${product.barcode} ${product.supplier}`.toLowerCase().includes(search.toLowerCase());
    const stateMatches = filter === 'all'
      || (filter === 'active' && product.active !== false)
      || (filter === 'paused' && product.active === false)
      || (filter === 'low' && product.stock <= product.minStock)
      || (filter === 'expiring' && daysUntil(product.expirationDate) <= 7);
    return matches && stateMatches;
  }), [filter, products, search]);

  const activeProducts = useMemo(() => products.filter((product) => product.active !== false && product.stock > 0), [products]);
  const lowStock = products.filter((product) => product.stock <= product.minStock).length;
  const expiringLots = lots.filter((lot) => daysUntil(lot.expirationDate) <= 7).length;
  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.cost, 0);
  const pendingPurchases = purchases.filter((purchase) => purchase.status !== 'received').length;

  const saveProduct = async () => {
    if (!editingProduct?.name.trim() || !editingProduct.barcode.trim()) return;
    const isNew = !editingProduct.id;
    setSyncing(true);
    try {
      const response = await apiFetch<{ item: SupermarketProduct }>('/api/rubros/supermarket/catalog', {
        method: 'POST',
        body: JSON.stringify(editingProduct),
      });
      const saved = response.item;
      setProducts((current) => isNew ? [saved, ...current] : current.map((product) => product.id === saved.id ? saved : product));
      setEditingProduct(null);
      showFeedback(isNew ? 'Producto agregado al catalogo.' : 'Producto actualizado.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo guardar el producto.');
    } finally {
      setSyncing(false);
    }
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingProduct) return;
    if (file.size > 3 * 1024 * 1024) {
      showFeedback('La imagen supera el limite de 3 MB.');
      return;
    }
    setSyncing(true);
    try {
      const imageUrl = await uploadCatalogImage(file, 'supermarket_products');
      setEditingProduct((current) => current ? { ...current, imageUrl } : current);
      showFeedback('Imagen cargada en el catalogo.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo cargar la imagen.');
    } finally {
      setSyncing(false);
    }
  };

  const refreshPosState = async () => {
    const [catalogResponse, lotsResponse, cashResponse] = await Promise.all([
      apiFetch<{ items: SupermarketProduct[] }>('/api/rubros/supermarket/catalog'),
      apiFetch<{ items: StockLot[] }>('/api/rubros/supermarket/lots'),
      apiFetch<{ state: SupermarketCashState }>('/api/rubros/supermarket/cash'),
    ]);
    setProducts(catalogResponse.items);
    setLots(lotsResponse.items);
    setCashState(cashResponse.state);
  };

  const commitSale = async (input: {
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: 'cash' | 'qr';
    idempotencyKey: string;
  }): Promise<SupermarketSaleResult> => {
    const response = await apiFetch<{ sale: SupermarketSaleResult }>('/api/rubros/supermarket/sales', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({ items: input.items, paymentMethod: input.paymentMethod }),
    });
    await refreshPosState();
    return response.sale;
  };

  const openCash = async (openingBalance: number) => {
    const response = await apiFetch<{ state: SupermarketCashState }>('/api/rubros/supermarket/cash', {
      method: 'POST', body: JSON.stringify({ openingBalance }),
    });
    setCashState(response.state);
  };

  const closeCash = async (declaredCash: number) => {
    const response = await apiFetch<{ result: { difference: number } }>('/api/rubros/supermarket/cash', {
      method: 'PATCH', body: JSON.stringify({ declaredCash }),
    });
    await refreshPosState();
    return response.result;
  };

  const registerReturn = async (input: {
    barcode: string; quantity: number; reason: string;
    disposition: 'restock' | 'waste'; idempotencyKey: string;
  }) => {
    const response = await apiFetch<{ item: { productName: string } }>('/api/rubros/supermarket/returns', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify(input),
    });
    await refreshPosState();
    return response.item;
  };

  const refreshInventoryControls = async () => {
    const [catalogResponse, lotsResponse, branchesResponse, eventsResponse, transfersResponse] = await Promise.all([
      apiFetch<{ items: SupermarketProduct[] }>('/api/rubros/supermarket/catalog'),
      apiFetch<{ items: StockLot[] }>('/api/rubros/supermarket/lots'),
      apiFetch<{ items: Branch[]; currentBranchId: string | null }>('/api/rubros/supermarket/branches'),
      apiFetch<{ items: InventoryEvent[] }>('/api/rubros/supermarket/inventory-events'),
      apiFetch<{ items: Transfer[] }>('/api/rubros/supermarket/transfers'),
    ]);
    setProducts(catalogResponse.items);
    setLots(lotsResponse.items);
    setBranches(branchesResponse.items);
    setCurrentBranchId(branchesResponse.currentBranchId);
    setInventoryEvents(eventsResponse.items);
    setTransfers(transfersResponse.items);
  };

  const adjustInventory = async (input: { productId: string; operation: 'count' | 'waste'; quantity: number; reason: string }) => {
    const key = `supermarket-${input.operation}:${crypto.randomUUID()}`;
    await apiFetch('/api/rubros/supermarket/inventory-events', {
      method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(input),
    });
    await refreshInventoryControls();
    showFeedback(input.operation === 'count' ? 'Conteo aplicado y diferencia auditada.' : 'Merma registrada y lote FEFO actualizado.');
  };

  const transferStock = async (input: { destinationBranchId: string; productId: string; quantity: number; notes: string }) => {
    await apiFetch('/api/rubros/supermarket/transfers', {
      method: 'POST', headers: { 'Idempotency-Key': `supermarket-transfer:${crypto.randomUUID()}` }, body: JSON.stringify(input),
    });
    await refreshInventoryControls();
    showFeedback('Transferencia completada con trazabilidad de lotes.');
  };

  const applyBulkPrices = async (input: { description: string; items: Array<{ productId: string; newPrice: number; promo: SupermarketProduct['promo'] }> }) => {
    const response = await apiFetch<{ result: { updatedCount: number } }>('/api/rubros/supermarket/bulk-prices', {
      method: 'POST', headers: { 'Idempotency-Key': `supermarket-prices:${crypto.randomUUID()}` }, body: JSON.stringify(input),
    });
    await refreshInventoryControls();
    showFeedback(`${response.result.updatedCount} precios actualizados.`);
  };

  const refreshLayout = async () => {
    const [locationsResponse, placementsResponse, labelsResponse] = await Promise.all([
      apiFetch<{ items: StoreLocation[] }>('/api/rubros/supermarket/locations'),
      apiFetch<{ items: ProductPlacement[] }>('/api/rubros/supermarket/placements'),
      apiFetch<{ items: LabelJob[] }>('/api/rubros/supermarket/labels'),
    ]);
    setLocations(locationsResponse.items);
    setPlacements(placementsResponse.items);
    setLabelJobs(labelsResponse.items);
  };

  const saveLocation = async (input: Omit<StoreLocation, 'assignedProducts'>) => {
    await apiFetch('/api/rubros/supermarket/locations', { method: 'POST', body: JSON.stringify(input) });
    await refreshLayout();
    showFeedback(input.id ? 'Ubicacion actualizada.' : 'Ubicacion creada.');
  };

  const savePlacement = async (input: { productId: string; locationId: string; facingCount: number; capacity: number; reorderPoint: number }) => {
    await apiFetch('/api/rubros/supermarket/placements', { method: 'POST', body: JSON.stringify(input) });
    await refreshLayout();
    showFeedback('Producto asignado a la gondola.');
  };

  const createLabelJob = async (input: { labelSize: LabelJob['labelSize']; items: Array<{ productId: string; copies: number }> }) => {
    const response = await apiFetch<{ item: LabelJob }>('/api/rubros/supermarket/labels', {
      method: 'POST', headers: { 'Idempotency-Key': `supermarket-labels:${crypto.randomUUID()}` }, body: JSON.stringify(input),
    });
    setLabelJobs((current) => [response.item, ...current.filter((job) => job.id !== response.item.id)]);
    showFeedback(`${response.item.itemCount} etiquetas preparadas.`);
    return response.item;
  };

  const markLabelJobPrinted = async (jobId: string) => {
    await apiFetch('/api/rubros/supermarket/labels', { method: 'PATCH', body: JSON.stringify({ jobId }) });
    await refreshLayout();
    showFeedback('Impresion registrada en el historial.');
  };

  const savePurchase = async () => {
    if (!editingPurchase?.supplier.trim() || !editingPurchase.productId || editingPurchase.quantity <= 0) return;
    const isNew = !editingPurchase.id;
    setSyncing(true);
    try {
      const response = await apiFetch<{ item: Purchase }>('/api/rubros/supermarket/purchases', {
        method: 'POST',
        body: JSON.stringify(editingPurchase),
      });
      const saved = response.item;
      setPurchases((current) => isNew ? [saved, ...current] : current.map((purchase) => purchase.id === saved.id ? saved : purchase));
      setEditingPurchase(null);
      showFeedback(isNew ? 'Orden de compra creada.' : 'Orden de compra actualizada.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo guardar la compra.');
    } finally {
      setSyncing(false);
    }
  };

  const createSuggestedPurchase = async (input: Omit<Purchase, 'id'>) => {
    const response = await apiFetch<{ item: Purchase }>('/api/rubros/supermarket/purchases', {
      method: 'POST', body: JSON.stringify(input),
    });
    setPurchases((current) => [response.item, ...current.filter((item) => item.id !== response.item.id)]);
  };

  const refreshPurchases = async () => {
    const response = await apiFetch<{ items: Purchase[] }>('/api/rubros/supermarket/purchases');
    setPurchases(response.items);
  };

  const receivePurchase = async (purchase: Purchase) => {
    if (purchase.status !== 'ordered') return;
    setSyncing(true);
    try {
      await apiFetch('/api/rubros/supermarket/purchases', {
        method: 'PATCH',
        body: JSON.stringify({ orderId: purchase.id }),
      });
      const [catalogResponse, purchasesResponse, lotsResponse] = await Promise.all([
        apiFetch<{ items: SupermarketProduct[] }>('/api/rubros/supermarket/catalog'),
        apiFetch<{ items: Purchase[] }>('/api/rubros/supermarket/purchases'),
        apiFetch<{ items: StockLot[] }>('/api/rubros/supermarket/lots'),
      ]);
      setProducts(catalogResponse.items);
      setPurchases(purchasesResponse.items);
      setLots(lotsResponse.items);
      showFeedback('Mercaderia recibida: stock, costo y lote actualizados.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo recibir la compra.');
    } finally {
      setSyncing(false);
    }
  };

  const toggleProduct = async (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setSyncing(true);
    try {
      const response = await apiFetch<{ item: SupermarketProduct }>('/api/rubros/supermarket/catalog', {
        method: 'POST',
        body: JSON.stringify({ ...product, active: product.active === false }),
      });
      setProducts((current) => current.map((item) => item.id === productId ? response.item : item));
      showFeedback(response.item.active ? 'Producto habilitado.' : 'Producto pausado.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo cambiar el estado del producto.');
    } finally {
      setSyncing(false);
    }
  };

  const tabs: Array<{ id: Area; label: string; icon: typeof ShoppingCart }> = [
    { id: 'pos', label: 'Caja POS', icon: ShoppingCart },
    { id: 'catalog', label: 'Catalogo', icon: Barcode },
    { id: 'inventory', label: 'Stock', icon: Boxes },
    { id: 'purchases', label: 'Compras', icon: Truck },
    { id: 'lots', label: 'Lotes', icon: CalendarClock },
    { id: 'operations', label: 'Control', icon: ClipboardCheck },
    { id: 'layout', label: 'Gondolas', icon: LayoutGrid },
    { id: 'loyalty', label: 'Fidelizacion', icon: Gift },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'supply', label: 'Abastecimiento', icon: PackageSearch },
  ];

  return (
    <div className="space-y-4" data-testid="supermarket-workspace">
      {(feedback || syncing) && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{syncing ? 'Sincronizando datos...' : feedback}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Productos activos" value={String(activeProducts.length)} detail={`${products.length} referencias`} />
        <Metric label="Stock bajo" value={String(lowStock)} detail="Requieren reposicion" warning={lowStock > 0} />
        <Metric label="Proximos a vencer" value={String(expiringLots)} detail="Lotes dentro de 7 dias" warning={expiringLots > 0} />
        <Metric label="Valor del inventario" value={money(inventoryValue)} detail={`${pendingPurchases} compras pendientes`} />
      </div>

      <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Gestion de supermercado"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={area === id} onClick={() => navigate(id)} className={`flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${area === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>

      {area === 'pos' && <SupermarketConsole
        products={activeProducts}
        cashState={cashState}
        onSaleCommitted={commitSale}
        onCashOpened={openCash}
        onCashClosed={closeCash}
        onReturnRegistered={registerReturn}
        onNavigatePurchases={() => navigate('purchases')}
      />}

      {area === 'catalog' && <Catalog products={visibleProducts} allProducts={products} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onEdit={(product) => setEditingProduct({ ...product })} onCreate={() => setEditingProduct({ ...EMPTY_PRODUCT })} onToggle={toggleProduct} />}

      {area === 'inventory' && (
        <section className="space-y-4" aria-label="Stock y reposicion">
          <SectionHeader title="Existencias por producto" detail="Stock actual, minimo, costo y sugerencia de compra." action={<button onClick={() => navigate('purchases')} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Truck className="h-4 w-4" />Generar compra</button>} />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Minimo</th><th className="px-4 py-3">Costo</th><th className="px-4 py-3">Sugerido</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => { const low = product.stock <= product.minStock; const suggested = Math.max(0, product.minStock * 2 - product.stock); return <tr key={product.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-bold text-slate-900">{product.name}</p><p className="text-xs text-slate-500">EAN {product.barcode}</p></td><td className="px-4 py-3 text-slate-600">{product.supplier}</td><td className={`px-4 py-3 font-bold ${low ? 'text-amber-700' : 'text-slate-900'}`}>{low && <AlertTriangle className="mr-1 inline h-4 w-4" />}{product.stock} {product.unit === 'kg' ? 'kg' : 'u.'}</td><td className="px-4 py-3">{product.minStock}</td><td className="px-4 py-3">{money(product.cost)}</td><td className="px-4 py-3 font-semibold text-emerald-700">{suggested || '-'}</td><td className="px-4 py-3 text-right"><button onClick={() => setEditingProduct({ ...product })} aria-label={`Editar stock de ${product.name}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div>
        </section>
      )}

      {area === 'purchases' && (
        <section className="space-y-4" aria-label="Ordenes de compra">
          <SectionHeader title="Compras a proveedores" detail="Borradores, autorizacion y recepcion controlada al inventario." action={<button onClick={() => setEditingPurchase({ id: '', supplier: '', productId: products[0]?.id ?? '', quantity: 1, unitCost: products[0]?.cost ?? 0, expectedDate: '', status: 'draft', lotCode: '', expirationDate: '' })} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nueva compra</button>} />
          <div className="grid gap-3 lg:grid-cols-2">{purchases.map((purchase) => { const product = products.find((item) => item.id === purchase.productId); return <article key={purchase.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">{purchase.id}</p><h3 className="font-bold text-slate-900">{product?.name}</h3><p className="text-sm text-slate-500">{purchase.supplier}</p></div><Status value={purchase.status} /></div><div className="mt-4 grid grid-cols-3 gap-3"><Value label="Cantidad" value={String(purchase.quantity)} /><Value label="Costo unit." value={money(purchase.unitCost)} /><Value label="Total" value={money(purchase.quantity * purchase.unitCost)} /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Entrega: {purchase.expectedDate || 'Sin fecha'}</p><div className="flex gap-2">{purchase.status === 'draft' && <button onClick={() => setEditingPurchase({ ...purchase })} aria-label={`Editar ${purchase.id}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button>}{purchase.status === 'ordered' && <button onClick={() => receivePurchase(purchase)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><PackageCheck className="h-4 w-4" />Recibir</button>}</div></div></article>; })}</div>
        </section>
      )}

      {area === 'lots' && (
        <section className="space-y-4" aria-label="Lotes y vencimientos">
          <SectionHeader title="Trazabilidad de lotes" detail="Prioridad FEFO para reducir merma por vencimiento." />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Lote</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Existencia</th><th className="px-4 py-3">Ingreso</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{[...lots].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)).map((lot) => { const product = products.find((item) => item.id === lot.productId); const days = daysUntil(lot.expirationDate); return <tr key={lot.id}><td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{lot.lotCode}</td><td className="px-4 py-3 font-bold text-slate-900">{product?.name}</td><td className="px-4 py-3">{lot.quantity} {product?.unit === 'kg' ? 'kg' : 'u.'}</td><td className="px-4 py-3 text-slate-600">{lot.receivedDate}</td><td className="px-4 py-3 font-semibold">{lot.expirationDate}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${days <= 2 ? 'bg-rose-100 text-rose-700' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{days < 0 ? 'Vencido' : days === 0 ? 'Vence hoy' : `${days} dias`}</span></td></tr>; })}</tbody></table></div>
        </section>
      )}

      {area === 'operations' && <InventoryOperations
        products={products}
        branches={branches}
        currentBranchId={currentBranchId}
        events={inventoryEvents}
        transfers={transfers}
        busy={syncing}
        onAdjust={adjustInventory}
        onTransfer={transferStock}
        onBulkPrices={applyBulkPrices}
      />}

      {area === 'layout' && <StoreLayoutConsole
        products={products}
        locations={locations}
        placements={placements}
        labelJobs={labelJobs}
        busy={syncing}
        onSaveLocation={saveLocation}
        onSavePlacement={savePlacement}
        onCreateLabels={createLabelJob}
        onMarkPrinted={markLabelJobPrinted}
      />}

      {area === 'loyalty' && <SupermarketLoyaltyConsole />}

      {area === 'reports' && <SupermarketReportsConsole branches={branches} />}

      {area === 'supply' && <SupermarketSupplyConsole products={products} purchases={purchases} onCreatePurchase={createSuggestedPurchase} onPurchasesChanged={refreshPurchases} />}

      {editingProduct && <ProductEditor product={editingProduct} setProduct={setEditingProduct} onImage={uploadImage} onSave={saveProduct} onClose={() => setEditingProduct(null)} />}
      {editingPurchase && <PurchaseEditor purchase={editingPurchase} setPurchase={setEditingPurchase} products={products} onSave={savePurchase} onClose={() => setEditingPurchase(null)} />}
    </div>
  );
}

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="mb-3 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>;
}

function StoreLayoutConsole({
  products, locations, placements, labelJobs, busy,
  onSaveLocation, onSavePlacement, onCreateLabels, onMarkPrinted,
}: {
  products: SupermarketProduct[];
  locations: StoreLocation[];
  placements: ProductPlacement[];
  labelJobs: LabelJob[];
  busy: boolean;
  onSaveLocation: (input: Omit<StoreLocation, 'assignedProducts'>) => Promise<void>;
  onSavePlacement: (input: { productId: string; locationId: string; facingCount: number; capacity: number; reorderPoint: number }) => Promise<void>;
  onCreateLabels: (input: { labelSize: LabelJob['labelSize']; items: Array<{ productId: string; copies: number }> }) => Promise<LabelJob>;
  onMarkPrinted: (jobId: string) => Promise<void>;
}) {
  const emptyLocation = { id: '', code: '', zone: '', aisle: '', shelf: '', bin: '', description: '', active: true };
  const [locationDraft, setLocationDraft] = useState<Omit<StoreLocation, 'assignedProducts'>>(emptyLocation);
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [facingCount, setFacingCount] = useState(1);
  const [capacity, setCapacity] = useState(12);
  const [reorderPoint, setReorderPoint] = useState(4);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState<LabelJob['labelSize']>('shelf_60x30');
  const [previewJob, setPreviewJob] = useState<LabelJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const activeLocations = locations.filter((location) => location.active);
  const unassignedCount = products.filter((product) => !placements.some((placement) => placement.productId === product.id)).length;
  const restockCount = placements.filter((placement) => placement.needsRestock).length;

  const execute = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setError('');
    try { await action(); } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operacion.');
    } finally { setSubmitting(false); }
  };

  const submitLocation = (event: FormEvent) => {
    event.preventDefault();
    if (!locationDraft.code.trim() || !locationDraft.zone.trim()) return;
    void execute(async () => {
      await onSaveLocation(locationDraft);
      setLocationDraft(emptyLocation);
    });
  };

  const editPlacement = (placement: ProductPlacement) => {
    setProductId(placement.productId);
    setLocationId(placement.locationId);
    setFacingCount(placement.facingCount);
    setCapacity(placement.capacity);
    setReorderPoint(placement.reorderPoint);
  };

  const submitPlacement = (event: FormEvent) => {
    event.preventDefault();
    if (!productId || !locationId || reorderPoint > capacity) return;
    void execute(async () => {
      await onSavePlacement({ productId, locationId, facingCount, capacity, reorderPoint });
      setProductId('');
    });
  };

  const toggleSelected = (id: string) => setSelectedProducts((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);

  const submitLabels = () => {
    if (selectedProducts.length === 0) return;
    void execute(async () => {
      const job = await onCreateLabels({ labelSize, items: selectedProducts.map((id) => ({ productId: id, copies })) });
      setPreviewJob(job);
      setSelectedProducts([]);
    });
  };

  return (
    <section className="space-y-6" aria-label="Gondolas y etiquetas de supermercado">
      <SectionHeader title="Gondolas y etiquetas" detail="Mapa comercial, capacidad de exhibicion, reposicion y precios listos para imprimir." />
      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Ubicaciones activas" value={String(activeLocations.length)} detail={`${locations.length} configuradas`} />
        <Metric label="Sin ubicacion" value={String(unassignedCount)} detail="Productos por organizar" warning={unassignedCount > 0} />
        <Metric label="Reposicion de gondola" value={String(restockCount)} detail="Bajo el punto definido" warning={restockCount > 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={submitLocation} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-600" /><h3 className="font-bold text-slate-900">{locationDraft.id ? 'Editar ubicacion' : 'Nueva ubicacion'}</h3></div>{locationDraft.id && <button type="button" onClick={() => setLocationDraft(emptyLocation)} className="text-xs font-bold text-slate-500">Cancelar edicion</button>}</div>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Codigo interno"><input required value={locationDraft.code} onChange={(event) => setLocationDraft({ ...locationDraft, code: event.target.value })} placeholder="A1-G2-E3" maxLength={40} className={inputClass} /></Field>
            <Field label="Zona"><input required value={locationDraft.zone} onChange={(event) => setLocationDraft({ ...locationDraft, zone: event.target.value })} placeholder="Almacen" maxLength={80} className={inputClass} /></Field>
            <Field label="Pasillo"><input value={locationDraft.aisle} onChange={(event) => setLocationDraft({ ...locationDraft, aisle: event.target.value })} maxLength={40} className={inputClass} /></Field>
            <Field label="Estante"><input value={locationDraft.shelf} onChange={(event) => setLocationDraft({ ...locationDraft, shelf: event.target.value })} maxLength={40} className={inputClass} /></Field>
            <Field label="Contenedor"><input value={locationDraft.bin} onChange={(event) => setLocationDraft({ ...locationDraft, bin: event.target.value })} maxLength={40} className={inputClass} /></Field>
            <Field label="Estado"><span className="flex h-10 items-center justify-between rounded-md border border-slate-300 px-3 text-sm font-semibold">Ubicacion activa<input type="checkbox" checked={locationDraft.active} onChange={(event) => setLocationDraft({ ...locationDraft, active: event.target.checked })} className="h-4 w-4 accent-emerald-600" /></span></Field>
          </div>
          <Field label="Descripcion"><input value={locationDraft.description} onChange={(event) => setLocationDraft({ ...locationDraft, description: event.target.value })} placeholder="Referencia para el equipo de reposicion" maxLength={200} className={inputClass} /></Field>
          <button disabled={busy || submitting} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white disabled:opacity-50"><MapPin className="h-4 w-4" />Guardar ubicacion</button>
        </form>

        <form onSubmit={submitPlacement} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-cyan-600" /><h3 className="font-bold text-slate-900">Asignar producto</h3></div>
          <Field label="Producto"><select required value={productId} onChange={(event) => { const next = event.target.value; const product = products.find((item) => item.id === next); const existing = placements.find((item) => item.productId === next); setProductId(next); if (existing) editPlacement(existing); else { setCapacity(Math.max(product?.minStock ?? 0, 1) * 2); setReorderPoint(product?.minStock ?? 0); } }} className={inputClass}><option value="">Seleccionar producto</option>{products.filter((product) => product.active !== false).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
          <Field label="Ubicacion"><select required value={locationId} onChange={(event) => setLocationId(event.target.value)} className={inputClass}><option value="">Seleccionar gondola</option>{activeLocations.map((location) => <option key={location.id} value={location.id}>{location.code} - {location.zone}</option>)}</select></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Frentes"><input required type="number" min="0" step="1" value={facingCount} onChange={(event) => setFacingCount(Number(event.target.value))} className={inputClass} /></Field>
            <Field label="Capacidad"><input required type="number" min="0" step="0.001" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className={inputClass} /></Field>
            <Field label="Reponer en"><input required type="number" min="0" max={capacity} step="0.001" value={reorderPoint} onChange={(event) => setReorderPoint(Number(event.target.value))} className={inputClass} /></Field>
          </div>
          {reorderPoint > capacity && <p className="mb-3 text-xs font-semibold text-rose-600">El punto de reposicion no puede superar la capacidad.</p>}
          <button disabled={busy || submitting || !productId || !locationId || reorderPoint > capacity} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-600 text-sm font-bold text-white disabled:opacity-50"><LayoutGrid className="h-4 w-4" />Guardar asignacion</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center"><div><h3 className="font-bold text-slate-900">Mapa de productos</h3><p className="text-xs text-slate-500">Selecciona referencias para generar etiquetas con el precio actual.</p></div><button type="button" onClick={() => setSelectedProducts(selectedProducts.length === placements.length ? [] : placements.map((item) => item.productId))} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700">{selectedProducts.length === placements.length && placements.length > 0 ? 'Quitar seleccion' : 'Seleccionar todos'}</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="w-12 px-4 py-3">Etiq.</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Ubicacion</th><th className="px-4 py-3">Frentes</th><th className="px-4 py-3">Stock / capacidad</th><th className="px-4 py-3">Reposicion</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{placements.map((placement) => { const fill = placement.capacity > 0 ? Math.min(100, (placement.stock / placement.capacity) * 100) : 0; return <tr key={placement.id} className={placement.needsRestock ? 'bg-amber-50/60' : ''}><td className="px-4 py-3"><input type="checkbox" checked={selectedProducts.includes(placement.productId)} onChange={() => toggleSelected(placement.productId)} aria-label={`Seleccionar etiqueta de ${placement.productName}`} className="h-4 w-4 accent-emerald-600" /></td><td className="px-4 py-3"><p className="font-bold text-slate-900">{placement.productName}</p><p className="text-xs text-slate-500">EAN {placement.barcode}</p></td><td className="px-4 py-3"><p className="font-mono text-xs font-bold text-slate-800">{placement.locationCode}</p><p className="text-xs text-slate-500">{placement.zone}</p></td><td className="px-4 py-3 font-semibold">{placement.facingCount}</td><td className="px-4 py-3"><p className="font-semibold">{placement.stock} / {placement.capacity}</p><div className="mt-1 h-1.5 w-28 overflow-hidden rounded bg-slate-100"><div className={`h-full ${placement.needsRestock ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fill}%` }} /></div></td><td className="px-4 py-3">{placement.needsRestock ? <span className="inline-flex items-center gap-1 font-bold text-amber-700"><AlertTriangle className="h-4 w-4" />Reponer</span> : <span className="font-semibold text-emerald-700">Cubierta</span>}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => editPlacement(placement)} aria-label={`Editar ubicacion de ${placement.productName}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button></td></tr>; })}{placements.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Asigna productos para construir el mapa de la sucursal.</td></tr>}</tbody></table></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Printer className="h-5 w-5 text-indigo-600" /><h3 className="font-bold text-slate-900">Preparar etiquetas</h3></div>
          <Field label="Formato"><select value={labelSize} onChange={(event) => setLabelSize(event.target.value as LabelJob['labelSize'])} className={inputClass}><option value="shelf_60x30">Gondola 60 x 30 mm</option><option value="promo_80x40">Promocion 80 x 40 mm</option></select></Field>
          <Field label="Copias por producto"><input type="number" min="1" max="100" step="1" value={copies} onChange={(event) => setCopies(Math.min(100, Math.max(1, Number(event.target.value))))} className={inputClass} /></Field>
          <div className="mb-4 border-y border-slate-100 py-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Productos</span><strong>{selectedProducts.length}</strong></div><div className="mt-1 flex justify-between"><span className="text-slate-500">Etiquetas</span><strong>{selectedProducts.length * copies}</strong></div></div>
          <button type="button" onClick={submitLabels} disabled={busy || submitting || selectedProducts.length === 0} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-bold text-white disabled:opacity-50"><Printer className="h-4 w-4" />Generar trabajo</button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-bold text-slate-900">Historial de etiquetas</h3></div>
          <div className="divide-y divide-slate-100">{labelJobs.slice(0, 10).map((job) => <div key={job.id} className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${job.status === 'printed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{job.status === 'printed' ? 'Impreso' : 'Pendiente'}</span><strong className="text-sm text-slate-900">{job.itemCount} etiquetas</strong></div><p className="mt-1 text-xs text-slate-500">{job.labelSize === 'shelf_60x30' ? '60 x 30 mm' : '80 x 40 mm'} - {new Date(job.createdAt).toLocaleString('es-AR')}</p></div><button type="button" onClick={() => setPreviewJob(job)} className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700"><Printer className="h-4 w-4" />{job.status === 'printed' ? 'Ver etiquetas' : 'Revisar e imprimir'}</button></div>)}{labelJobs.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Todavia no hay trabajos de impresion.</p>}</div>
        </div>
      </div>

      {previewJob && <LabelPrintPreview job={previewJob} busy={busy || submitting} onClose={() => setPreviewJob(null)} onPrinted={() => execute(async () => { window.print(); await onMarkPrinted(previewJob.id); setPreviewJob((current) => current ? { ...current, status: 'printed', printedAt: new Date().toISOString() } : current); })} />}
    </section>
  );
}

function LabelPrintPreview({ job, busy, onClose, onPrinted }: { job: LabelJob; busy: boolean; onClose: () => void; onPrinted: () => void }) {
  const labels = job.lines.flatMap((line) => Array.from({ length: line.copies }, (_, index) => ({ ...line, copy: index + 1 })));
  return <Modal title="Vista previa de etiquetas" onClose={onClose} footer={<><button onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold">Cerrar</button>{job.status === 'pending' && <button onClick={onPrinted} disabled={busy} className="flex h-9 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50"><Printer className="h-4 w-4" />Imprimir y confirmar</button>}</>}><style>{'@media print { body * { visibility: hidden !important; } [data-label-sheet], [data-label-sheet] * { visibility: visible !important; } [data-label-sheet] { position: absolute; inset: 0; width: 100%; background: white; padding: 8mm; } }'}</style><div data-label-sheet className={`grid gap-3 ${job.labelSize === 'promo_80x40' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>{labels.map((line) => <article key={`${line.id}-${line.copy}`} className={`flex flex-col justify-between border-2 border-slate-900 bg-white p-3 text-slate-950 ${job.labelSize === 'promo_80x40' ? 'min-h-40' : 'min-h-32'}`}><div><div className="flex items-start justify-between gap-2"><strong className="text-sm leading-tight">{line.productName}</strong><span className="font-mono text-[10px]">{line.locationCode}</span></div>{line.promo !== 'none' && <p className="mt-1 text-xs font-black uppercase text-rose-700">Promo {line.promo === '30off' ? '30% OFF' : '2 x 1'}</p>}</div><div className="mt-2"><p className="text-right text-3xl font-black">{money(line.price)}</p><div className="mt-2 flex items-end justify-between gap-2"><Barcode className="h-6 flex-1" /><span className="font-mono text-[9px]">{line.barcode}</span></div></div></article>)}</div></Modal>;
}

function InventoryOperations({
  products, branches, currentBranchId, events, transfers, busy, onAdjust, onTransfer, onBulkPrices,
}: {
  products: SupermarketProduct[];
  branches: Branch[];
  currentBranchId: string | null;
  events: InventoryEvent[];
  transfers: Transfer[];
  busy: boolean;
  onAdjust: (input: { productId: string; operation: 'count' | 'waste'; quantity: number; reason: string }) => Promise<void>;
  onTransfer: (input: { destinationBranchId: string; productId: string; quantity: number; notes: string }) => Promise<void>;
  onBulkPrices: (input: { description: string; items: Array<{ productId: string; newPrice: number; promo: SupermarketProduct['promo'] }> }) => Promise<void>;
}) {
  const [operation, setOperation] = useState<'count' | 'waste'>('count');
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [reason, setReason] = useState('Conteo ciclico de gondola');
  const [transferProductId, setTransferProductId] = useState('');
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferNotes, setTransferNotes] = useState('Reposicion entre sucursales');
  const [priceCategory, setPriceCategory] = useState('all');
  const [pricePercentage, setPricePercentage] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const destinations = branches.filter((branch) => branch.id !== currentBranchId);
  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const priceTargets = products.filter((product) => product.active !== false && (priceCategory === 'all' || product.category === priceCategory));

  const execute = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setError('');
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operacion.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdjustment = (event: FormEvent) => {
    event.preventDefault();
    if (!adjustProductId || adjustQuantity < 0 || !reason.trim()) return;
    void execute(() => onAdjust({ productId: adjustProductId, operation, quantity: adjustQuantity, reason }));
  };

  const submitTransfer = (event: FormEvent) => {
    event.preventDefault();
    if (!transferProductId || !destinationBranchId || transferQuantity <= 0) return;
    void execute(() => onTransfer({ destinationBranchId, productId: transferProductId, quantity: transferQuantity, notes: transferNotes }));
  };

  const submitPrices = (event: FormEvent) => {
    event.preventDefault();
    if (priceTargets.length === 0 || pricePercentage < -90 || pricePercentage > 1000) return;
    const multiplier = 1 + pricePercentage / 100;
    void execute(() => onBulkPrices({
      description: `${pricePercentage >= 0 ? 'Aumento' : 'Reduccion'} ${Math.abs(pricePercentage)}% - ${priceCategory === 'all' ? 'catalogo completo' : priceCategory}`,
      items: priceTargets.map((product) => ({
        productId: product.id,
        newPrice: Number(Math.max(0, product.price * multiplier).toFixed(2)),
        promo: product.promo,
      })),
    }));
  };

  return (
    <section className="space-y-6" aria-label="Control operativo de supermercado">
      <SectionHeader title="Control operativo" detail="Ajustes auditados, movimientos entre sucursales y precios por lote." />
      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={submitAdjustment} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-emerald-600" /><h3 className="font-bold text-slate-900">Conteos y mermas</h3></div>
          <div className="mb-4 grid grid-cols-2 rounded-md bg-slate-100 p-1" role="group" aria-label="Tipo de ajuste">
            <button type="button" onClick={() => { setOperation('count'); setReason('Conteo ciclico de gondola'); }} className={`h-9 rounded text-sm font-bold ${operation === 'count' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Conteo</button>
            <button type="button" onClick={() => { setOperation('waste'); setReason('Producto vencido o danado'); }} className={`h-9 rounded text-sm font-bold ${operation === 'waste' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Merma</button>
          </div>
          <Field label="Producto"><select required value={adjustProductId} onChange={(event) => { const id = event.target.value; setAdjustProductId(id); if (operation === 'count') setAdjustQuantity(products.find((product) => product.id === id)?.stock ?? 0); }} className={inputClass}><option value="">Seleccionar producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} - stock {product.stock}</option>)}</select></Field>
          <Field label={operation === 'count' ? 'Cantidad fisica contada' : 'Cantidad descartada'}><input required type="number" min={operation === 'waste' ? 0.001 : 0} step="0.001" value={adjustQuantity} onChange={(event) => setAdjustQuantity(Number(event.target.value))} className={inputClass} /></Field>
          <Field label="Motivo"><input required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={160} className={inputClass} /></Field>
          <button disabled={busy || submitting || !adjustProductId} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white disabled:opacity-50"><ClipboardCheck className="h-4 w-4" />Registrar {operation === 'count' ? 'conteo' : 'merma'}</button>
        </form>

        <form onSubmit={submitTransfer} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-cyan-600" /><h3 className="font-bold text-slate-900">Transferencia de stock</h3></div>
          <Field label="Producto"><select required value={transferProductId} onChange={(event) => setTransferProductId(event.target.value)} className={inputClass}><option value="">Seleccionar producto</option>{products.filter((product) => product.stock > 0).map((product) => <option key={product.id} value={product.id}>{product.name} - disponible {product.stock}</option>)}</select></Field>
          <Field label="Sucursal destino"><select required value={destinationBranchId} onChange={(event) => setDestinationBranchId(event.target.value)} className={inputClass}><option value="">Seleccionar destino</option>{destinations.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field>
          <Field label="Cantidad"><input required type="number" min="0.001" step="0.001" value={transferQuantity} onChange={(event) => setTransferQuantity(Number(event.target.value))} className={inputClass} /></Field>
          <Field label="Referencia"><input value={transferNotes} onChange={(event) => setTransferNotes(event.target.value)} maxLength={200} className={inputClass} /></Field>
          {destinations.length === 0 && <p className="mb-3 text-xs font-semibold text-amber-700">La empresa necesita una segunda sucursal para transferir.</p>}
          <button disabled={busy || submitting || !transferProductId || !destinationBranchId} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-600 text-sm font-bold text-white disabled:opacity-50"><ArrowLeftRight className="h-4 w-4" />Transferir</button>
        </form>

        <form onSubmit={submitPrices} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Percent className="h-5 w-5 text-indigo-600" /><h3 className="font-bold text-slate-900">Precios masivos</h3></div>
          <Field label="Categoria"><select value={priceCategory} onChange={(event) => setPriceCategory(event.target.value)} className={inputClass}><option value="all">Todo el catalogo</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
          <Field label="Variacion porcentual"><div className="relative"><input required type="number" min="-90" max="1000" step="0.1" value={pricePercentage} onChange={(event) => setPricePercentage(Number(event.target.value))} className={`${inputClass} pr-9`} /><Percent className="absolute right-3 top-3 h-4 w-4 text-slate-400" /></div></Field>
          <div className="mb-4 border-y border-slate-100 py-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Productos afectados</span><strong>{priceTargets.length}</strong></div><div className="mt-1 flex justify-between"><span className="text-slate-500">Ejemplo</span><strong>{priceTargets[0] ? `${money(priceTargets[0].price)} a ${money(priceTargets[0].price * (1 + pricePercentage / 100))}` : '-'}</strong></div></div>
          <button disabled={busy || submitting || priceTargets.length === 0} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-bold text-white disabled:opacity-50"><Percent className="h-4 w-4" />Aplicar a {priceTargets.length} productos</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h3 className="font-bold text-slate-900">Ultimos controles</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Diferencia</th><th className="px-4 py-3">Motivo</th><th className="px-4 py-3">Fecha</th></tr></thead><tbody className="divide-y divide-slate-100">{events.slice(0, 12).map((event) => <tr key={event.id}><td className="px-4 py-3 font-bold">{event.operation === 'count' ? 'Conteo' : 'Merma'}</td><td className="px-4 py-3">{event.productName}</td><td className={`px-4 py-3 font-bold ${event.delta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{event.delta > 0 ? '+' : ''}{event.delta}</td><td className="px-4 py-3 text-slate-600">{event.reason}</td><td className="px-4 py-3 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString('es-AR')}</td></tr>)}{events.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Sin controles registrados.</td></tr>}</tbody></table></div></div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h3 className="font-bold text-slate-900">Transferencias recientes</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Numero</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Ruta</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Fecha</th></tr></thead><tbody className="divide-y divide-slate-100">{transfers.slice(0, 12).map((transfer) => <tr key={transfer.id}><td className="px-4 py-3 font-mono font-bold">#{transfer.transferNumber}</td><td className="px-4 py-3 font-semibold">{transfer.productName}</td><td className="px-4 py-3 text-slate-600">{transfer.sourceBranchName} → {transfer.destinationBranchName}</td><td className="px-4 py-3 font-bold">{transfer.quantity}</td><td className="px-4 py-3 text-xs text-slate-500">{new Date(transfer.createdAt).toLocaleString('es-AR')}</td></tr>)}{transfers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Sin transferencias registradas.</td></tr>}</tbody></table></div></div>
      </div>
    </section>
  );
}

function Catalog({ products, search, setSearch, filter, setFilter, onEdit, onCreate, onToggle }: { products: SupermarketProduct[]; allProducts: SupermarketProduct[]; search: string; setSearch: (value: string) => void; filter: ProductFilter; setFilter: (value: ProductFilter) => void; onEdit: (product: SupermarketProduct) => void; onCreate: () => void; onToggle: (id: string) => void }) {
  return <section className="space-y-4" aria-label="Catalogo de supermercado"><div className="flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por producto, EAN o proveedor" className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" /></label><select value={filter} onChange={(event) => setFilter(event.target.value as ProductFilter)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="all">Todos</option><option value="active">Activos</option><option value="paused">Pausados</option><option value="low">Stock bajo</option><option value="expiring">Proximos a vencer</option></select><button onClick={onCreate} className="flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nuevo producto</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => { const margin = product.price ? ((product.price - product.cost) / product.price) * 100 : 0; return <article key={product.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex h-32 items-center justify-center bg-slate-100">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-9 w-9 text-slate-300" />}</div><div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{product.name}</h3><p className="text-xs text-slate-500">EAN {product.barcode}</p></div><button onClick={() => onEdit(product)} aria-label={`Editar ${product.name}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button></div><div className="grid grid-cols-3 gap-2"><Value label="Precio" value={money(product.price)} /><Value label="Costo" value={money(product.cost)} /><Value label="Margen" value={`${margin.toFixed(0)}%`} /></div><div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className={product.stock <= product.minStock ? 'font-bold text-amber-700' : 'font-semibold text-slate-700'}>Stock: {product.stock}</span><button onClick={() => onToggle(product.id)} className={`rounded-full px-2 py-1 font-bold ${product.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{product.active !== false ? 'Activo' : 'Pausado'}</button></div></div></article>; })}</div></section>;
}

function ProductEditor({ product, setProduct, onImage, onSave, onClose }: { product: SupermarketProduct; setProduct: (value: SupermarketProduct | null) => void; onImage: (event: ChangeEvent<HTMLInputElement>) => void; onSave: () => void; onClose: () => void }) {
  const number = (key: 'price' | 'cost' | 'stock' | 'minStock', value: string) => setProduct({ ...product, [key]: Math.max(0, Number(value)) });
  return <Modal title={product.id ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} footer={<><button onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancelar</button><button onClick={onSave} disabled={!product.name.trim() || !product.barcode.trim()} className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar producto</button></>}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><FieldLabel text="Imagen" /><div className="flex items-center gap-4"><div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-md bg-slate-100">{product.imageUrl ? <img src={product.imageUrl} alt="Vista previa" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-slate-300" />}</div><label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold"><Camera className="h-4 w-4" />Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} className="sr-only" /></label></div></label><TextField label="Nombre" value={product.name} onChange={(value) => setProduct({ ...product, name: value })} wide /><TextField label="Codigo EAN" value={product.barcode} onChange={(value) => setProduct({ ...product, barcode: value })} /><TextField label="Proveedor" value={product.supplier} onChange={(value) => setProduct({ ...product, supplier: value })} /><SelectField label="Categoria" value={product.category} onChange={(value) => setProduct({ ...product, category: value as SupermarketProduct['category'] })} options={['almacen', 'bebidas', 'lacteos', 'carniceria', 'verduleria', 'limpieza', 'panaderia']} /><SelectField label="Promocion" value={product.promo} onChange={(value) => setProduct({ ...product, promo: value as SupermarketProduct['promo'] })} options={['none', '2x1', '30off']} /><NumberField label="Precio" value={product.price} onChange={(value) => number('price', value)} /><NumberField label="Costo" value={product.cost} onChange={(value) => number('cost', value)} /><NumberField label="Stock" value={product.stock} onChange={(value) => number('stock', value)} /><NumberField label="Stock minimo" value={product.minStock} onChange={(value) => number('minStock', value)} /><TextField label="Vencimiento de referencia" value={product.expirationDate} onChange={(value) => setProduct({ ...product, expirationDate: value })} /><label className="flex items-end"><span className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 px-3 text-sm font-semibold">Venta por peso<input type="checkbox" checked={product.isWeighed} onChange={(event) => setProduct({ ...product, isWeighed: event.target.checked, unit: event.target.checked ? 'kg' : 'unit' })} className="h-4 w-4 accent-emerald-600" /></span></label></div></Modal>;
}

function PurchaseEditor({ purchase, setPurchase, products, onSave, onClose }: { purchase: Purchase; setPurchase: (value: Purchase | null) => void; products: SupermarketProduct[]; onSave: () => void; onClose: () => void }) {
  return <Modal title={purchase.id ? 'Editar orden de compra' : 'Nueva orden de compra'} onClose={onClose} footer={<><button onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancelar</button><button onClick={onSave} disabled={!purchase.supplier.trim() || purchase.quantity <= 0} className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar orden</button></>}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><FieldLabel text="Producto" /><select value={purchase.productId} onChange={(event) => { const product = products.find((item) => item.id === event.target.value); setPurchase({ ...purchase, productId: event.target.value, supplier: product?.supplier ?? purchase.supplier, unitCost: product?.cost ?? purchase.unitCost }); }} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><TextField label="Proveedor" value={purchase.supplier} onChange={(value) => setPurchase({ ...purchase, supplier: value })} /><TextField label="Fecha esperada" value={purchase.expectedDate} onChange={(value) => setPurchase({ ...purchase, expectedDate: value })} /><NumberField label="Cantidad" value={purchase.quantity} onChange={(value) => setPurchase({ ...purchase, quantity: Math.max(0, Number(value)) })} /><NumberField label="Costo unitario" value={purchase.unitCost} onChange={(value) => setPurchase({ ...purchase, unitCost: Math.max(0, Number(value)) })} /><TextField label="Codigo de lote" value={purchase.lotCode} onChange={(value) => setPurchase({ ...purchase, lotCode: value })} /><TextField label="Vencimiento del lote" value={purchase.expirationDate} onChange={(value) => setPurchase({ ...purchase, expirationDate: value })} /></div></Modal>;
}

function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: ReactNode; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div></div></div>; }
function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${warning ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-bold text-slate-900">{value}</p></div>; }
function Status({ value }: { value: PurchaseStatus }) { const style = value === 'received' ? 'bg-emerald-100 text-emerald-700' : value === 'ordered' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'; return <span className={`rounded-full px-2 py-1 text-xs font-bold ${style}`}>{value === 'received' ? 'Recibida' : value === 'ordered' ? 'Pedida' : 'Borrador'}</span>; }
function SectionHeader({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) { return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{detail}</p></div>{action}</div>; }
function FieldLabel({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function TextField({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><FieldLabel text={label} /><input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500" /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) { return <label><FieldLabel text={label} /><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500" /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label><FieldLabel text={label} /><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
