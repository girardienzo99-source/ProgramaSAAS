'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/client/apiFetch';
import SupermarketSupplierClaimsConsole from './SupermarketSupplierClaimsConsole';
import type {
  SupermarketSupplierDocumentRecord,
  SupermarketSupplierRecord,
  SupermarketSupplyForecastRecord,
  SupermarketPurchaseApprovalPolicy,
  SupermarketPurchaseApprovalRecord,
} from '@/lib/api/supermarketSupplyRepository';
import type {
  SupermarketSupplierPortalAccessRecord,
  SupermarketSupplierShipmentRecord,
} from '@/lib/api/supermarketSupplierPortalRepository';

type View = 'forecast' | 'suppliers' | 'accounts' | 'approvals' | 'portal' | 'claims';
interface ProductOption { id: string; name: string; cost: number }
interface PurchaseOption { id: string; supplier: string; productId: string; quantity: number; unitCost: number; status: string }
interface PurchaseInput { supplier: string; productId: string; quantity: number; unitCost: number; expectedDate: string; status: 'draft'; lotCode: string; expirationDate: string }

const EMPTY_SUPPLIER = { name: '', taxId: '', phone: '', email: '', address: '', leadDays: 7, creditLimit: 0, active: true };
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const riskLabel = { out_of_stock: 'Sin stock', critical: 'Critico', attention: 'Atencion', healthy: 'Saludable' };

export default function SupermarketSupplyConsole({ products, purchases, onCreatePurchase, onPurchasesChanged }: {
  products: ProductOption[];
  purchases: PurchaseOption[];
  onCreatePurchase: (input: PurchaseInput) => Promise<void>;
  onPurchasesChanged: () => Promise<void>;
}) {
  const [view, setView] = useState<View>('forecast');
  const [suppliers, setSuppliers] = useState<SupermarketSupplierRecord[]>([]);
  const [documents, setDocuments] = useState<SupermarketSupplierDocumentRecord[]>([]);
  const [forecast, setForecast] = useState<SupermarketSupplyForecastRecord[]>([]);
  const [approvals, setApprovals] = useState<SupermarketPurchaseApprovalRecord[]>([]);
  const [portalAccess, setPortalAccess] = useState<SupermarketSupplierPortalAccessRecord[]>([]);
  const [shipments, setShipments] = useState<SupermarketSupplierShipmentRecord[]>([]);
  const [approvalPolicy, setApprovalPolicy] = useState<SupermarketPurchaseApprovalPolicy>({ enabled: true, autoApproveLimit: 100000, secondApprovalThreshold: 1000000 });
  const [lookbackDays, setLookbackDays] = useState(30);
  const [safetyDays, setSafetyDays] = useState(5);
  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<(typeof EMPTY_SUPPLIER & { id?: string }) | null>(null);
  const [documentDraft, setDocumentDraft] = useState({ supplierId: '', purchaseOrderId: '', documentType: 'invoice', documentNumber: '', issueDate: today(), dueDate: '', amount: 0, notes: '' });
  const [showDocument, setShowDocument] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SupermarketPurchaseApprovalPolicy | null>(null);
  const [decisionDraft, setDecisionDraft] = useState<{ requestId: string; decision: 'approved' | 'rejected'; notes: string } | null>(null);
  const [accessDraft, setAccessDraft] = useState<{ supplierId: string; label: string; expiresInDays: number } | null>(null);
  const [generatedPortalUrl, setGeneratedPortalUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async (period = lookbackDays, safety = safetyDays) => {
    setLoading(true);
    try {
      const [supplierResponse, documentResponse, forecastResponse, approvalResponse, portalResponse, shipmentResponse] = await Promise.all([
        apiFetch<{ items: SupermarketSupplierRecord[] }>('/api/rubros/supermarket/suppliers'),
        apiFetch<{ items: SupermarketSupplierDocumentRecord[] }>('/api/rubros/supermarket/supplier-documents'),
        apiFetch<{ items: SupermarketSupplyForecastRecord[] }>(`/api/rubros/supermarket/supply?lookbackDays=${period}&safetyDays=${safety}`),
        apiFetch<{ items: SupermarketPurchaseApprovalRecord[]; policy: SupermarketPurchaseApprovalPolicy }>('/api/rubros/supermarket/purchase-approvals'),
        apiFetch<{ items: SupermarketSupplierPortalAccessRecord[] }>('/api/rubros/supermarket/supplier-portal-access'),
        apiFetch<{ items: SupermarketSupplierShipmentRecord[] }>('/api/rubros/supermarket/supplier-shipments'),
      ]);
      setSuppliers(supplierResponse.items); setDocuments(documentResponse.items); setForecast(forecastResponse.items);
      setApprovals(approvalResponse.items); setApprovalPolicy(approvalResponse.policy);
      setPortalAccess(portalResponse.items);
      setShipments(shipmentResponse.items);
      setFeedback('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo sincronizar el abastecimiento.');
    } finally { setLoading(false); }
  }, [lookbackDays, safetyDays]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const debt = suppliers.reduce((sum, supplier) => sum + supplier.balance, 0);
  const overdue = suppliers.reduce((sum, supplier) => sum + supplier.overdueAmount, 0);
  const critical = forecast.filter((item) => item.risk === 'critical' || item.risk === 'out_of_stock').length;
  const pendingApprovals = approvals.filter((item) => item.status === 'pending').length;
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
      await onCreatePurchase({ supplier: item.supplierName, productId: item.productId, quantity: item.suggestedQuantity, unitCost: product.cost, expectedDate: expected.toISOString().slice(0, 10), status: 'draft', lotCode: '', expirationDate: '' });
      await load(); setFeedback(`Borrador creado para ${item.name}. Envialo a aprobacion.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo crear la orden sugerida.'); }
  };

  const requestApproval = async (orderId: string) => {
    try {
      const response = await apiFetch<{ item: { status: string } }>('/api/rubros/supermarket/purchase-approvals', {
        method: 'POST', headers: { 'Idempotency-Key': `supermarket-approval:${crypto.randomUUID()}` },
        body: JSON.stringify({ orderId }),
      });
      await onPurchasesChanged(); await load();
      setFeedback(response.item.status === 'auto_approved' ? 'Compra autorizada automaticamente por la politica vigente.' : 'Compra enviada al circuito de aprobacion.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo solicitar la aprobacion.'); }
  };

  const decideApproval = async () => {
    if (!decisionDraft) return;
    try {
      await apiFetch('/api/rubros/supermarket/purchase-approvals', { method: 'PATCH', body: JSON.stringify(decisionDraft) });
      const decision = decisionDraft.decision;
      setDecisionDraft(null); await onPurchasesChanged(); await load();
      setFeedback(decision === 'approved' ? 'Aprobacion registrada.' : 'Compra rechazada y devuelta a borrador.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo registrar la decision.'); }
  };

  const saveApprovalPolicy = async () => {
    if (!editingPolicy) return;
    try {
      await apiFetch('/api/rubros/supermarket/purchase-approvals', { method: 'PUT', body: JSON.stringify(editingPolicy) });
      setEditingPolicy(null); await load(); setFeedback('Politica de aprobaciones actualizada.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo actualizar la politica.'); }
  };

  const createPortalAccess = async () => {
    if (!accessDraft?.supplierId || !accessDraft.label.trim()) return;
    try {
      const response = await apiFetch<{ item: { portalUrl: string } }>('/api/rubros/supermarket/supplier-portal-access', {
        method: 'POST', body: JSON.stringify(accessDraft),
      });
      setAccessDraft(null); setGeneratedPortalUrl(response.item.portalUrl); await load();
      setFeedback('Acceso externo creado. El enlace se muestra una sola vez.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo crear el acceso externo.'); }
  };

  const revokePortalAccess = async (accessId: string) => {
    try {
      await apiFetch('/api/rubros/supermarket/supplier-portal-access', { method: 'PATCH', body: JSON.stringify({ accessId }) });
      await load(); setFeedback('Acceso externo revocado.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo revocar el acceso.'); }
  };

  const openShipmentDocument = async (shipmentId: string) => {
    try {
      const response = await apiFetch<{ item: { url: string } }>(`/api/rubros/supermarket/supplier-shipments?shipmentId=${encodeURIComponent(shipmentId)}`);
      window.open(response.item.url, '_blank', 'noopener,noreferrer');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo abrir el remito.'); }
  };

  const tabs: Array<{ id: View; label: string; icon: typeof Gauge }> = [
    { id: 'forecast', label: 'Reposicion', icon: Gauge }, { id: 'suppliers', label: 'Proveedores', icon: Building2 }, { id: 'accounts', label: 'Conciliacion', icon: ClipboardList }, { id: 'approvals', label: 'Aprobaciones', icon: ShieldCheck }, { id: 'portal', label: 'Portal', icon: KeyRound }, { id: 'claims', label: 'Reclamos', icon: AlertTriangle },
  ];
  const matchingOrders = purchases.filter((purchase) => !documentDraft.supplierId || purchase.supplier.toLowerCase() === suppliers.find((item) => item.id === documentDraft.supplierId)?.name.toLowerCase());

  return <section className="space-y-5" aria-label="Abastecimiento de supermercado">
    <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase text-emerald-700">Compras basadas en demanda</p><h2 className="text-lg font-bold text-slate-950">Abastecimiento inteligente</h2><p className="text-sm text-slate-500">Rotacion, cobertura, proveedores y cuentas por pagar.</p></div><div className="overflow-x-auto"><div className="flex min-w-max rounded-md border border-slate-300 p-0.5">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={`flex h-9 items-center gap-2 px-3 text-sm font-bold ${view === id ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div></div>
    {feedback && <div role="status" className={`border-l-2 p-3 text-sm ${feedback.includes('no ') || feedback.includes('corresponde') ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-emerald-500 bg-emerald-50 text-emerald-800'}`}>{feedback}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={AlertTriangle} label="Riesgo de quiebre" value={String(critical)} detail="Sin stock o cobertura critica" warning={critical > 0} /><Metric icon={TrendingUp} label="Compra sugerida" value={money(suggestedValue)} detail={`Seguridad: ${safetyDays} dias`} /><Metric icon={ShieldCheck} label="Por aprobar" value={String(pendingApprovals)} detail="Ordenes pendientes" warning={pendingApprovals > 0} /><Metric icon={CircleDollarSign} label="Deuda proveedores" value={money(debt)} detail={`${suppliers.length} proveedores`} /><Metric icon={ClipboardList} label="Deuda vencida" value={money(overdue)} detail={`${documents.length} movimientos`} warning={overdue > 0} /></div>

    {view === 'forecast' && <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, categoria o proveedor" className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" /></label><label className="text-xs font-bold text-slate-600">Historial<select value={lookbackDays} onChange={(event) => changeForecast(Number(event.target.value), safetyDays)} className="mt-1 block h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option></select></label><label className="text-xs font-bold text-slate-600">Seguridad<input type="number" min="0" max="60" value={safetyDays} onChange={(event) => changeForecast(lookbackDays, Math.max(0, Math.min(60, Number(event.target.value))))} className="mt-1 block h-10 w-24 rounded-md border border-slate-300 px-3 text-sm" /></label><button onClick={() => void load()} disabled={loading} aria-label="Actualizar abastecimiento" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div><div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3 text-right">Venta diaria</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">En camino</th><th className="px-4 py-3 text-right">Cobertura</th><th className="px-4 py-3 text-right">Sugerido</th><th className="px-4 py-3">Riesgo</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{visibleForecast.map((item) => <tr key={item.productId}><td className="px-4 py-3"><p className="font-bold text-slate-950">{item.name}</p><p className="text-xs text-slate-500">Rotacion {item.turnoverIndex.toFixed(2)}x</p></td><td className="px-4 py-3 text-slate-600">{item.supplierName || 'Sin asignar'}<p className="text-xs">Entrega {item.leadDays} dias</p></td><td className="px-4 py-3 text-right">{item.averageDailySales.toFixed(2)}</td><td className="px-4 py-3 text-right font-bold">{item.stock}</td><td className="px-4 py-3 text-right">{item.incomingQuantity}</td><td className="px-4 py-3 text-right">{item.daysCover >= 9999 ? '-' : `${item.daysCover.toFixed(1)} dias`}</td><td className="px-4 py-3 text-right font-bold text-emerald-700">{item.suggestedQuantity || '-'}</td><td className="px-4 py-3"><Risk value={item.risk} /></td><td className="px-4 py-3 text-right"><button onClick={() => void createSuggestedPurchase(item)} disabled={!item.supplierName || item.suggestedQuantity <= 0} className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-30"><Truck className="h-4 w-4" />Crear orden</button></td></tr>)}</tbody></table>{!visibleForecast.length && <Empty text="No hay productos para pronosticar." />}</div></div>}

    {view === 'suppliers' && <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setEditingSupplier({ ...EMPTY_SUPPLIER })} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nuevo proveedor</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => { const usage = supplier.creditLimit ? supplier.balance * 100 / supplier.creditLimit : 0; return <article key={supplier.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{supplier.name}</h3><p className="truncate text-xs text-slate-500">{supplier.taxId || 'CUIT pendiente'} · entrega {supplier.leadDays} dias</p></div><button onClick={() => setEditingSupplier({ id: supplier.id, name: supplier.name, taxId: supplier.taxId, phone: supplier.phone, email: supplier.email, address: supplier.address, leadDays: supplier.leadDays, creditLimit: supplier.creditLimit, active: supplier.active })} aria-label={`Editar ${supplier.name}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-2 gap-3"><Value label="Saldo" value={money(supplier.balance)} /><Value label="Credito" value={money(supplier.creditLimit)} /><Value label="Vencido" value={money(supplier.overdueAmount)} /><Value label="Facturas" value={String(supplier.openDocuments)} /></div><div className="mt-3 h-2 bg-slate-100"><div className={`h-full ${usage > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, usage)}%` }} /></div></article>; })}</div></div>}

    {view === 'accounts' && <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setShowDocument(true)} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Registrar comprobante</button></div><div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Comprobante</th><th className="px-4 py-3">Orden</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3 text-right">Diferencia</th><th className="px-4 py-3">Conciliacion</th></tr></thead><tbody className="divide-y divide-slate-100">{documents.map((document) => <tr key={document.id}><td className="px-4 py-3">{document.issueDate}</td><td className="px-4 py-3 font-bold text-slate-950">{document.supplierName}</td><td className="px-4 py-3"><p className="font-semibold">{document.documentNumber}</p><p className="text-xs text-slate-500">{document.documentType === 'invoice' ? 'Factura' : document.documentType === 'payment' ? 'Pago' : 'Nota de credito'}</p></td><td className="px-4 py-3">{document.purchaseOrderNumber ? `OC ${document.purchaseOrderNumber}` : '-'}</td><td className={`px-4 py-3 text-right font-bold ${document.signedAmount < 0 ? 'text-emerald-700' : 'text-slate-950'}`}>{money(document.signedAmount)}</td><td className="px-4 py-3 text-right">{document.difference === null ? '-' : money(document.difference)}</td><td className="px-4 py-3"><Reconciliation value={document.reconciliationStatus} /></td></tr>)}</tbody></table>{!documents.length && <Empty text="Todavia no hay movimientos de proveedores." />}</div></div>}

    {view === 'approvals' && <div className="space-y-5"><div className="flex flex-col justify-between gap-3 border-y border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-700" /><h3 className="font-bold text-slate-950">Politica de autorizacion</h3></div><p className="mt-1 text-sm text-slate-600">Hasta {money(approvalPolicy.autoApproveLimit)} automatico; desde {money(approvalPolicy.secondApprovalThreshold)} requiere dos aprobadores.</p></div><button onClick={() => setEditingPolicy({ ...approvalPolicy })} className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700"><Settings2 className="h-4 w-4" />Configurar</button></div><div><h3 className="font-bold text-slate-950">Borradores para enviar</h3><p className="text-sm text-slate-500">Las ordenes no pueden recibirse hasta completar este circuito.</p><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{purchases.filter((purchase) => purchase.status === 'draft').map((purchase) => { const existing = approvals.find((item) => item.orderId === purchase.id); const waiting = existing?.status === 'pending'; return <article key={purchase.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">{purchase.id.slice(0, 12)}</p><h4 className="font-bold text-slate-950">{products.find((item) => item.id === purchase.productId)?.name ?? 'Producto'}</h4><p className="text-sm text-slate-500">{purchase.supplier}</p></div>{existing && <ApprovalStatus value={existing.status} />}</div><div className="mt-4 grid grid-cols-2 gap-3"><Value label="Cantidad" value={String(purchase.quantity)} /><Value label="Total" value={money(purchase.quantity * purchase.unitCost)} /></div><button onClick={() => void requestApproval(purchase.id)} disabled={waiting} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white disabled:bg-slate-300"><ShieldCheck className="h-4 w-4" />{waiting ? 'Esperando aprobacion' : existing?.status === 'rejected' ? 'Reenviar a aprobacion' : 'Solicitar aprobacion'}</button></article>; })}</div>{!purchases.some((purchase) => purchase.status === 'draft') && <Empty text="No hay borradores pendientes de envio." />}</div><div><h3 className="mb-3 font-bold text-slate-950">Historial de autorizaciones</h3><div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Orden</th><th className="px-4 py-3">Compra</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3">Progreso</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Solicitud</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{approvals.map((approval) => <tr key={approval.id}><td className="px-4 py-3 font-mono font-bold">{approval.orderNumber ? `#${approval.orderNumber}` : approval.orderId.slice(0, 8)}</td><td className="px-4 py-3"><p className="font-bold text-slate-950">{approval.productName}</p><p className="text-xs text-slate-500">{approval.supplierName}</p></td><td className="px-4 py-3 text-right font-bold">{money(approval.amount)}</td><td className="px-4 py-3">{approval.requiredApprovals === 0 ? 'Automatica' : `${approval.approvalCount} de ${approval.requiredApprovals}`}</td><td className="px-4 py-3"><ApprovalStatus value={approval.status} /></td><td className="px-4 py-3 text-xs text-slate-500">{new Date(approval.requestedAt).toLocaleString('es-AR')}</td><td className="px-4 py-3"><div className="flex justify-end gap-2">{approval.canDecide && <><button onClick={() => setDecisionDraft({ requestId: approval.id, decision: 'rejected', notes: '' })} aria-label="Rechazar compra" className="rounded-md border border-rose-200 p-2 text-rose-700"><XCircle className="h-4 w-4" /></button><button onClick={() => setDecisionDraft({ requestId: approval.id, decision: 'approved', notes: '' })} aria-label="Aprobar compra" className="rounded-md bg-emerald-600 p-2 text-white"><Check className="h-4 w-4" /></button></>}</div></td></tr>)}</tbody></table>{!approvals.length && <Empty text="Todavia no hay solicitudes de aprobacion." />}</div></div></div>}

    {view === 'portal' && <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="font-bold text-slate-950">Accesos externos</h3><p className="text-sm text-slate-500">Enlaces temporales por proveedor y sucursal.</p></div><div className="flex gap-2"><a href="/supplier-portal" target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700"><ExternalLink className="h-4 w-4" />Abrir portal</a><button onClick={() => setAccessDraft({ supplierId: suppliers.find((item) => item.active)?.id ?? '', label: 'Acceso principal', expiresInDays: 30 })} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white"><KeyRound className="h-4 w-4" />Nuevo acceso</button></div></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{portalAccess.map((access) => <article key={access.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="truncate font-bold text-slate-950">{access.supplierName}</h4><p className="truncate text-xs text-slate-500">{access.label}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${access.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{access.active ? 'Activo' : 'Revocado'}</span></div><div className="mt-4 grid grid-cols-2 gap-3"><Value label="Vence" value={new Date(access.expiresAt).toLocaleDateString('es-AR')} /><Value label="Ultimo uso" value={access.lastUsedAt ? new Date(access.lastUsedAt).toLocaleDateString('es-AR') : 'Sin uso'} /></div>{access.active && <button onClick={() => void revokePortalAccess(access.id)} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-rose-200 text-sm font-bold text-rose-700"><XCircle className="h-4 w-4" />Revocar acceso</button>}</article>)}</div>
        {!portalAccess.length && <Empty text="Todavia no hay accesos externos." />}
      </div>
      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2"><Send className="h-4 w-4 text-emerald-700" /><h3 className="font-bold text-slate-950">Avisos de despacho</h3></div>
        <p className="mt-1 text-sm text-slate-500">Remitos, transporte y fecha estimada informados por cada proveedor.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{shipments.map((shipment) => <article key={shipment.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase text-slate-400">OC {shipment.orderNumber ?? shipment.orderId.slice(0, 8)}</p><h4 className="truncate font-bold text-slate-950">{shipment.productName}</h4><p className="truncate text-sm text-slate-500">{shipment.supplierName}</p></div><ShipmentStatus value={shipment.status} /></div><div className="mt-4 grid grid-cols-2 gap-3"><Value label="Remito" value={shipment.dispatchNumber} /><Value label="Arribo" value={new Date(`${shipment.estimatedArrival}T12:00:00`).toLocaleDateString('es-AR')} /><Value label="Transportista" value={shipment.carrier} /><Value label="Carga" value={`${shipment.packageCount} bultos / ${shipment.palletCount} pallets`} /></div>{shipment.documentAvailable && <button onClick={() => void openShipmentDocument(shipment.id)} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-emerald-200 text-sm font-bold text-emerald-800"><FileText className="h-4 w-4" />{shipment.documentName || 'Abrir remito PDF'}</button>}</article>)}</div>
        {!shipments.length && <Empty text="Todavia no hay despachos anunciados." />}
      </div>
    </div>}

    {view === 'claims' && <SupermarketSupplierClaimsConsole />}

    {editingSupplier && <Modal title={editingSupplier.id ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setEditingSupplier(null)} footer={<><Secondary onClick={() => setEditingSupplier(null)}>Cancelar</Secondary><Primary onClick={() => void saveSupplier()} disabled={!editingSupplier.name.trim()}>Guardar</Primary></>}><div className="grid gap-4 sm:grid-cols-2"><Text label="Nombre" value={editingSupplier.name} set={(value) => setEditingSupplier({ ...editingSupplier, name: value })} wide /><Text label="CUIT" value={editingSupplier.taxId} set={(value) => setEditingSupplier({ ...editingSupplier, taxId: value })} /><Text label="Telefono" value={editingSupplier.phone} set={(value) => setEditingSupplier({ ...editingSupplier, phone: value })} /><Text label="Email" value={editingSupplier.email} set={(value) => setEditingSupplier({ ...editingSupplier, email: value })} /><Text label="Direccion" value={editingSupplier.address} set={(value) => setEditingSupplier({ ...editingSupplier, address: value })} /><NumberField label="Dias de entrega" value={editingSupplier.leadDays} set={(value) => setEditingSupplier({ ...editingSupplier, leadDays: Math.max(0, Number(value)) })} /><NumberField label="Limite de credito" value={editingSupplier.creditLimit} set={(value) => setEditingSupplier({ ...editingSupplier, creditLimit: Math.max(0, Number(value)) })} /></div></Modal>}

    {showDocument && <Modal title="Registrar comprobante" onClose={() => setShowDocument(false)} footer={<><Secondary onClick={() => setShowDocument(false)}>Cancelar</Secondary><Primary onClick={() => void postDocument()} disabled={!documentDraft.supplierId || !documentDraft.documentNumber || documentDraft.amount <= 0}>Registrar</Primary></>}><div className="grid gap-4 sm:grid-cols-2"><Select label="Tipo" value={documentDraft.documentType} set={(value) => setDocumentDraft({ ...documentDraft, documentType: value, purchaseOrderId: value === 'invoice' ? documentDraft.purchaseOrderId : '', dueDate: value === 'invoice' ? documentDraft.dueDate : '' })} options={[['invoice', 'Factura'], ['credit_note', 'Nota de credito'], ['payment', 'Pago']]} /><Select label="Proveedor" value={documentDraft.supplierId} set={(value) => setDocumentDraft({ ...documentDraft, supplierId: value, purchaseOrderId: '' })} options={[['', 'Seleccionar'], ...suppliers.filter((item) => item.active).map((item) => [item.id, item.name])]} /><Text label="Numero" value={documentDraft.documentNumber} set={(value) => setDocumentDraft({ ...documentDraft, documentNumber: value })} /><NumberField label="Importe" value={documentDraft.amount} set={(value) => setDocumentDraft({ ...documentDraft, amount: Math.max(0, Number(value)) })} /><Text label="Fecha de emision" value={documentDraft.issueDate} set={(value) => setDocumentDraft({ ...documentDraft, issueDate: value })} /><Text label="Vencimiento" value={documentDraft.dueDate} set={(value) => setDocumentDraft({ ...documentDraft, dueDate: value })} />{documentDraft.documentType === 'invoice' && <Select label="Orden a conciliar" value={documentDraft.purchaseOrderId} set={(value) => setDocumentDraft({ ...documentDraft, purchaseOrderId: value })} options={[['', 'Sin orden'], ...matchingOrders.map((item) => [item.id, `${item.id.slice(0, 8)} · ${money(item.quantity * item.unitCost)}`])]} />}<Text label="Notas" value={documentDraft.notes} set={(value) => setDocumentDraft({ ...documentDraft, notes: value })} wide /></div></Modal>}
    {editingPolicy && <Modal title="Politica de aprobaciones" onClose={() => setEditingPolicy(null)} footer={<><Secondary onClick={() => setEditingPolicy(null)}>Cancelar</Secondary><Primary onClick={() => void saveApprovalPolicy()} disabled={editingPolicy.secondApprovalThreshold <= editingPolicy.autoApproveLimit}>Guardar politica</Primary></>}><div className="space-y-4"><label className="flex h-11 items-center justify-between rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700">Circuito de aprobacion<input type="checkbox" checked={editingPolicy.enabled} onChange={(event) => setEditingPolicy({ ...editingPolicy, enabled: event.target.checked })} className="h-4 w-4 accent-emerald-600" /></label><div className="grid gap-4 sm:grid-cols-2"><NumberField label="Aprobacion automatica hasta" value={editingPolicy.autoApproveLimit} set={(value) => setEditingPolicy({ ...editingPolicy, autoApproveLimit: Math.max(0, Number(value)) })} /><NumberField label="Doble aprobacion desde" value={editingPolicy.secondApprovalThreshold} set={(value) => setEditingPolicy({ ...editingPolicy, secondApprovalThreshold: Math.max(0, Number(value)) })} /></div><p className="text-xs text-slate-500">Entre ambos limites se requiere un aprobador. El solicitante nunca puede decidir su propia compra.</p></div></Modal>}

    {decisionDraft && <Modal title={decisionDraft.decision === 'approved' ? 'Aprobar compra' : 'Rechazar compra'} onClose={() => setDecisionDraft(null)} footer={<><Secondary onClick={() => setDecisionDraft(null)}>Cancelar</Secondary><Primary onClick={() => void decideApproval()}>{decisionDraft.decision === 'approved' ? 'Confirmar aprobacion' : 'Confirmar rechazo'}</Primary></>}><Text label="Observaciones" value={decisionDraft.notes} set={(value) => setDecisionDraft({ ...decisionDraft, notes: value })} wide /></Modal>}

    {accessDraft && <Modal title="Nuevo acceso externo" onClose={() => setAccessDraft(null)} footer={<><Secondary onClick={() => setAccessDraft(null)}>Cancelar</Secondary><Primary onClick={() => void createPortalAccess()} disabled={!accessDraft.supplierId || !accessDraft.label.trim()}>Crear enlace</Primary></>}><div className="grid gap-4 sm:grid-cols-2"><Select label="Proveedor" value={accessDraft.supplierId} set={(value) => setAccessDraft({ ...accessDraft, supplierId: value })} options={suppliers.filter((item) => item.active).map((item) => [item.id, item.name])} /><Text label="Etiqueta" value={accessDraft.label} set={(value) => setAccessDraft({ ...accessDraft, label: value })} /><NumberField label="Vigencia en dias" value={accessDraft.expiresInDays} set={(value) => setAccessDraft({ ...accessDraft, expiresInDays: Math.max(1, Math.min(365, Number(value))) })} /></div></Modal>}

    {generatedPortalUrl && <Modal title="Enlace externo creado" onClose={() => setGeneratedPortalUrl('')} footer={<Primary onClick={() => setGeneratedPortalUrl('')}>Listo</Primary>}><div className="space-y-3"><label><FieldLabel text="Enlace del proveedor" /><div className="flex gap-2"><input readOnly value={generatedPortalUrl} className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 text-sm" /><button onClick={() => void navigator.clipboard.writeText(generatedPortalUrl)} aria-label="Copiar enlace" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300"><Copy className="h-4 w-4" /></button></div></label><p className="text-xs text-slate-500">Por seguridad, el token no vuelve a mostrarse despues de cerrar esta ventana.</p></div></Modal>}
  </section>;
}

function Metric({ icon: Icon, label, value, detail, warning = false }: { icon: typeof Gauge; label: string; value: string; detail: string; warning?: boolean }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><p className="text-xs font-bold uppercase">{label}</p></div><p className={`mt-2 text-xl font-bold ${warning ? 'text-amber-700' : 'text-slate-950'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Risk({ value }: { value: SupermarketSupplyForecastRecord['risk'] }) { const style = value === 'out_of_stock' ? 'bg-rose-100 text-rose-700' : value === 'critical' ? 'bg-orange-100 text-orange-700' : value === 'attention' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'; return <span className={`rounded-full px-2 py-1 text-xs font-bold ${style}`}>{riskLabel[value]}</span>; }
function Reconciliation({ value }: { value: SupermarketSupplierDocumentRecord['reconciliationStatus'] }) { const matched = value === 'matched'; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${matched ? 'bg-emerald-100 text-emerald-700' : value === 'variance' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{matched && <CheckCircle2 className="h-3 w-3" />}{matched ? 'Conciliado' : value === 'variance' ? 'Con diferencia' : 'Sin conciliar'}</span>; }
function ApprovalStatus({ value }: { value: SupermarketPurchaseApprovalRecord['status'] }) { const style = value === 'approved' || value === 'auto_approved' ? 'bg-emerald-100 text-emerald-700' : value === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'; const label = value === 'approved' ? 'Aprobada' : value === 'auto_approved' ? 'Automatica' : value === 'rejected' ? 'Rechazada' : 'Pendiente'; return <span className={`rounded-full px-2 py-1 text-xs font-bold ${style}`}>{label}</span>; }
function ShipmentStatus({ value }: { value: SupermarketSupplierShipmentRecord['status'] }) { const style = value === 'delivered' ? 'bg-emerald-100 text-emerald-700' : value === 'cancelled' ? 'bg-rose-100 text-rose-700' : value === 'in_transit' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'; const label = value === 'delivered' ? 'Recibido' : value === 'cancelled' ? 'Cancelado' : value === 'in_transit' ? 'En transito' : 'Anunciado'; return <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${style}`}>{label}</span>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="py-10 text-center text-sm text-slate-500">{text}</p>; }
function FieldLabel({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function Text({ label, value, set, wide = false }: { label: string; value: string; set: (value: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><FieldLabel text={label} /><input value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function NumberField({ label, value, set }: { label: string; value: number; set: (value: string) => void }) { return <label><FieldLabel text={label} /><input type="number" min="0" value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function Select({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: string[][] }) { return <label><FieldLabel text={label} /><select value={value} onChange={(event) => set(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{options.map(([id, text]) => <option key={id || 'empty'} value={id}>{text}</option>)}</select></label>; }
function Primary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) { return <button onClick={onClick} disabled={disabled} className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40">{children}</button>; }
function Secondary({ onClick, children }: { onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700">{children}</button>; }
function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: ReactNode; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-950">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div></div></div>; }
