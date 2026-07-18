'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Camera,
  CircleDollarSign,
  ClipboardList,
  Image as ImageIcon,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import HardwareConsole, { HARDWARE_PRODUCTS, type HardwareProduct } from './HardwareConsole';

type Area = 'operation' | 'catalog' | 'stock' | 'purchases' | 'suppliers';
type Location = 'deposito' | 'mostrador';
type PurchaseStatus = 'draft' | 'ordered' | 'received';

interface PurchaseOrder {
  id: string;
  productId: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  expectedDate: string;
  status: PurchaseStatus;
}

interface SupplierAccount {
  id: string;
  name: string;
  phone: string;
  leadDays: number;
  balance: number;
  creditLimit: number;
}

interface TransferDraft {
  productId: string;
  from: Location;
  quantity: number;
}

const PRODUCTS: HardwareProduct[] = HARDWARE_PRODUCTS.map((product, index) => ({
  ...product,
  cost: [4400, 12500, 3150, 24500, 69000][index],
  sku: `FER-${String(index + 1).padStart(3, '0')}`,
  barcode: `77988000000${index + 1}`,
  minStock: [80, 8, 250, 25, 15][index],
  supplier: ['Loma Negra', 'Aridos del Sur', 'Aceros Federal', 'Electro Cables SA', 'Pinturas del Centro'][index],
  imageUrl: null,
  active: true,
}));

const EMPTY_PRODUCT: HardwareProduct = { id: '', name: '', category: 'buloneria', price: 0, unitWeightKg: 0, stockDeposito: 0, stockMostrador: 0, stockEnReparto: 0, unit: 'Unidad', cost: 0, sku: '', barcode: '', minStock: 0, supplier: '', imageUrl: null, active: true };
const INITIAL_PURCHASES: PurchaseOrder[] = [
  { id: 'OC-2081', productId: 'p1', supplier: 'Loma Negra', quantity: 160, unitCost: 4300, expectedDate: '2026-07-15', status: 'ordered' },
  { id: 'OC-2082', productId: 'p4', supplier: 'Electro Cables SA', quantity: 30, unitCost: 23800, expectedDate: '2026-07-18', status: 'draft' },
];
const INITIAL_SUPPLIERS: SupplierAccount[] = [
  { id: 'pr-1', name: 'Loma Negra', phone: '11-4300-2100', leadDays: 3, balance: 688000, creditLimit: 2500000 },
  { id: 'pr-2', name: 'Aridos del Sur', phone: '11-4201-8841', leadDays: 1, balance: 210000, creditLimit: 900000 },
  { id: 'pr-3', name: 'Aceros Federal', phone: '11-4750-9930', leadDays: 5, balance: 0, creditLimit: 1800000 },
  { id: 'pr-4', name: 'Electro Cables SA', phone: '11-4662-1500', leadDays: 4, balance: 714000, creditLimit: 1600000 },
  { id: 'pr-5', name: 'Pinturas del Centro', phone: '11-4488-7171', leadDays: 2, balance: 345000, creditLimit: 1200000 },
];

const money = (value: number) => `$${Math.round(value).toLocaleString('es-AR')}`;
const totalStock = (product: HardwareProduct) => product.stockDeposito + product.stockMostrador + product.stockEnReparto;

export default function HardwareWorkspaceConsole() {
  const [area, setArea] = useState<Area>('operation');
  const [products, setProducts] = useState<HardwareProduct[]>(PRODUCTS);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(INITIAL_PURCHASES);
  const [suppliers, setSuppliers] = useState<SupplierAccount[]>(INITIAL_SUPPLIERS);
  const [editingProduct, setEditingProduct] = useState<HardwareProduct | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
  const [transfer, setTransfer] = useState<TransferDraft>({ productId: 'p1', from: 'deposito', quantity: 1 });
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1) as Area;
      if (['operation', 'catalog', 'stock', 'purchases', 'suppliers'].includes(hash)) setArea(hash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3000);
  };
  const navigate = (next: Area) => {
    setArea(next);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
  };

  const activeProducts = useMemo(() => products.filter((product) => product.active !== false && totalStock(product) > 0), [products]);
  const visibleProducts = useMemo(() => products.filter((product) => `${product.name} ${product.sku} ${product.barcode} ${product.supplier}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const lowStock = products.filter((product) => totalStock(product) <= (product.minStock ?? 0)).length;
  const inventoryValue = products.reduce((sum, product) => sum + totalStock(product) * (product.cost ?? 0), 0);
  const supplierDebt = suppliers.reduce((sum, supplier) => sum + supplier.balance, 0);

  const reserveDispatch = (items: Array<{ productId: string; quantity: number }>) => {
    setProducts((current) => current.map((product) => {
      const item = items.find((candidate) => candidate.productId === product.id);
      if (!item) return product;
      const fromCounter = Math.min(product.stockMostrador, item.quantity);
      const remainder = item.quantity - fromCounter;
      return { ...product, stockMostrador: product.stockMostrador - fromCounter, stockDeposito: Math.max(0, product.stockDeposito - remainder), stockEnReparto: product.stockEnReparto + item.quantity };
    }));
    notify('Presupuesto convertido en despacho y stock reservado.');
  };

  const saveProduct = () => {
    if (!editingProduct?.name.trim()) return;
    const isNew = !editingProduct.id;
    const saved = { ...editingProduct, id: editingProduct.id || `p-${Date.now()}`, sku: editingProduct.sku || `FER-${products.length + 1}` };
    setProducts((current) => isNew ? [saved, ...current] : current.map((product) => product.id === saved.id ? saved : product));
    setEditingProduct(null);
    notify(isNew ? 'Material agregado al catalogo.' : 'Ficha tecnica actualizada.');
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingProduct) return;
    if (file.size > 3 * 1024 * 1024) return notify('La imagen supera el limite de 3 MB.');
    const reader = new FileReader();
    reader.onload = () => setEditingProduct((current) => current ? { ...current, imageUrl: String(reader.result) } : current);
    reader.readAsDataURL(file);
  };

  const moveStock = () => {
    if (transfer.quantity <= 0) return;
    let moved = false;
    setProducts((current) => current.map((product) => {
      if (product.id !== transfer.productId) return product;
      const source = transfer.from === 'deposito' ? product.stockDeposito : product.stockMostrador;
      if (source < transfer.quantity) return product;
      moved = true;
      return transfer.from === 'deposito'
        ? { ...product, stockDeposito: source - transfer.quantity, stockMostrador: product.stockMostrador + transfer.quantity }
        : { ...product, stockMostrador: source - transfer.quantity, stockDeposito: product.stockDeposito + transfer.quantity };
    }));
    notify(moved ? 'Transferencia interna registrada.' : 'Stock insuficiente en la ubicacion de origen.');
  };

  const savePurchase = () => {
    if (!editingPurchase?.productId || editingPurchase.quantity <= 0) return;
    const saved = { ...editingPurchase, id: editingPurchase.id || `OC-${Date.now().toString().slice(-5)}` };
    setPurchases((current) => editingPurchase.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setEditingPurchase(null);
    notify('Orden de compra guardada.');
  };

  const receivePurchase = (purchase: PurchaseOrder) => {
    if (purchase.status === 'received') return;
    setPurchases((current) => current.map((item) => item.id === purchase.id ? { ...item, status: 'received' } : item));
    setProducts((current) => current.map((product) => product.id === purchase.productId ? { ...product, stockDeposito: product.stockDeposito + purchase.quantity, cost: purchase.unitCost } : product));
    setSuppliers((current) => current.map((supplier) => supplier.name === purchase.supplier ? { ...supplier, balance: supplier.balance + purchase.quantity * purchase.unitCost } : supplier));
    notify('Compra recibida: deposito y cuenta del proveedor actualizados.');
  };

  const tabs: Array<{ id: Area; label: string; icon: typeof Wrench }> = [
    { id: 'operation', label: 'Cotizador y repartos', icon: Wrench },
    { id: 'catalog', label: 'Catalogo tecnico', icon: ClipboardList },
    { id: 'stock', label: 'Stock y transferencias', icon: Boxes },
    { id: 'purchases', label: 'Compras', icon: Truck },
    { id: 'suppliers', label: 'Proveedores y cuentas', icon: Users },
  ];

  return <div className="space-y-4" data-testid="hardware-workspace">
    {feedback && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{feedback}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Materiales activos" value={String(activeProducts.length)} detail={`${products.length} fichas tecnicas`} /><Metric label="Stock critico" value={String(lowStock)} detail="Debajo del minimo" warning={lowStock > 0} /><Metric label="Inventario a costo" value={money(inventoryValue)} detail="Deposito, mostrador y reparto" /><Metric label="Deuda proveedores" value={money(supplierDebt)} detail={`${purchases.filter((item) => item.status !== 'received').length} compras pendientes`} /></div>
    <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Gestion de ferreteria"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={area === id} onClick={() => navigate(id)} className={`flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${area === id ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>

    {area === 'operation' && <HardwareConsole products={activeProducts} onDispatchCreated={reserveDispatch} />}
    {area === 'catalog' && <Catalog products={visibleProducts} search={search} setSearch={setSearch} onCreate={() => setEditingProduct({ ...EMPTY_PRODUCT })} onEdit={(product) => setEditingProduct({ ...product })} onToggle={(id) => setProducts((current) => current.map((product) => product.id === id ? { ...product, active: product.active === false } : product))} />}
    {area === 'stock' && <StockPanel products={products} transfer={transfer} setTransfer={setTransfer} onMove={moveStock} onEdit={(product) => setEditingProduct({ ...product })} />}
    {area === 'purchases' && <PurchasesPanel purchases={purchases} products={products} onCreate={() => { const product = products[0]; setEditingPurchase({ id: '', productId: product?.id ?? '', supplier: product?.supplier ?? '', quantity: 1, unitCost: product?.cost ?? 0, expectedDate: '', status: 'draft' }); }} onEdit={(purchase) => setEditingPurchase({ ...purchase })} onReceive={receivePurchase} />}
    {area === 'suppliers' && <SuppliersPanel suppliers={suppliers} setSuppliers={setSuppliers} />}
    {editingProduct && <ProductEditor product={editingProduct} setProduct={setEditingProduct} onImage={uploadImage} onSave={saveProduct} onClose={() => setEditingProduct(null)} />}
    {editingPurchase && <PurchaseEditor purchase={editingPurchase} setPurchase={setEditingPurchase} products={products} onSave={savePurchase} onClose={() => setEditingPurchase(null)} />}
  </div>;
}

function Catalog({ products, search, setSearch, onCreate, onEdit, onToggle }: { products: HardwareProduct[]; search: string; setSearch: (value: string) => void; onCreate: () => void; onEdit: (product: HardwareProduct) => void; onToggle: (id: string) => void }) {
  return <section className="space-y-4" aria-label="Catalogo tecnico"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar material, SKU, EAN o proveedor" className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" /></label><button onClick={onCreate} className="flex h-9 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nuevo material</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex h-28 items-center justify-center bg-slate-100">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-9 w-9 text-slate-300" />}</div><div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{product.name}</h3><p className="text-xs text-slate-500">{product.sku} · {product.unit}</p></div><button onClick={() => onEdit(product)} aria-label={`Editar ${product.name}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button></div><div className="grid grid-cols-3 gap-2"><Value label="Precio" value={money(product.price)} /><Value label="Costo" value={money(product.cost ?? 0)} /><Value label="Peso" value={`${product.unitWeightKg} kg`} /></div><div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="font-semibold">Stock: {totalStock(product)}</span><button onClick={() => onToggle(product.id)} className={`rounded-full px-2 py-1 font-bold ${product.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{product.active !== false ? 'Activo' : 'Pausado'}</button></div></div></article>)}</div></section>;
}

function StockPanel({ products, transfer, setTransfer, onMove, onEdit }: { products: HardwareProduct[]; transfer: TransferDraft; setTransfer: (value: TransferDraft) => void; onMove: () => void; onEdit: (product: HardwareProduct) => void }) {
  return <section className="space-y-4" aria-label="Stock por ubicacion"><div className="rounded-lg border border-orange-200 bg-orange-50 p-4"><div className="mb-3 flex items-center gap-2 font-bold text-orange-900"><ArrowRightLeft className="h-4 w-4" />Transferencia interna</div><div className="grid gap-3 sm:grid-cols-4"><select value={transfer.productId} onChange={(event) => setTransfer({ ...transfer, productId: event.target.value })} className="h-9 rounded-md border border-orange-200 bg-white px-3 text-sm">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><select value={transfer.from} onChange={(event) => setTransfer({ ...transfer, from: event.target.value as Location })} className="h-9 rounded-md border border-orange-200 bg-white px-3 text-sm"><option value="deposito">Deposito a mostrador</option><option value="mostrador">Mostrador a deposito</option></select><input aria-label="Cantidad a transferir" type="number" min="1" value={transfer.quantity} onChange={(event) => setTransfer({ ...transfer, quantity: Number(event.target.value) })} className="h-9 rounded-md border border-orange-200 px-3 text-sm" /><button onClick={onMove} className="h-9 rounded-md bg-orange-600 px-4 text-sm font-bold text-white">Transferir</button></div></div><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Material</th><th className="px-4 py-3">Deposito</th><th className="px-4 py-3">Mostrador</th><th className="px-4 py-3">En reparto</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Minimo</th><th></th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => { const low = totalStock(product) <= (product.minStock ?? 0); return <tr key={product.id}><td className="px-4 py-3 font-bold text-slate-900">{product.name}</td><td className="px-4 py-3">{product.stockDeposito}</td><td className="px-4 py-3">{product.stockMostrador}</td><td className="px-4 py-3">{product.stockEnReparto}</td><td className={`px-4 py-3 font-bold ${low ? 'text-amber-700' : ''}`}>{low && <AlertTriangle className="mr-1 inline h-4 w-4" />}{totalStock(product)}</td><td className="px-4 py-3">{product.minStock}</td><td className="px-4 py-3 text-right"><button onClick={() => onEdit(product)} aria-label={`Editar stock de ${product.name}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div></section>;
}

function PurchasesPanel({ purchases, products, onCreate, onEdit, onReceive }: { purchases: PurchaseOrder[]; products: HardwareProduct[]; onCreate: () => void; onEdit: (purchase: PurchaseOrder) => void; onReceive: (purchase: PurchaseOrder) => void }) {
  return <section className="space-y-4" aria-label="Compras de materiales"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Ordenes de compra</h2><p className="text-sm text-slate-500">Recepcion directa a deposito y cuenta corriente.</p></div><button onClick={onCreate} className="flex h-9 items-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nueva compra</button></div><div className="grid gap-3 lg:grid-cols-2">{purchases.map((purchase) => { const product = products.find((item) => item.id === purchase.productId); return <article key={purchase.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold text-slate-400">{purchase.id}</p><h3 className="font-bold text-slate-900">{product?.name}</h3><p className="text-sm text-slate-500">{purchase.supplier}</p></div><Badge status={purchase.status} /></div><div className="mt-4 grid grid-cols-3 gap-3"><Value label="Cantidad" value={String(purchase.quantity)} /><Value label="Costo" value={money(purchase.unitCost)} /><Value label="Total" value={money(purchase.quantity * purchase.unitCost)} /></div><div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">{purchase.status !== 'received' && <button onClick={() => onEdit(purchase)} aria-label={`Editar ${purchase.id}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button>}{purchase.status !== 'received' && <button onClick={() => onReceive(purchase)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><PackageCheck className="h-4 w-4" />Recibir</button>}</div></article>; })}</div></section>;
}

function SuppliersPanel({ suppliers, setSuppliers }: { suppliers: SupplierAccount[]; setSuppliers: (value: SupplierAccount[]) => void }) {
  const pay = (id: string) => setSuppliers(suppliers.map((supplier) => supplier.id === id ? { ...supplier, balance: Math.max(0, supplier.balance - 100000) } : supplier));
  return <section className="space-y-4" aria-label="Cuentas de proveedores"><div><h2 className="font-bold text-slate-900">Proveedores y cuentas corrientes</h2><p className="text-sm text-slate-500">Saldo, limite de credito y plazo habitual.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => { const usage = supplier.creditLimit ? supplier.balance / supplier.creditLimit * 100 : 0; return <article key={supplier.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-slate-900">{supplier.name}</h3><p className="text-xs text-slate-500">{supplier.phone} · Entrega {supplier.leadDays} dias</p></div><CircleDollarSign className="h-5 w-5 text-orange-600" /></div><div className="mt-4 grid grid-cols-2 gap-3"><Value label="Saldo" value={money(supplier.balance)} /><Value label="Credito" value={money(supplier.creditLimit)} /></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${usage > 80 ? 'bg-rose-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, usage)}%` }} /></div><button onClick={() => pay(supplier.id)} disabled={!supplier.balance} className="mt-4 h-9 w-full rounded-md border border-slate-300 text-sm font-bold text-slate-700 disabled:opacity-40">Registrar pago de $100.000</button></article>; })}</div></section>;
}

function ProductEditor({ product, setProduct, onImage, onSave, onClose }: { product: HardwareProduct; setProduct: (value: HardwareProduct | null) => void; onImage: (event: ChangeEvent<HTMLInputElement>) => void; onSave: () => void; onClose: () => void }) {
  const number = (key: 'price' | 'cost' | 'unitWeightKg' | 'stockDeposito' | 'stockMostrador' | 'minStock', value: string) => setProduct({ ...product, [key]: Math.max(0, Number(value)) });
  return <Modal title={product.id ? 'Editar material' : 'Nuevo material'} onClose={onClose} footer={<><ButtonCancel onClick={onClose} /><button onClick={onSave} disabled={!product.name.trim()} className="h-9 rounded-md bg-orange-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar material</button></>}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><Label text="Imagen del producto" /><div className="flex items-center gap-4"><div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-md bg-slate-100">{product.imageUrl ? <img src={product.imageUrl} alt="Vista previa" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-slate-300" />}</div><label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} className="sr-only" /></label></div></label><Text label="Nombre" value={product.name} set={(value) => setProduct({ ...product, name: value })} wide /><Text label="SKU" value={product.sku ?? ''} set={(value) => setProduct({ ...product, sku: value })} /><Text label="EAN" value={product.barcode ?? ''} set={(value) => setProduct({ ...product, barcode: value })} /><Text label="Unidad de venta" value={product.unit} set={(value) => setProduct({ ...product, unit: value })} /><Text label="Proveedor" value={product.supplier ?? ''} set={(value) => setProduct({ ...product, supplier: value })} /><Num label="Precio" value={product.price} set={(value) => number('price', value)} /><Num label="Costo" value={product.cost ?? 0} set={(value) => number('cost', value)} /><Num label="Peso unitario kg" value={product.unitWeightKg} set={(value) => number('unitWeightKg', value)} /><Num label="Stock deposito" value={product.stockDeposito} set={(value) => number('stockDeposito', value)} /><Num label="Stock mostrador" value={product.stockMostrador} set={(value) => number('stockMostrador', value)} /><Num label="Stock minimo" value={product.minStock ?? 0} set={(value) => number('minStock', value)} /></div></Modal>;
}

function PurchaseEditor({ purchase, setPurchase, products, onSave, onClose }: { purchase: PurchaseOrder; setPurchase: (value: PurchaseOrder | null) => void; products: HardwareProduct[]; onSave: () => void; onClose: () => void }) { return <Modal title={purchase.id ? 'Editar compra' : 'Nueva compra'} onClose={onClose} footer={<><ButtonCancel onClick={onClose} /><button onClick={onSave} className="h-9 rounded-md bg-orange-600 px-4 text-sm font-bold text-white">Guardar compra</button></>}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><Label text="Material" /><select value={purchase.productId} onChange={(event) => { const product = products.find((item) => item.id === event.target.value); setPurchase({ ...purchase, productId: event.target.value, supplier: product?.supplier ?? '', unitCost: product?.cost ?? 0 }); }} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><Text label="Proveedor" value={purchase.supplier} set={(value) => setPurchase({ ...purchase, supplier: value })} /><Text label="Fecha esperada" value={purchase.expectedDate} set={(value) => setPurchase({ ...purchase, expectedDate: value })} /><Num label="Cantidad" value={purchase.quantity} set={(value) => setPurchase({ ...purchase, quantity: Math.max(0, Number(value)) })} /><Num label="Costo unitario" value={purchase.unitCost} set={(value) => setPurchase({ ...purchase, unitCost: Math.max(0, Number(value)) })} /></div></Modal>; }

function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: ReactNode; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div></div></div>; }
function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${warning ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-bold text-slate-900">{value}</p></div>; }
function Badge({ status }: { status: PurchaseStatus }) { return <span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${status === 'received' ? 'bg-emerald-100 text-emerald-700' : status === 'ordered' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{status === 'received' ? 'Recibida' : status === 'ordered' ? 'Pedida' : 'Borrador'}</span>; }
function Label({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function Text({ label, value, set, wide = false }: { label: string; value: string; set: (value: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><Label text={label} /><input value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function Num({ label, value, set }: { label: string; value: number; set: (value: string) => void }) { return <label><Label text={label} /><input type="number" min="0" step="0.01" value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function ButtonCancel({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancelar</button>; }
