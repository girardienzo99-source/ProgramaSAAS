'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  Car,
  ClipboardCheck,
  Image as ImageIcon,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import AutomotiveConsole, { SPARE_PARTS, type SparePart } from './AutomotiveConsole';

type Area = 'workshop' | 'parts' | 'purchases' | 'inspections' | 'maintenance';
type PurchaseStatus = 'draft' | 'ordered' | 'received';
type InspectionStatus = 'pending' | 'completed' | 'approved';

interface PartPurchase {
  id: string;
  partId: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  expectedDate: string;
  status: PurchaseStatus;
}

interface VehicleInspection {
  id: string;
  plate: string;
  vehicle: string;
  client: string;
  date: string;
  km: number;
  fuelLevel: string;
  damages: string;
  checklist: string[];
  photos: string[];
  status: InspectionStatus;
}

interface MaintenanceReminder {
  id: string;
  plate: string;
  client: string;
  vehicle: string;
  currentKm: number;
  dueKm: number;
  dueDate: string;
  service: string;
  notified: boolean;
}

const PARTS: SparePart[] = SPARE_PARTS.map((part, index) => ({
  ...part,
  cost: [12800, 3200, 20500, 2100][index],
  stock: [12, 28, 16, 0][index],
  minStock: [6, 10, 8, 12][index],
  sku: `AUT-${String(index + 1).padStart(3, '0')}`,
  barcode: `77977000000${index + 1}`,
  supplier: ['Frenos del Plata', 'Filtros Federal', 'Lubricentro Mayorista', 'Encendido NGK'][index],
  compatibility: ['Toyota Corolla / Etios', 'Universal Fram PH', 'Nafta 10W40', 'Volkswagen / Chevrolet'][index],
  imageUrl: null,
  active: true,
}));
const EMPTY_PART: SparePart = { id: '', name: '', price: 0, stockStatus: 'available', cost: 0, stock: 0, minStock: 0, sku: '', barcode: '', supplier: '', compatibility: '', imageUrl: null, active: true };
const INITIAL_PURCHASES: PartPurchase[] = [
  { id: 'OC-RP-441', partId: 'p4', supplier: 'Encendido NGK', quantity: 24, unitCost: 1950, expectedDate: '2026-07-15', status: 'ordered' },
  { id: 'OC-RP-442', partId: 'p1', supplier: 'Frenos del Plata', quantity: 10, unitCost: 12400, expectedDate: '2026-07-18', status: 'draft' },
];
const INITIAL_INSPECTIONS: VehicleInspection[] = [
  { id: 'IN-1001', plate: 'AF105XG', vehicle: 'Toyota Corolla XEI 2021', client: 'Eduardo Galeano', date: '2026-07-12', km: 45000, fuelLevel: '1/2', damages: 'Rayon y golpe leve en guardabarros delantero.', checklist: ['Luces verificadas', 'Auxilio presente', 'Documentacion recibida'], photos: ['frente-corolla.jpg', 'guardabarros.jpg'], status: 'approved' },
  { id: 'IN-1002', plate: 'AA998ZZ', vehicle: 'Volkswagen Gol Trend 2018', client: 'Paula Albarracin', date: '2026-07-12', km: 72000, fuelLevel: '1/4', damages: 'Cubiertas delanteras desgastadas.', checklist: ['Luces verificadas', 'Herramientas presentes'], photos: ['tablero-gol.jpg'], status: 'completed' },
];
const INITIAL_MAINTENANCE: MaintenanceReminder[] = [
  { id: 'mp-1', plate: 'AF105XG', client: 'Eduardo Galeano', vehicle: 'Toyota Corolla', currentKm: 45000, dueKm: 55000, dueDate: '2027-01-12', service: 'Service y control de frenos', notified: false },
  { id: 'mp-2', plate: 'AA998ZZ', client: 'Paula Albarracin', vehicle: 'Volkswagen Gol Trend', currentKm: 72000, dueKm: 80000, dueDate: '2026-11-15', service: 'Aceite, filtros y tren delantero', notified: true },
  { id: 'mp-3', plate: 'AD321RT', client: 'Martin Lopez', vehicle: 'Ford Ranger', currentKm: 98500, dueKm: 100000, dueDate: '2026-08-02', service: 'Distribucion y fluidos', notified: false },
];

const money = (value: number) => `$${Math.round(value).toLocaleString('es-AR')}`;

export default function AutomotiveWorkspaceConsole() {
  const [area, setArea] = useState<Area>('workshop');
  const [parts, setParts] = useState<SparePart[]>(PARTS);
  const [purchases, setPurchases] = useState<PartPurchase[]>(INITIAL_PURCHASES);
  const [inspections, setInspections] = useState<VehicleInspection[]>(INITIAL_INSPECTIONS);
  const [maintenance, setMaintenance] = useState<MaintenanceReminder[]>(INITIAL_MAINTENANCE);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PartPurchase | null>(null);
  const [editingInspection, setEditingInspection] = useState<VehicleInspection | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1) as Area;
      if (['workshop', 'parts', 'purchases', 'inspections', 'maintenance'].includes(hash)) setArea(hash);
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

  const usableParts = useMemo(() => parts.filter((part) => part.active !== false && (part.stock ?? 0) > 0), [parts]);
  const visibleParts = useMemo(() => parts.filter((part) => `${part.name} ${part.sku} ${part.barcode} ${part.compatibility}`.toLowerCase().includes(search.toLowerCase())), [parts, search]);
  const lowStock = parts.filter((part) => (part.stock ?? 0) <= (part.minStock ?? 0)).length;
  const partsValue = parts.reduce((sum, part) => sum + (part.stock ?? 0) * (part.cost ?? 0), 0);
  const upcomingMaintenance = maintenance.filter((item) => !item.notified).length;

  const usePart = (partId: string, quantity: number) => {
    setParts((current) => current.map((part) => part.id === partId ? { ...part, stock: Math.max(0, (part.stock ?? 0) - quantity), stockStatus: (part.stock ?? 0) - quantity > 0 ? 'available' : 'out_of_stock' } : part));
    notify('Repuesto reservado para la orden y stock actualizado.');
  };

  const savePart = () => {
    if (!editingPart?.name.trim()) return;
    const isNew = !editingPart.id;
    const saved: SparePart = { ...editingPart, id: editingPart.id || `p-${Date.now()}`, sku: editingPart.sku || `AUT-${parts.length + 1}`, stockStatus: (editingPart.stock ?? 0) > 0 ? 'available' : 'out_of_stock' };
    setParts((current) => isNew ? [saved, ...current] : current.map((part) => part.id === saved.id ? saved : part));
    setEditingPart(null);
    notify(isNew ? 'Repuesto agregado al catalogo.' : 'Repuesto actualizado.');
  };

  const imageToPart = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingPart) return;
    if (file.size > 3 * 1024 * 1024) return notify('La imagen supera el limite de 3 MB.');
    const reader = new FileReader();
    reader.onload = () => setEditingPart((current) => current ? { ...current, imageUrl: String(reader.result) } : current);
    reader.readAsDataURL(file);
  };

  const savePurchase = () => {
    if (!editingPurchase?.partId || editingPurchase.quantity <= 0) return;
    const saved = { ...editingPurchase, id: editingPurchase.id || `OC-RP-${Date.now().toString().slice(-4)}` };
    setPurchases((current) => editingPurchase.id ? current.map((purchase) => purchase.id === saved.id ? saved : purchase) : [saved, ...current]);
    setEditingPurchase(null);
    notify('Orden de compra guardada.');
  };
  const receivePurchase = (purchase: PartPurchase) => {
    if (purchase.status === 'received') return;
    setPurchases((current) => current.map((item) => item.id === purchase.id ? { ...item, status: 'received' } : item));
    setParts((current) => current.map((part) => part.id === purchase.partId ? { ...part, stock: (part.stock ?? 0) + purchase.quantity, cost: purchase.unitCost, stockStatus: 'available' } : part));
    notify('Compra recibida y stock de repuestos actualizado.');
  };

  const saveInspection = () => {
    if (!editingInspection?.plate.trim()) return;
    const saved = { ...editingInspection, id: editingInspection.id || `IN-${Date.now().toString().slice(-4)}` };
    setInspections((current) => editingInspection.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setEditingInspection(null);
    notify('Inspeccion de ingreso guardada.');
  };
  const addInspectionPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!editingInspection || !files.length) return;
    setEditingInspection({ ...editingInspection, photos: [...editingInspection.photos, ...files.map((file) => file.name)] });
  };

  const tabs: Array<{ id: Area; label: string; icon: typeof Wrench }> = [
    { id: 'workshop', label: 'Ordenes de taller', icon: Wrench },
    { id: 'parts', label: 'Repuestos y stock', icon: ShoppingCart },
    { id: 'purchases', label: 'Compras', icon: Truck },
    { id: 'inspections', label: 'Inspecciones', icon: ClipboardCheck },
    { id: 'maintenance', label: 'Mantenimiento', icon: CalendarClock },
  ];

  return <div className="space-y-4" data-testid="automotive-workspace">
    {feedback && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{feedback}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Repuestos activos" value={String(usableParts.length)} detail={`${parts.length} referencias`} /><Metric label="Stock critico" value={String(lowStock)} detail="Requieren compra" warning={lowStock > 0} /><Metric label="Inventario a costo" value={money(partsValue)} detail="Repuestos disponibles" /><Metric label="Mantenimientos" value={String(upcomingMaintenance)} detail="Clientes por notificar" warning={upcomingMaintenance > 0} /></div>
    <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Gestion de taller"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={area === id} onClick={() => navigate(id)} className={`flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${area === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>
    {area === 'workshop' && <AutomotiveConsole parts={usableParts} onPartUsed={usePart} />}
    {area === 'parts' && <PartsCatalog parts={visibleParts} search={search} setSearch={setSearch} onCreate={() => setEditingPart({ ...EMPTY_PART })} onEdit={(part) => setEditingPart({ ...part })} onToggle={(id) => setParts((current) => current.map((part) => part.id === id ? { ...part, active: part.active === false } : part))} />}
    {area === 'purchases' && <Purchases purchases={purchases} parts={parts} onCreate={() => { const part = parts[0]; setEditingPurchase({ id: '', partId: part?.id ?? '', supplier: part?.supplier ?? '', quantity: 1, unitCost: part?.cost ?? 0, expectedDate: '', status: 'draft' }); }} onEdit={(purchase) => setEditingPurchase({ ...purchase })} onReceive={receivePurchase} />}
    {area === 'inspections' && <Inspections inspections={inspections} onCreate={() => setEditingInspection({ id: '', plate: '', vehicle: '', client: '', date: new Date().toISOString().slice(0, 10), km: 0, fuelLevel: '1/2', damages: '', checklist: [], photos: [], status: 'pending' })} onApprove={(id) => setInspections((current) => current.map((item) => item.id === id ? { ...item, status: 'approved' } : item))} />}
    {area === 'maintenance' && <Maintenance items={maintenance} onNotify={(id) => { setMaintenance((current) => current.map((item) => item.id === id ? { ...item, notified: true } : item)); notify('Recordatorio de mantenimiento registrado.'); }} />}
    {editingPart && <PartEditor part={editingPart} setPart={setEditingPart} onImage={imageToPart} onSave={savePart} onClose={() => setEditingPart(null)} />}
    {editingPurchase && <PurchaseEditor purchase={editingPurchase} setPurchase={setEditingPurchase} parts={parts} onSave={savePurchase} onClose={() => setEditingPurchase(null)} />}
    {editingInspection && <InspectionEditor inspection={editingInspection} setInspection={setEditingInspection} onPhotos={addInspectionPhotos} onSave={saveInspection} onClose={() => setEditingInspection(null)} />}
  </div>;
}

function PartsCatalog({ parts, search, setSearch, onCreate, onEdit, onToggle }: { parts: SparePart[]; search: string; setSearch: (value: string) => void; onCreate: () => void; onEdit: (part: SparePart) => void; onToggle: (id: string) => void }) { return <section className="space-y-4" aria-label="Catalogo de repuestos"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar repuesto, SKU, EAN o compatibilidad" className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" /></label><button onClick={onCreate} className="flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nuevo repuesto</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{parts.map((part) => <article key={part.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex h-28 items-center justify-center bg-slate-100">{part.imageUrl ? <img src={part.imageUrl} alt={part.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-9 w-9 text-slate-300" />}</div><div className="space-y-3 p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{part.name}</h3><p className="text-xs text-slate-500">{part.sku} · {part.compatibility}</p></div><button onClick={() => onEdit(part)} aria-label={`Editar ${part.name}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button></div><div className="grid grid-cols-3 gap-2"><Value label="Precio" value={money(part.price)} /><Value label="Costo" value={money(part.cost ?? 0)} /><Value label="Stock" value={String(part.stock ?? 0)} /></div><div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className={(part.stock ?? 0) <= (part.minStock ?? 0) ? 'font-bold text-amber-700' : 'font-semibold'}>{(part.stock ?? 0) <= (part.minStock ?? 0) && <AlertTriangle className="mr-1 inline h-4 w-4" />}Minimo: {part.minStock}</span><button onClick={() => onToggle(part.id)} className={`rounded-full px-2 py-1 font-bold ${part.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{part.active !== false ? 'Activo' : 'Pausado'}</button></div></div></article>)}</div></section>; }

function Purchases({ purchases, parts, onCreate, onEdit, onReceive }: { purchases: PartPurchase[]; parts: SparePart[]; onCreate: () => void; onEdit: (purchase: PartPurchase) => void; onReceive: (purchase: PartPurchase) => void }) { return <section className="space-y-4" aria-label="Compras de repuestos"><Header title="Compras de repuestos" detail="Ordenes y recepcion directa al inventario." action={<button onClick={onCreate} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nueva compra</button>} /><div className="grid gap-3 lg:grid-cols-2">{purchases.map((purchase) => { const part = parts.find((item) => item.id === purchase.partId); return <article key={purchase.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex justify-between"><div><p className="text-xs font-bold text-slate-400">{purchase.id}</p><h3 className="font-bold text-slate-900">{part?.name}</h3><p className="text-sm text-slate-500">{purchase.supplier}</p></div><Badge status={purchase.status} /></div><div className="mt-4 grid grid-cols-3 gap-3"><Value label="Cantidad" value={String(purchase.quantity)} /><Value label="Costo" value={money(purchase.unitCost)} /><Value label="Total" value={money(purchase.quantity * purchase.unitCost)} /></div><div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">{purchase.status !== 'received' && <button onClick={() => onEdit(purchase)} aria-label={`Editar ${purchase.id}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button>}{purchase.status !== 'received' && <button onClick={() => onReceive(purchase)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><PackageCheck className="h-4 w-4" />Recibir</button>}</div></article>; })}</div></section>; }

function Inspections({ inspections, onCreate, onApprove }: { inspections: VehicleInspection[]; onCreate: () => void; onApprove: (id: string) => void }) { return <section className="space-y-4" aria-label="Inspecciones de ingreso"><Header title="Inspecciones de ingreso" detail="Estado, kilometraje, daños y evidencia fotografica." action={<button onClick={onCreate} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"><Camera className="h-4 w-4" />Nueva inspeccion</button>} /><div className="grid gap-3 lg:grid-cols-2">{inspections.map((item) => <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold text-blue-600">{item.id} · {item.plate}</p><h3 className="font-bold text-slate-900">{item.vehicle}</h3><p className="text-sm text-slate-500">{item.client} · {item.km.toLocaleString()} km · Combustible {item.fuelLevel}</p></div><BadgeInspection status={item.status} /></div><p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{item.damages || 'Sin daños declarados.'}</p><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{item.checklist.length} controles · {item.photos.length} fotos</span>{item.status !== 'approved' && <button onClick={() => onApprove(item.id)} className="rounded-md bg-blue-600 px-3 py-2 font-bold text-white">Aprobar ingreso</button>}</div></article>)}</div></section>; }

function Maintenance({ items, onNotify }: { items: MaintenanceReminder[]; onNotify: (id: string) => void }) { return <section className="space-y-4" aria-label="Mantenimiento preventivo"><Header title="Mantenimiento preventivo" detail="Proximos servicios por kilometraje y fecha." /><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[780px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Vehiculo</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Servicio</th><th className="px-4 py-3">Km actual</th><th className="px-4 py-3">Proximo</th><th className="px-4 py-3">Fecha</th><th></th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}><td className="px-4 py-3"><p className="font-bold text-slate-900">{item.vehicle}</p><p className="text-xs text-slate-500">{item.plate}</p></td><td className="px-4 py-3">{item.client}</td><td className="px-4 py-3">{item.service}</td><td className="px-4 py-3">{item.currentKm.toLocaleString()}</td><td className="px-4 py-3 font-bold">{item.dueKm.toLocaleString()}</td><td className="px-4 py-3">{item.dueDate}</td><td className="px-4 py-3 text-right"><button onClick={() => onNotify(item.id)} disabled={item.notified} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold disabled:bg-emerald-50 disabled:text-emerald-700">{item.notified ? 'Notificado' : 'Registrar aviso'}</button></td></tr>)}</tbody></table></div></section>; }

function PartEditor({ part, setPart, onImage, onSave, onClose }: { part: SparePart; setPart: (value: SparePart | null) => void; onImage: (event: ChangeEvent<HTMLInputElement>) => void; onSave: () => void; onClose: () => void }) { const number = (key: 'price' | 'cost' | 'stock' | 'minStock', value: string) => setPart({ ...part, [key]: Math.max(0, Number(value)) }); return <Modal title={part.id ? 'Editar repuesto' : 'Nuevo repuesto'} onClose={onClose} footer={<><Cancel onClick={onClose} /><button onClick={onSave} disabled={!part.name.trim()} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar repuesto</button></>}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><Label text="Imagen" /><div className="flex items-center gap-4"><div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-md bg-slate-100">{part.imageUrl ? <img src={part.imageUrl} alt="Vista previa" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-slate-300" />}</div><label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} className="sr-only" /></label></div></label><Text label="Nombre" value={part.name} set={(value) => setPart({ ...part, name: value })} wide /><Text label="SKU" value={part.sku ?? ''} set={(value) => setPart({ ...part, sku: value })} /><Text label="EAN" value={part.barcode ?? ''} set={(value) => setPart({ ...part, barcode: value })} /><Text label="Proveedor" value={part.supplier ?? ''} set={(value) => setPart({ ...part, supplier: value })} /><Text label="Compatibilidad" value={part.compatibility ?? ''} set={(value) => setPart({ ...part, compatibility: value })} /><Num label="Precio" value={part.price} set={(value) => number('price', value)} /><Num label="Costo" value={part.cost ?? 0} set={(value) => number('cost', value)} /><Num label="Stock" value={part.stock ?? 0} set={(value) => number('stock', value)} /><Num label="Stock minimo" value={part.minStock ?? 0} set={(value) => number('minStock', value)} /></div></Modal>; }

function PurchaseEditor({ purchase, setPurchase, parts, onSave, onClose }: { purchase: PartPurchase; setPurchase: (value: PartPurchase | null) => void; parts: SparePart[]; onSave: () => void; onClose: () => void }) { return <Modal title={purchase.id ? 'Editar compra' : 'Nueva compra'} onClose={onClose} footer={<><Cancel onClick={onClose} /><button onClick={onSave} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-bold text-white">Guardar compra</button></>}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><Label text="Repuesto" /><select value={purchase.partId} onChange={(event) => { const part = parts.find((item) => item.id === event.target.value); setPurchase({ ...purchase, partId: event.target.value, supplier: part?.supplier ?? '', unitCost: part?.cost ?? 0 }); }} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{parts.map((part) => <option key={part.id} value={part.id}>{part.name}</option>)}</select></label><Text label="Proveedor" value={purchase.supplier} set={(value) => setPurchase({ ...purchase, supplier: value })} /><Text label="Fecha esperada" value={purchase.expectedDate} set={(value) => setPurchase({ ...purchase, expectedDate: value })} /><Num label="Cantidad" value={purchase.quantity} set={(value) => setPurchase({ ...purchase, quantity: Number(value) })} /><Num label="Costo unitario" value={purchase.unitCost} set={(value) => setPurchase({ ...purchase, unitCost: Number(value) })} /></div></Modal>; }

function InspectionEditor({ inspection, setInspection, onPhotos, onSave, onClose }: { inspection: VehicleInspection; setInspection: (value: VehicleInspection | null) => void; onPhotos: (event: ChangeEvent<HTMLInputElement>) => void; onSave: () => void; onClose: () => void }) { return <Modal title="Nueva inspeccion" onClose={onClose} footer={<><Cancel onClick={onClose} /><button onClick={onSave} disabled={!inspection.plate.trim()} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar inspeccion</button></>}><div className="grid gap-4 sm:grid-cols-2"><Text label="Patente" value={inspection.plate} set={(value) => setInspection({ ...inspection, plate: value.toUpperCase() })} /><Text label="Vehiculo" value={inspection.vehicle} set={(value) => setInspection({ ...inspection, vehicle: value })} /><Text label="Cliente" value={inspection.client} set={(value) => setInspection({ ...inspection, client: value })} /><Num label="Kilometraje" value={inspection.km} set={(value) => setInspection({ ...inspection, km: Number(value) })} /><Text label="Combustible" value={inspection.fuelLevel} set={(value) => setInspection({ ...inspection, fuelLevel: value })} /><Text label="Daños observados" value={inspection.damages} set={(value) => setInspection({ ...inspection, damages: value })} wide /><label className="sm:col-span-2"><Label text="Fotografias" /><label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-700"><Camera className="h-5 w-5" />Agregar fotografias ({inspection.photos.length})<input type="file" multiple accept="image/*" onChange={onPhotos} className="sr-only" /></label></label></div></Modal>; }

function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: ReactNode; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div></div></div>; }
function Header({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{detail}</p></div>{action}</div>; }
function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${warning ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-bold text-slate-900">{value}</p></div>; }
function Badge({ status }: { status: PurchaseStatus }) { return <span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${status === 'received' ? 'bg-emerald-100 text-emerald-700' : status === 'ordered' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{status === 'received' ? 'Recibida' : status === 'ordered' ? 'Pedida' : 'Borrador'}</span>; }
function BadgeInspection({ status }: { status: InspectionStatus }) { return <span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{status === 'approved' ? 'Aprobada' : status === 'completed' ? 'Completa' : 'Pendiente'}</span>; }
function Label({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function Text({ label, value, set, wide = false }: { label: string; value: string; set: (value: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><Label text={label} /><input value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function Num({ label, value, set }: { label: string; value: number; set: (value: string) => void }) { return <label><Label text={label} /><input type="number" min="0" step="0.01" value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function Cancel({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancelar</button>; }
