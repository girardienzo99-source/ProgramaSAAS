'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Barcode,
  Boxes,
  CalendarClock,
  Camera,
  Image as ImageIcon,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  X,
} from 'lucide-react';
import SupermarketConsole, { SUPERMARKET_PRODUCTS, type SupermarketProduct } from './SupermarketConsole';

type Area = 'pos' | 'catalog' | 'inventory' | 'purchases' | 'lots';
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [editingProduct, setEditingProduct] = useState<SupermarketProduct | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1) as Area;
      if (['pos', 'catalog', 'inventory', 'purchases', 'lots'].includes(hash)) setArea(hash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
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

  const saveProduct = () => {
    if (!editingProduct?.name.trim() || !editingProduct.barcode.trim()) return;
    const isNew = !editingProduct.id;
    const saved = {
      ...editingProduct,
      id: editingProduct.id || `s-${Date.now()}`,
      daysToExpire: daysUntil(editingProduct.expirationDate),
    };
    setProducts((current) => isNew ? [saved, ...current] : current.map((product) => product.id === saved.id ? saved : product));
    setEditingProduct(null);
    showFeedback(isNew ? 'Producto agregado al catalogo.' : 'Producto actualizado.');
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingProduct) return;
    if (file.size > 3 * 1024 * 1024) {
      showFeedback('La imagen supera el limite de 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditingProduct((current) => current ? { ...current, imageUrl: String(reader.result) } : current);
    reader.readAsDataURL(file);
  };

  const commitSale = (items: Array<{ productId: string; quantity: number }>) => {
    setProducts((current) => current.map((product) => {
      const sale = items.find((item) => item.productId === product.id);
      return sale ? { ...product, stock: Math.max(0, Number((product.stock - sale.quantity).toFixed(3))) } : product;
    }));
    setLots((current) => {
      const remaining = new Map(items.map((item) => [item.productId, item.quantity]));
      return [...current]
        .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
        .map((lot) => {
          const pending = remaining.get(lot.productId) ?? 0;
          if (pending <= 0) return lot;
          const consumed = Math.min(lot.quantity, pending);
          remaining.set(lot.productId, pending - consumed);
          return { ...lot, quantity: Number((lot.quantity - consumed).toFixed(3)) };
        });
    });
    showFeedback('Venta registrada y existencias actualizadas.');
  };

  const savePurchase = () => {
    if (!editingPurchase?.supplier.trim() || !editingPurchase.productId || editingPurchase.quantity <= 0) return;
    const isNew = !editingPurchase.id;
    const saved = { ...editingPurchase, id: editingPurchase.id || `oc-${Date.now()}` };
    setPurchases((current) => isNew ? [saved, ...current] : current.map((purchase) => purchase.id === saved.id ? saved : purchase));
    setEditingPurchase(null);
    showFeedback(isNew ? 'Orden de compra creada.' : 'Orden de compra actualizada.');
  };

  const receivePurchase = (purchase: Purchase) => {
    const product = products.find((item) => item.id === purchase.productId);
    if (!product || purchase.status === 'received') return;
    setPurchases((current) => current.map((item) => item.id === purchase.id ? { ...item, status: 'received' } : item));
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock: Number((item.stock + purchase.quantity).toFixed(3)), cost: purchase.unitCost } : item));
    setLots((current) => [{
      id: `lot-${Date.now()}`,
      productId: product.id,
      lotCode: purchase.lotCode.trim() || `${product.barcode.slice(-4)}-${Date.now().toString().slice(-5)}`,
      quantity: purchase.quantity,
      expirationDate: purchase.expirationDate || product.expirationDate,
      receivedDate: new Date().toISOString().slice(0, 10),
    }, ...current]);
    showFeedback('Mercaderia recibida: stock y lote actualizados.');
  };

  const tabs: Array<{ id: Area; label: string; icon: typeof ShoppingCart }> = [
    { id: 'pos', label: 'Caja POS', icon: ShoppingCart },
    { id: 'catalog', label: 'Catalogo y precios', icon: Barcode },
    { id: 'inventory', label: 'Stock y reposicion', icon: Boxes },
    { id: 'purchases', label: 'Compras', icon: Truck },
    { id: 'lots', label: 'Lotes y vencimientos', icon: CalendarClock },
  ];

  return (
    <div className="space-y-4" data-testid="supermarket-workspace">
      {feedback && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{feedback}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Productos activos" value={String(activeProducts.length)} detail={`${products.length} referencias`} />
        <Metric label="Stock bajo" value={String(lowStock)} detail="Requieren reposicion" warning={lowStock > 0} />
        <Metric label="Proximos a vencer" value={String(expiringLots)} detail="Lotes dentro de 7 dias" warning={expiringLots > 0} />
        <Metric label="Valor del inventario" value={money(inventoryValue)} detail={`${pendingPurchases} compras pendientes`} />
      </div>

      <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Gestion de supermercado"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={area === id} onClick={() => navigate(id)} className={`flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${area === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>

      {area === 'pos' && <SupermarketConsole products={activeProducts} onSaleCommitted={commitSale} />}

      {area === 'catalog' && <Catalog products={visibleProducts} allProducts={products} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onEdit={(product) => setEditingProduct({ ...product })} onCreate={() => setEditingProduct({ ...EMPTY_PRODUCT })} onToggle={(id) => setProducts((current) => current.map((product) => product.id === id ? { ...product, active: product.active === false } : product))} />}

      {area === 'inventory' && (
        <section className="space-y-4" aria-label="Stock y reposicion">
          <SectionHeader title="Existencias por producto" detail="Stock actual, minimo, costo y sugerencia de compra." action={<button onClick={() => navigate('purchases')} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Truck className="h-4 w-4" />Generar compra</button>} />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Minimo</th><th className="px-4 py-3">Costo</th><th className="px-4 py-3">Sugerido</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => { const low = product.stock <= product.minStock; const suggested = Math.max(0, product.minStock * 2 - product.stock); return <tr key={product.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-bold text-slate-900">{product.name}</p><p className="text-xs text-slate-500">EAN {product.barcode}</p></td><td className="px-4 py-3 text-slate-600">{product.supplier}</td><td className={`px-4 py-3 font-bold ${low ? 'text-amber-700' : 'text-slate-900'}`}>{low && <AlertTriangle className="mr-1 inline h-4 w-4" />}{product.stock} {product.unit === 'kg' ? 'kg' : 'u.'}</td><td className="px-4 py-3">{product.minStock}</td><td className="px-4 py-3">{money(product.cost)}</td><td className="px-4 py-3 font-semibold text-emerald-700">{suggested || '-'}</td><td className="px-4 py-3 text-right"><button onClick={() => setEditingProduct({ ...product })} aria-label={`Editar stock de ${product.name}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div>
        </section>
      )}

      {area === 'purchases' && (
        <section className="space-y-4" aria-label="Ordenes de compra">
          <SectionHeader title="Compras a proveedores" detail="Ordenes pendientes y recepcion directa al inventario." action={<button onClick={() => setEditingPurchase({ id: '', supplier: '', productId: products[0]?.id ?? '', quantity: 1, unitCost: products[0]?.cost ?? 0, expectedDate: '', status: 'draft', lotCode: '', expirationDate: '' })} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nueva compra</button>} />
          <div className="grid gap-3 lg:grid-cols-2">{purchases.map((purchase) => { const product = products.find((item) => item.id === purchase.productId); return <article key={purchase.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">{purchase.id}</p><h3 className="font-bold text-slate-900">{product?.name}</h3><p className="text-sm text-slate-500">{purchase.supplier}</p></div><Status value={purchase.status} /></div><div className="mt-4 grid grid-cols-3 gap-3"><Value label="Cantidad" value={String(purchase.quantity)} /><Value label="Costo unit." value={money(purchase.unitCost)} /><Value label="Total" value={money(purchase.quantity * purchase.unitCost)} /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Entrega: {purchase.expectedDate || 'Sin fecha'}</p><div className="flex gap-2">{purchase.status !== 'received' && <button onClick={() => setEditingPurchase({ ...purchase })} aria-label={`Editar ${purchase.id}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button>}{purchase.status !== 'received' && <button onClick={() => receivePurchase(purchase)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><PackageCheck className="h-4 w-4" />Recibir</button>}</div></div></article>; })}</div>
        </section>
      )}

      {area === 'lots' && (
        <section className="space-y-4" aria-label="Lotes y vencimientos">
          <SectionHeader title="Trazabilidad de lotes" detail="Prioridad FEFO para reducir merma por vencimiento." />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Lote</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Existencia</th><th className="px-4 py-3">Ingreso</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{[...lots].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)).map((lot) => { const product = products.find((item) => item.id === lot.productId); const days = daysUntil(lot.expirationDate); return <tr key={lot.id}><td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{lot.lotCode}</td><td className="px-4 py-3 font-bold text-slate-900">{product?.name}</td><td className="px-4 py-3">{lot.quantity} {product?.unit === 'kg' ? 'kg' : 'u.'}</td><td className="px-4 py-3 text-slate-600">{lot.receivedDate}</td><td className="px-4 py-3 font-semibold">{lot.expirationDate}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${days <= 2 ? 'bg-rose-100 text-rose-700' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{days < 0 ? 'Vencido' : days === 0 ? 'Vence hoy' : `${days} dias`}</span></td></tr>; })}</tbody></table></div>
        </section>
      )}

      {editingProduct && <ProductEditor product={editingProduct} setProduct={setEditingProduct} onImage={uploadImage} onSave={saveProduct} onClose={() => setEditingProduct(null)} />}
      {editingPurchase && <PurchaseEditor purchase={editingPurchase} setPurchase={setEditingPurchase} products={products} onSave={savePurchase} onClose={() => setEditingPurchase(null)} />}
    </div>
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
