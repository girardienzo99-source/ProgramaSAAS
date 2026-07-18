'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  KeyRound,
  LogOut,
  PackageCheck,
  RefreshCw,
  Send,
  Truck,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type {
  SupplierDeliveryStatus,
  SupplierPortalOrder,
  SupplierPortalClaim,
  SupplierPortalShipment,
  SupplierPortalSnapshot,
} from '@/lib/api/supermarketSupplierPortalRepository';

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

interface ShipmentDraft {
  order: SupplierPortalOrder;
  dispatchNumber: string;
  carrier: string;
  trackingNumber: string;
  shippedOn: string;
  estimatedArrival: string;
  packageCount: number;
  palletCount: number;
  notes: string;
  document: File | null;
}

interface ClaimResponseDraft {
  claim: SupplierPortalClaim;
  status: 'acknowledged' | 'disputed';
  notes: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'No se pudo completar la operacion.');
  return body as T;
}

async function portalJsonRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  return parseResponse<T>(await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  }));
}

export default function SupplierPortalConsole() {
  const [token, setToken] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [portal, setPortal] = useState<SupplierPortalSnapshot | null>(null);
  const [delivery, setDelivery] = useState<{ order: SupplierPortalOrder; status: SupplierDeliveryStatus; promisedDate: string; notes: string } | null>(null);
  const [shipment, setShipment] = useState<ShipmentDraft | null>(null);
  const [claimResponse, setClaimResponse] = useState<ClaimResponseDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success');

  const load = async (accessToken: string) => {
    setLoading(true);
    try {
      const response = await portalJsonRequest<{ portal: SupplierPortalSnapshot }>(accessToken, '/api/public/v1/supplier-portal');
      setToken(accessToken);
      setPortal(response.portal);
      setFeedback('');
    } catch (error) {
      setPortal(null);
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : 'El enlace no es valido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    if (accessToken) void load(accessToken);
    else setLoading(false);
  }, []);

  const connect = (event: FormEvent) => {
    event.preventDefault();
    const parsed = accessCode.match(/ps_supplier_[A-Za-z0-9_-]{40,80}/)?.[0] ?? '';
    if (!parsed) {
      setFeedbackTone('error');
      setFeedback('El codigo de acceso no es valido.');
      return;
    }
    window.history.replaceState(null, '', `${window.location.pathname}#token=${encodeURIComponent(parsed)}`);
    void load(parsed);
  };

  const confirmDelivery = async () => {
    if (!delivery) return;
    setLoading(true);
    try {
      await portalJsonRequest(token, '/api/public/v1/supplier-portal', {
        method: 'POST',
        headers: { 'Idempotency-Key': `supplier-delivery:${crypto.randomUUID()}` },
        body: JSON.stringify({
          orderId: delivery.order.id,
          status: delivery.status,
          promisedDate: delivery.status === 'unavailable' ? '' : delivery.promisedDate,
          notes: delivery.notes,
        }),
      });
      setDelivery(null);
      await load(token);
      setFeedbackTone('success');
      setFeedback('Entrega actualizada correctamente.');
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : 'No se pudo actualizar la entrega.');
      setLoading(false);
    }
  };

  const saveShipment = async () => {
    if (!shipment) return;
    setLoading(true);
    try {
      const response = await portalJsonRequest<{ item: { shipmentId: string } }>(token, '/api/public/v1/supplier-portal/shipments', {
        method: 'POST',
        headers: { 'Idempotency-Key': `supplier-shipment:${crypto.randomUUID()}` },
        body: JSON.stringify({
          orderId: shipment.order.id,
          dispatchNumber: shipment.dispatchNumber,
          carrier: shipment.carrier,
          trackingNumber: shipment.trackingNumber,
          shippedOn: shipment.shippedOn,
          estimatedArrival: shipment.estimatedArrival,
          packageCount: shipment.packageCount,
          palletCount: shipment.palletCount,
          notes: shipment.notes,
        }),
      });
      if (shipment.document) {
        const form = new FormData();
        form.set('shipmentId', response.item.shipmentId);
        form.set('document', shipment.document);
        await parseResponse(await fetch('/api/public/v1/supplier-portal/documents', {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
        }));
      }
      setShipment(null);
      await load(token);
      setFeedbackTone('success');
      setFeedback('Aviso de despacho registrado.');
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : 'No se pudo registrar el despacho.');
      setLoading(false);
    }
  };

  const respondClaim = async () => {
    if (!claimResponse) return;
    setLoading(true);
    try {
      await portalJsonRequest(token, '/api/public/v1/supplier-portal/claims', {
        method: 'PATCH',
        headers: { 'Idempotency-Key': `supplier-claim:${crypto.randomUUID()}` },
        body: JSON.stringify({
          claimId: claimResponse.claim.id,
          status: claimResponse.status,
          notes: claimResponse.notes,
        }),
      });
      setClaimResponse(null);
      await load(token);
      setFeedbackTone('success');
      setFeedback('Respuesta del reclamo enviada.');
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : 'No se pudo responder el reclamo.');
      setLoading(false);
    }
  };

  const openDocument = async (item: SupplierPortalShipment) => {
    try {
      const response = await portalJsonRequest<{ item: { url: string } }>(token, `/api/public/v1/supplier-portal/shipments?shipmentId=${encodeURIComponent(item.id)}`);
      window.open(response.item.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : 'No se pudo abrir el remito.');
    }
  };

  const disconnect = () => {
    window.history.replaceState(null, '', window.location.pathname);
    setToken('');
    setAccessCode('');
    setPortal(null);
    setFeedback('');
  };

  const pending = useMemo(() => portal?.orders.filter((order) => order.status !== 'received').length ?? 0, [portal]);
  const confirmed = useMemo(() => portal?.orders.filter((order) => order.deliveryStatus === 'confirmed' || order.deliveryStatus === 'rescheduled').length ?? 0, [portal]);
  const announced = useMemo(() => portal?.orders.filter((order) => order.shipment).length ?? 0, [portal]);
  const activeClaims = useMemo(() => portal?.claims.filter((claim) => claim.status !== 'resolved').length ?? 0, [portal]);

  if (!portal) {
    return <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4"><Brand /></div></header>
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 py-10">
        <form onSubmit={connect} className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><KeyRound className="h-5 w-5" /></div>
          <h1 className="mt-4 text-xl font-bold">Acceso de proveedor</h1>
          <label className="mt-5 block"><FieldLabel text="Codigo o enlace de acceso" /><input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="off" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600" /></label>
          {feedback && <Feedback tone="error" text={feedback} />}
          <button disabled={loading || !accessCode.trim()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white disabled:opacity-50">{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Ingresar</button>
        </form>
      </div>
    </main>;
  }

  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-600 font-bold text-white">S</div><div className="min-w-0"><p className="truncate font-bold">{portal.supplier.name}</p><p className="truncate text-xs text-slate-500">{portal.access.label}</p></div></div><button onClick={disconnect} aria-label="Cerrar acceso" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600"><LogOut className="h-4 w-4" /></button></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <section><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase text-emerald-700">Ordenes autorizadas</p><h1 className="text-2xl font-bold">Entregas del proveedor</h1><p className="text-sm text-slate-500">Acceso vigente hasta {new Date(portal.access.expiresAt).toLocaleDateString('es-AR')}.</p></div><button onClick={() => void load(token)} disabled={loading} aria-label="Actualizar ordenes" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>{feedback && <Feedback tone={feedbackTone} text={feedback} />}</section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={Truck} label="Por entregar" value={String(pending)} /><Metric icon={CheckCircle2} label="Confirmadas" value={String(confirmed)} /><Metric icon={Send} label="Despachos" value={String(announced)} /><Metric icon={PackageCheck} label="Recibidas" value={String(portal.orders.filter((order) => order.status === 'received').length)} /><Metric icon={AlertTriangle} label="Reclamos activos" value={String(activeClaims)} /></section>
      <section><div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-700" /><h2 className="font-bold">Reclamos y diferencias</h2></div><div className="grid gap-4 lg:grid-cols-2">{portal.claims.map((claim) => <ClaimCard key={claim.id} claim={claim} onRespond={(status) => setClaimResponse({ claim, status, notes: '' })} />)}</div>{!portal.claims.length && <p className="border border-slate-200 bg-white py-10 text-center text-sm text-slate-500">No hay diferencias de recepcion registradas.</p>}</section>
      <section><h2 className="mb-3 font-bold">Ordenes de compra</h2><div className="grid gap-4 lg:grid-cols-2">{portal.orders.map((order) => <OrderCard key={order.id} order={order} onDelivery={() => setDelivery({ order, status: order.deliveryStatus ?? 'confirmed', promisedDate: order.promisedDate || order.expectedDate || today(), notes: order.notes })} onShipment={() => setShipment(shipmentDraft(order))} onDocument={openDocument} />)}</div>{!portal.orders.length && <p className="rounded-lg border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">No hay ordenes disponibles.</p>}</section>
    </div>
    {delivery && <DeliveryModal delivery={delivery} setDelivery={setDelivery} loading={loading} onConfirm={confirmDelivery} />}
    {shipment && <ShipmentModal shipment={shipment} setShipment={setShipment} loading={loading} onSave={saveShipment} />}
    {claimResponse && <ClaimResponseModal draft={claimResponse} setDraft={setClaimResponse} loading={loading} onConfirm={respondClaim} />}
  </main>;
}

function ClaimCard({ claim, onRespond }: { claim: SupplierPortalClaim; onRespond: (status: 'acknowledged' | 'disputed') => void }) {
  return <article className={`rounded-lg border bg-white p-5 shadow-sm ${claim.priority === 'urgent' && claim.status !== 'resolved' ? 'border-rose-200' : 'border-slate-200'}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">Reclamo #{claim.claimNumber} · OC {claim.orderNumber ?? claim.orderId.slice(0, 8)}</p><h3 className="mt-1 font-bold text-slate-950">{claim.subject}</h3><p className="text-sm text-slate-500">{claim.productName}</p></div><ClaimStatus value={claim.status} /></div>
    <p className="mt-3 text-sm text-slate-600">{claim.description}</p>
    <div className="mt-4 grid grid-cols-2 gap-3"><Value label="Cantidad reclamada" value={String(claim.claimedQuantity)} /><Value label="Responder antes de" value={new Date(`${claim.responseDueOn}T12:00:00`).toLocaleDateString('es-AR')} /></div>
    {claim.resolutionNotes && <p className="mt-3 border-l-2 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-900">{claim.resolutionNotes}</p>}
    {claim.status !== 'resolved' && <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => onRespond('acknowledged')} disabled={claim.status === 'acknowledged'} className="h-10 rounded-md border border-emerald-300 text-sm font-bold text-emerald-800 disabled:opacity-40">Acusar recibo</button><button onClick={() => onRespond('disputed')} disabled={claim.status === 'disputed'} className="h-10 rounded-md border border-rose-300 text-sm font-bold text-rose-700 disabled:opacity-40">Objetar diferencia</button></div>}
  </article>;
}

function shipmentDraft(order: SupplierPortalOrder): ShipmentDraft {
  const current = order.shipment;
  return {
    order,
    dispatchNumber: current?.dispatchNumber ?? '',
    carrier: current?.carrier ?? '',
    trackingNumber: current?.trackingNumber ?? '',
    shippedOn: current?.shippedOn ?? today(),
    estimatedArrival: current?.estimatedArrival ?? order.promisedDate ?? order.expectedDate ?? today(),
    packageCount: current?.packageCount ?? 1,
    palletCount: current?.palletCount ?? 0,
    notes: current?.notes ?? '',
    document: null,
  };
}

function OrderCard({ order, onDelivery, onShipment, onDocument }: { order: SupplierPortalOrder; onDelivery: () => void; onShipment: () => void; onDocument: (shipment: SupplierPortalShipment) => void }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">OC {order.orderNumber ?? order.id.slice(0, 8)}</p><h3 className="mt-1 font-bold">{order.productName}</h3></div><OrderStatus order={order} /></div>
    <div className="mt-4 grid grid-cols-3 gap-3"><Value label="Ordenado" value={String(order.quantity)} /><Value label="Recibido" value={String(order.receivedQuantity)} /><Value label="Pendiente" value={String(order.remainingQuantity)} /></div>
    {order.status === 'partially_received' && <div className="mt-3"><div className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>Avance de recepcion</span><span>{Math.round((order.receivedQuantity / order.quantity) * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (order.receivedQuantity / order.quantity) * 100)}%` }} /></div></div>}
    <p className="mt-3 text-xs font-semibold text-slate-600">Costo {money(order.unitCost)} · Total {money(order.total)}</p>
    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600"><CalendarClock className="h-4 w-4" />Entrega solicitada: <strong>{order.expectedDate ? new Date(`${order.expectedDate}T12:00:00`).toLocaleDateString('es-AR') : 'Sin fecha'}</strong></div>
    {order.deliveryStatus && <div className="mt-3 bg-slate-50 p-3 text-sm"><p className="font-bold">{order.deliveryStatus === 'confirmed' ? 'Entrega confirmada' : order.deliveryStatus === 'rescheduled' ? 'Entrega reprogramada' : 'Producto no disponible'}</p>{order.promisedDate && <p className="text-slate-600">Fecha comprometida: {new Date(`${order.promisedDate}T12:00:00`).toLocaleDateString('es-AR')}</p>}{order.notes && <p className="mt-1 text-slate-600">{order.notes}</p>}</div>}
    {order.shipment && <div className="mt-3 border border-emerald-200 bg-emerald-50 p-3 text-sm"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-emerald-900">Remito {order.shipment.dispatchNumber}</p><p className="text-emerald-800">{order.shipment.carrier}{order.shipment.trackingNumber ? ` - ${order.shipment.trackingNumber}` : ''}</p></div><Send className="h-4 w-4 shrink-0 text-emerald-700" /></div><p className="mt-2 text-emerald-800">Arribo: {new Date(`${order.shipment.estimatedArrival}T12:00:00`).toLocaleDateString('es-AR')} - {order.shipment.packageCount} bultos - {order.shipment.palletCount} pallets</p>{order.shipment.documentAvailable && <button onClick={() => onDocument(order.shipment!)} className="mt-2 inline-flex items-center gap-2 font-bold text-emerald-800"><FileText className="h-4 w-4" />{order.shipment.documentName || 'Abrir PDF'}</button>}</div>}
    {order.status === 'ordered' && <div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={onDelivery} className="flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 text-sm font-bold text-emerald-800"><Truck className="h-4 w-4" />Actualizar entrega</button><button onClick={onShipment} className="flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white"><Send className="h-4 w-4" />{order.shipment ? 'Editar despacho' : 'Informar despacho'}</button></div>}
  </article>;
}

function DeliveryModal({ delivery, setDelivery, loading, onConfirm }: { delivery: { order: SupplierPortalOrder; status: SupplierDeliveryStatus; promisedDate: string; notes: string }; setDelivery: (value: typeof delivery | null) => void; loading: boolean; onConfirm: () => void }) {
  return <Modal title="Actualizar entrega" subtitle={delivery.order.productName} onClose={() => setDelivery(null)} footer={<><Secondary onClick={() => setDelivery(null)}>Cancelar</Secondary><Primary onClick={onConfirm} disabled={loading || (delivery.status !== 'unavailable' && !delivery.promisedDate)}>Confirmar</Primary></>}><div className="space-y-4"><label><FieldLabel text="Estado" /><select value={delivery.status} onChange={(event) => setDelivery({ ...delivery, status: event.target.value as SupplierDeliveryStatus })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="confirmed">Confirmada</option><option value="rescheduled">Reprogramada</option><option value="unavailable">No disponible</option></select></label>{delivery.status !== 'unavailable' && <label><FieldLabel text="Fecha comprometida" /><input type="date" min={today()} value={delivery.promisedDate} onChange={(event) => setDelivery({ ...delivery, promisedDate: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>}<label><FieldLabel text="Observaciones" /><textarea rows={3} value={delivery.notes} onChange={(event) => setDelivery({ ...delivery, notes: event.target.value })} className="w-full rounded-md border border-slate-300 p-3 text-sm" /></label></div></Modal>;
}

function ShipmentModal({ shipment, setShipment, loading, onSave }: { shipment: ShipmentDraft; setShipment: (value: ShipmentDraft | null) => void; loading: boolean; onSave: () => void }) {
  const valid = shipment.dispatchNumber.trim() && shipment.carrier.trim() && shipment.shippedOn && shipment.estimatedArrival && shipment.estimatedArrival >= shipment.shippedOn;
  return <Modal title="Aviso de despacho" subtitle={shipment.order.productName} onClose={() => setShipment(null)} footer={<><Secondary onClick={() => setShipment(null)}>Cancelar</Secondary><Primary onClick={onSave} disabled={loading || !valid}>Registrar despacho</Primary></>}><div className="grid gap-4 sm:grid-cols-2"><TextField label="Numero de remito" value={shipment.dispatchNumber} set={(value) => setShipment({ ...shipment, dispatchNumber: value })} /><TextField label="Transportista" value={shipment.carrier} set={(value) => setShipment({ ...shipment, carrier: value })} /><TextField label="Seguimiento" value={shipment.trackingNumber} set={(value) => setShipment({ ...shipment, trackingNumber: value })} /><NumberField label="Bultos" value={shipment.packageCount} max={100000} set={(value) => setShipment({ ...shipment, packageCount: value })} /><NumberField label="Pallets" value={shipment.palletCount} max={10000} set={(value) => setShipment({ ...shipment, palletCount: value })} /><DateField label="Fecha de despacho" value={shipment.shippedOn} set={(value) => setShipment({ ...shipment, shippedOn: value })} /><DateField label="Arribo estimado" value={shipment.estimatedArrival} min={shipment.shippedOn} set={(value) => setShipment({ ...shipment, estimatedArrival: value })} /><label className="sm:col-span-2"><FieldLabel text="Remito PDF (maximo 10 MB)" /><span className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 text-sm text-slate-600"><Upload className="h-4 w-4" />{shipment.document?.name ?? (shipment.order.shipment?.documentName || 'Seleccionar archivo')}<input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => setShipment({ ...shipment, document: event.target.files?.[0] ?? null })} /></span></label><label className="sm:col-span-2"><FieldLabel text="Observaciones" /><textarea rows={3} value={shipment.notes} onChange={(event) => setShipment({ ...shipment, notes: event.target.value })} className="w-full rounded-md border border-slate-300 p-3 text-sm" /></label></div></Modal>;
}

function ClaimResponseModal({ draft, setDraft, loading, onConfirm }: { draft: ClaimResponseDraft; setDraft: (value: ClaimResponseDraft | null) => void; loading: boolean; onConfirm: () => void }) {
  return <Modal title={draft.status === 'disputed' ? 'Objetar diferencia' : 'Acusar recibo'} subtitle={`Reclamo #${draft.claim.claimNumber} - ${draft.claim.productName}`} onClose={() => setDraft(null)} footer={<><Secondary onClick={() => setDraft(null)}>Cancelar</Secondary><Primary onClick={onConfirm} disabled={loading || (draft.status === 'disputed' && !draft.notes.trim())}>Enviar respuesta</Primary></>}><div className="space-y-4"><label><FieldLabel text="Respuesta" /><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ClaimResponseDraft['status'] })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="acknowledged">Acusar recibo</option><option value="disputed">Objetar diferencia</option></select></label><label><FieldLabel text="Observaciones" /><textarea rows={4} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Informe reposicion, nota de credito o motivo de la objecion." className="w-full rounded-md border border-slate-300 p-3 text-sm" /></label></div></Modal>;
}

function Brand() { return <><div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 font-bold text-white">S</div><div><p className="font-bold">SaaS Gestion</p><p className="text-xs text-slate-500">Portal de proveedores</p></div></>; }
function Feedback({ tone, text }: { tone: 'success' | 'error'; text: string }) { return <p role={tone === 'error' ? 'alert' : 'status'} className={`mt-4 border-l-2 p-3 text-sm ${tone === 'error' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-emerald-500 bg-emerald-50 text-emerald-800'}`}>{text}</p>; }
function Metric({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><p className="text-xs font-bold uppercase">{label}</p></div><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function FieldLabel({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function TextField({ label, value, set }: { label: string; value: string; set: (value: string) => void }) { return <label><FieldLabel text={label} /><input value={value} onChange={(event) => set(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function NumberField({ label, value, max, set }: { label: string; value: number; max: number; set: (value: number) => void }) { return <label><FieldLabel text={label} /><input type="number" min="0" max={max} step="1" value={value} onChange={(event) => set(Math.max(0, Math.min(max, Number(event.target.value))))} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function DateField({ label, value, min, set }: { label: string; value: string; min?: string; set: (value: string) => void }) { return <label><FieldLabel text={label} /><input type="date" min={min} value={value} onChange={(event) => set(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>; }
function Primary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) { return <button onClick={onClick} disabled={disabled} className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">{children}</button>; }
function Secondary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-bold">{children}</button>; }
function Modal({ title, subtitle, onClose, footer, children }: { title: string; subtitle: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div><button onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div></div></div>; }
function OrderStatus({ order }: { order: SupplierPortalOrder }) { if (order.status === 'received') return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"><PackageCheck className="h-3 w-3" />Recibida</span>; if (order.status === 'partially_received') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800"><PackageCheck className="h-3 w-3" />Recepcion parcial</span>; if (order.deliveryStatus === 'unavailable') return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700"><XCircle className="h-3 w-3" />No disponible</span>; if (order.shipment) return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700"><Send className="h-3 w-3" />Despachada</span>; if (order.deliveryStatus) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Confirmada</span>; return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700"><Clock3 className="h-3 w-3" />Pendiente</span>; }
function ClaimStatus({ value }: { value: SupplierPortalClaim['status'] }) { const style = value === 'resolved' ? 'bg-emerald-100 text-emerald-700' : value === 'disputed' ? 'bg-rose-100 text-rose-700' : value === 'acknowledged' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'; const label = value === 'resolved' ? 'Resuelto' : value === 'disputed' ? 'Objetado' : value === 'acknowledged' ? 'Acusado' : 'Abierto'; return <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${style}`}>{label}</span>; }
