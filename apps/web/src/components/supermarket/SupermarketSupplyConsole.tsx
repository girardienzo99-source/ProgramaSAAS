'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/client/apiFetch';
import type {
  SupermarketSupplierDocumentRecord,
  SupermarketSupplierRecord,
  SupermarketSupplyForecastRecord,
} from '@/lib/api/supermarketSupplyRepository';

type View = 'forecast' | 'suppliers' | 'accounts';
interface ProductOption { id: string; name: string; cost: number }
interface PurchaseOption { id: string; supplier: string; productId: string; quantity: number; unitCost: number; status: string }
interface PurchaseInput { supplier: string; productId: string; quantity: number; unitCost: number; expectedDate: string; status: 'ordered'; lotCode: string; expirationDate: string }

const EMPTY_SUPPLIER = { name: '', taxId: '', phone: '', email: '', address: '', leadDays: 7, creditLimit: 0, active: true };
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const riskLabel = { out_of_stock: 'Sin stock', critical: 'Critico', attention: 'Atencion', healthy: 'Saludable' };

export default function SupermarketSupplyConsole({ products, purchases, onCreatePurchase }: {
  products: ProductOption[];
  purchases: PurchaseOption[];
  onCreatePurchase: (input: PurchaseInput) => Promise<void>;
}) {
  const [view, setView] = useState<View>('forecast');
  const [suppliers, setSuppliers] = useState<SupermarketSupplierRecord[]>([]);
  const [documents, setDocuments] = useState<SupermarketSupplierDocumentRecord[]>([]);
  const [forecast, setForecast] = useState<SupermarketSupplyForecastRecord[]>([]);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [safetyDays, setSafetyDays] = useState(5);
  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<(typeof EMPTY_SUPPLIER & { id?: string }) | null>(null);
  const [documentDraft, setDocumentDraft] = useState({ supplierId: '', purchaseOrderId: '', documentType: 'invoice', documentNumber: '', issueDate: today(), dueDate: '', amount: 0, notes: '' });
  const [showDocument, setShowDocument] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async (period = lookbackDays, safety = safetyDays) => {
    setLoading(true);
    try {
      const [supplierResponse, documentResponse, forecastResponse] = await Promise.all([
        apiFetch<{ items: SupermarketSupplierRecord[] }>('/api/rubros/supermarket/suppliers'),
        apiFetch<{ items: SupermarketSupplierDocumentRecord[] }>('/api/rubros/supermarket/supplier-documents'),
        apiFetch<{ items: SupermarketSupplyForecastRecord[] }>(`/api/rubros/supermarket/supply?lookbackDays=${period}&safetyDays=${safety}`),
      ]);
      setSuppliers(supplierResponse.items); setDocuments(documentResponse.items); setForecast(forecastResponse.items);
      setFeedback('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo sincronizar el abastecimiento.');
    } finally { setLoading(false); }
  }, [lookbackDays, safetyDays]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const debt = suppliers.reduce((sum, supplier) => sum + supplier.balance, 0);
  const overdue = suppliers.reduce((sum, supplier) => sum + supplier.overdueAmount, 0);
  const critical = forecast.filter((item) => item.risk === 'critical' || item.risk === 'out_of_stock').length;
  const suggestedValue = forecast.reduce((sum, item) => sum + item.suggestedQuantity * (products.find((product) => product.id === item.productId)?.cost ?? 0), 0);
  const visibleForecast = useMemo(() => forecast.filter((item) => `${item.name} ${item.supplierName} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [forecast, search]);

  const changeForecast = (period: number, safety: number) => {
    setLookbackDays(period); setSafetyDays(safety); void load(period, safety);
  };

  const saveSupplier = async () => {
    if (!editingSupplier?.name.trim()) return;
    try {
      await apiFetch('/api/rubros/supermarket/suppliers', { method: 'POST', body: JSON.stringify(editingSupplier) });
      setEditingSupplier(null); await load(); setFeedback('Proveedor guardado.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo guardar el proveedor.'); }
  };

  const postDocument = async () => {
    if (!documentDraft.supplierId || !documentDraft.documentNumber || documentDraft.amount <= 0) return;
    try {
      const response = await apiFetch<{ item: { reconciliationStatus: string; difference: number | null } }>('/api/rubros/supermarket/supplier-documents', {
        method: 'POST', headers: { 'Idempotency-Key': `supermarket-supplier:${crypto.randomUUID()}` }, body: JSON.stringify(documentDraft),
      });
      setShowDocument(false);
      setDocumentDraft({ supplierId: '', purchaseOrderId: '', documentType: 'invoice', documentNumber: '', issueDate: today(), dueDate: '', amount: 0, notes: '' });
      await load();
      setFeedback(response.item.reconciliationStatus === 'matched' ? 'Factura conciliada sin diferencias.' : response.item.reconciliationStatus === 'variance' ? `Factura registrada con diferencia de ${money(response.item.difference ?? 0)}.` : 'Movimiento registrado en la cuenta corriente.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo registrar el comprobante.'); }
  };

  const createSuggestedPurchase = async (item: SupermarketSupplyForecastRecord) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || !item.supplierName || item.suggestedQuantity <= 0) return;
    const expected = new Date(); expected.setDate(expected.getDate() + item.leadDays);
    try {
      await onCreatePurchase({ supplier: item.supplierName, productId: item.productId, quantity: item.suggestedQuantity, unitCost: product.cost, expectedDate: expected.toISOString().slice(0, 10), status: 'ordered', lotCode: '', expirationDate: '' });
      await load(); setFeedback(`Orden sugerida creada para ${item.name}.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo crear la orden sugerida.'); }
  };

  const tabs: Array<{ id: View; label: string; icon: typeof Gauge }> = [
    { id: 'forecast', label: 'Reposicion', icon: Gauge }, { id: 'suppliers', label: 'Proveedores', icon: Building2 }, { id: 'accounts', label: 'Conciliacion', icon: ClipboardList },
  ];
  const matchingOrders = purchases.filter((purchase) => !documentDraft.supplierId || purchase.supplier.toLowerCase() === suppliers.find((item) => item.id === documentDraft.supplierId)?.name.toLowerCase());

  return <section className="space-y-5" aria-label="Abastecimiento de supermercado">
    <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase text-emerald-700">Compras basadas en demanda</p><h2 className="text-lg font-bold text-slate-950">Abastecimiento inteligente</h2><p className="text-sm text-slate-500">Rotacion, cobertura, proveedores y cuentas por pagar.</p></div><div className="flex rounded-md border border-slate-300 p-0.5">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={`flex h-9 items-center gap-2 px-3 text-sm font-bold ${view === id ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>
    {feedback && <div role="status" className={`border-l-2 p-3 text-sm ${feedback.includes('no ') || feedback.includes('corresponde') ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-emerald-500 bg-emerald-50 text-emerald-800'}`}>{feedback}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={AlertTriangle} label="Riesgo de quiebre" value={String(critical)} detail="Sin stock o cobertura critica" warning={critical > 0} /><Metric icon={TrendingUp} label="Compra sugerida" value={money(suggestedValue)} detail={`Seguridad: ${safetyDays} dias`} /><Metric icon={CircleDollarSign} label="Deuda proveedores" value={money(debt)} detail={`${suppliers.length} proveedores`} /><Metric icon={ClipboardList} label="Deuda vencida" value={money(overdue)} detail={`${documents.length} movimientos`} warning={overdue > 0} /></div>

    {view === 'forecast' && <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, categoria o proveedor" className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" /></label><label className="text-xs font-bold text-slate-600">Historial<select value={lookbackDays} onChange={(event) => changeForecast(Number(event.target.value), safetyDays)} className="mt-1 block h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option></select></label><label className="text-xs font-bold text-slate-600">Seguridad<input type="number" min="0" max="60" value={safetyDays} onChange={(event) => changeForecast(lookbackDays, Math.max(0, Math.min(60, Number(event.target.value))))} className="mt-1 block h-10 w-24 rounded-md border border-slate-300 px-3 text-sm" /></label><button onClick={() => void load()} disabled={loading} aria-label="Actualizar abastecimiento" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div><div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3 text-right">Venta diaria</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">En camino</th><th className="px-4 py-3 text-right">Cobertura</th><th className="px-4 py-3 text-right">Sugerido</th><th className="px-4 py-3">Riesgo</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{visibleForecast.map((item) => <tr key={item.productId}><td className="px-4 py-3"><p className="font-bold text-slate-950">{item.name}</p><p className="text-xs text-slate-500">Rotacion {item.turnoverIndex.toFixed(2)}x</p></td><td className="px-4 py-3 text-slate-600">{item.supplierName || 'Sin asignar'}<p className="text-xs">Entrega {item.leadDays} dias</p></td><td className="px-4 py-3 text-right">{item.averageDailySales.toFixed(2)}</td><td className="px-4 py-3 text-right font-bold">{item.stock}</td><td className="px-4 py-3 text-right">{item.incomingQuantity}</td><td className="px-4 py-3 text-right">{item.daysCover >= 9999 ? '-' : `${item.daysCover.toFixed(1)} dias`}</td><td className="px-4 py-3 text-right font-bold text-emerald-700">{item.suggestedQuantity || '-'}</td><td className="px-4 py-3"><Risk value={item.risk} /></td><td className="px-4 py-3 text-right"><button onClick={() => void createSuggestedPurchase(item)} disabled={!item.supplierName || item.suggestedQuantity <= 0} className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-30"><Truck className="h-4 w-4" />Crear orden</button></td></tr>)}</tbody></table>{!visibleForecast.length && <Empty text="No hay productos para pronosticar." />}</div></div>}

    {view === 'suppliers' && <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setEditingSupplier({ ...EMPTY_SUPPLIER })} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nuevo proveedor</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => { const usage = supplier.creditLimit ? supplier.balance * 100 / supplier.creditLimit : 0; return <article key={supplier.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{supplier.name}</h3><p className="truncate text-xs text-slate-500">{supplier.taxId || 'CUIT pendiente'} · entrega {supplier.leadDays} dias</p></div><button onClick={() => setEditingSupplier({ id: supplier.id, name: supplier.name, taxId: supplier.taxId, phone: supplier.phone, email: supplier.email, address: supplier.address, leadDays: supplier.leadDays, creditLimit: supplier.creditLimit, active: supplier.active })} aria-label={`Editar ${supplier.name}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-2 gap-3"><Value label="Saldo" value={money(supplier.balance)} /><Value label="Credito" value={money(supplier.creditLimit)} /><Value label="Vencido" value={money(supplier.overdueAmount)} /><Value label="Facturas" value={String(supplier.openDocuments)} /></div><div className="mt-3 h-2 bg-slate-100"><div className={`h-full ${usage > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, usage)}%` }} /></div></article>; })}</div></div>}

    {view === 'accounts' && <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setShowDocument(true)} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Registrar comprobante</button></div><div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Comprobante</th><th className="px-4 py-3">Orden</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3 text-right">Diferencia</th><th className="px-4 py-3">Conciliacion</th></tr></thead><tbody className="divide-y divide-slate-100">{documents.map((document) => <tr key={document.id}><td className="px-4 py-3">{document.issueDate}</td><td className="px-4 py-3 font-bold text-slate-950">{document.supplierName}</td><td className="px-4 py-3"><p className="font-semibold">{document.documentNumber}</p><p className="text-xs text-slate-500">{document.documentType === 'invoice' ? 'Factura' : document.documentType === 'payment' ? 'Pago' : 'Nota de credito'}</p></td><td className="px-4 py-3">{document.purchaseOrderNumber ? `OC ${document.purchaseOrderNumber}` : '-'}</td><td className={`px-4 py-3 text-right font-bold ${document.signedAmount < 0 ? 'text-emerald-700' : 'text-slate-950'}`}>{money(document.signedAmount)}</td><td className="px-4 py-3 text-right">{document.difference === null ? '-' : money(document.difference)}</td><td className="px-4 py-3"><Reconciliation value={document.reconciliationStatus} /></td></tr>)}</tbody></table>{!documents.length && <Empty text="Todavia no hay movimientos de proveedores." />}</div></div>}

    {editingSupplier && <Modal title={editingSupplier.id ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setEditingSupplier(null)} footer={<><Secondary onClick={() => setEditingSupplier(null)}>Cancelar</Secondary><Primary onClick={() => void saveSupplier()} disabled={!editingSupplier.name.trim()}>Guardar</Primary></>}><div className="grid gap-4 sm:grid-cols-2"><Text label="Nombre" value={editingSupplier.name} set={(value) => setEditingSupplier({ ...editingSupplier, name: value })} wide /><Text label="CUIT" value={editingSupplier.taxId} set={(value) => setEditingSupplier({ ...editingSupplier, taxId: value })} /><Text label="Telefono" value={editingSupplier.phone} set={(value) => setEditingSupplier({ ...editingSupplier, phone: value })} /><Text label="Email" value={editingSupplier.email} set={(value) => setEditingSupplier({ ...editingSupplier, email: value })} /><Text label="Direccion" value={editingSupplier.address} set={(value) => setEditingSupplier({ ...editingSupplier, address: value })} /><NumberField label="Dias de entrega" value={editingSupplier.leadDays} set={(value) => setEditingSupplier({ ...editingSupplier, leadDays: Math.max(0, Number(value)) })} /><NumberField label="Limite de credito" value={editingSupplier.creditLimit} set={(value) => setEditingSupplier({ ...editingSupplier, creditLimit: Math.max(0, Number(value)) })} /></div></Modal>}

    {showDocument && <Modal title="Registrar comprobante" onClose={() => setShowDocument(false)} footer={<><Secondary onClick={() => setShowDocument(false)}>Cancelar</Secondary><Primary onClick={() => void postDocument()} disabled={!documentDraft.supplierId || !documentDraft.documentNumber || documentDraft.amount <= 0}>Registrar</Primary></>}><div className="grid gap-4 sm:grid-cols-2"><Select label="Tipo" value={documentDraft.documentType} set={(value) => setDocumentDraft({ ...documentDraft, documentType: value, purchaseOrderId: value === 'invoice' ? documentDraft.purchaseOrderId : '', dueDate: value === 'invoice' ? documentDraft.dueDate : '' })} options={[['invoice', 'Factura'], ['credit_note', 'Nota de credito'], ['payment', 'Pago']]} /><Select label="Proveedor" value={documentDraft.supplierId} set={(value) => setDocumentDraft({ ...documentDraft, supplierId: value, purchaseOrderId: '' })} options={[['', 'Seleccionar'], ...suppliers.filter((item) => item.active).map((item) => [item.id, item.name])]} /><Text label="Numero" value={documentDraft.documentNumber} set={(value) => setDocumentDraft({ ...documentDraft, documentNumber: value })} /><NumberField label="Importe" value={documentDraft.amount} set={(value) => setDocumentDraft({ ...documentDraft, amount: Math.max(0, Number(value)) })} /><Text label="Fecha de emision" value={documentDraft.issueDate} set={(value) => setDocumentDraft({ ...documentDraft, issueDate: value })} /><Text label="Vencimiento" value={documentDraft.dueDate} set={(value) => setDocumentDraft({ ...documentDraft, dueDate: value })} />{documentDraft.documentType === 'invoice' && <Select label="Orden a conciliar" value={documentDraft.purchaseOrderId} set={(value) => setDocumentDraft({ ...documentDraft, purchaseOrderId: value })} options={[['', 'Sin orden'], ...matchingOrders.map((item) => [item.id, `${item.id.slice(0, 8)} · ${money(item.quantity * item.unitCost)}`])]} />}<Text label="Notas" value={documentDraft.notes} set={(value) => setDocumentDraft({ ...documentDraft, notes: value })} wide /></div></Modal>}
  </section>;
}

function Metric({ icon: Icon, label, value, detail, warning = false }: { icon: typeof Gauge; label: string; value: string; detail: string; warning?: boolean }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><p className="text-xs font-bold uppercase">{label}</p></div><p className={`mt-2 text-xl font-bold ${warning ? 'text-amber-700' : 'text-slate-950'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Risk({ value }: { value: SupermarketSupplyForecastRecord['risk'] }) { const style = value === 'out_of_stock' ? 'bg-rose-100 text-rose-700' : value === 'critical' ? 'bg-orange-100 text-orange-700' : value === 'attention' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'; return <span className={`rounded-full px-2 py-1 text-xs font-bold ${style}`}>{riskLabel[value]}</span>; }
function Reconciliation({ value }: { value: SupermarketSupplierDocumentRecord['reconciliationStatus'] }) { const matched = value === 'matched'; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${matched ? 'bg-emerald-100 text-emerald-700' : value === 'variance' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{matched && <CheckCircle2 className="h-3 w-3" />}{matched ? 'Conciliado' : value === 'variance' ? 'Con diferencia' : 'Sin conciliar'}</span>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="py-10 text-center text-sm text-slate-500">{text}</p>; }
function FieldLabel({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function Text({ label, value, set, wide = false }: { label: string; value: string; set: (value: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><FieldLabel text={label} /><input value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function NumberField({ label, value, set }: { label: string; value: number; set: (value: string) => void }) { return <label><FieldLabel text={label} /><input type="number" min="0" value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function Select({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: string[][] }) { return <label><FieldLabel text={label} /><select value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{options.map(([id, text]) => <option key={id || 'empty'} value={id}>{text}</option>)}</select></label>; }
function Primary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) { return <button onClick={onClick} disabled={disabled} className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40">{children}</button>; }
function Secondary({ onClick, children }: { onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700">{children}</button>; }
function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: ReactNode; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-950">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div></div></div>; }
