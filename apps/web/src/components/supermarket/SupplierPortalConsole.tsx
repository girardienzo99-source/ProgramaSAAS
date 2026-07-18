'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  KeyRound,
  LogOut,
  PackageCheck,
  RefreshCw,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import type { SupplierDeliveryStatus, SupplierPortalOrder, SupplierPortalSnapshot } from '@/lib/api/supermarketSupplierPortalRepository';

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

async function portalRequest<T>(token: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api/public/v1/supplier-portal', {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'No se pudo completar la operacion.');
  return body as T;
}

export default function SupplierPortalConsole() {
  const [token, setToken] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [portal, setPortal] = useState<SupplierPortalSnapshot | null>(null);
  const [delivery, setDelivery] = useState<{ order: SupplierPortalOrder; status: SupplierDeliveryStatus; promisedDate: string; notes: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = async (accessToken: string) => {
    setLoading(true);
    try {
      const response = await portalRequest<{ portal: SupplierPortalSnapshot }>(accessToken);
      setToken(accessToken); setPortal(response.portal); setFeedback('');
    } catch (error) {
      setPortal(null); setFeedback(error instanceof Error ? error.message : 'El enlace no es valido.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    if (accessToken) void load(accessToken); else setLoading(false);
  }, []);

  const connect = (event: FormEvent) => {
    event.preventDefault();
    const parsed = accessCode.match(/ps_supplier_[A-Za-z0-9_-]{40,80}/)?.[0] ?? '';
    if (!parsed) { setFeedback('El codigo de acceso no es valido.'); return; }
    window.history.replaceState(null, '', `${window.location.pathname}#token=${encodeURIComponent(parsed)}`);
    void load(parsed);
  };

  const confirmDelivery = async () => {
    if (!delivery) return;
    setLoading(true);
    try {
      await portalRequest(token, {
        method: 'POST', headers: { 'Idempotency-Key': `supplier-delivery:${crypto.randomUUID()}` },
        body: JSON.stringify({ orderId: delivery.order.id, status: delivery.status, promisedDate: delivery.status === 'unavailable' ? '' : delivery.promisedDate, notes: delivery.notes }),
      });
      setDelivery(null); await load(token); setFeedback('Entrega actualizada correctamente.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo actualizar la entrega.'); setLoading(false); }
  };

  const disconnect = () => {
    window.history.replaceState(null, '', window.location.pathname);
    setToken(''); setAccessCode(''); setPortal(null); setFeedback('');
  };

  const pending = useMemo(() => portal?.orders.filter((order) => order.status === 'ordered').length ?? 0, [portal]);
  const confirmed = useMemo(() => portal?.orders.filter((order) => order.deliveryStatus === 'confirmed' || order.deliveryStatus === 'rescheduled').length ?? 0, [portal]);

  if (!portal) return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 font-bold text-white">S</div><div><p className="font-bold">SaaS Gestion</p><p className="text-xs text-slate-500">Portal de proveedores</p></div></div></header><div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 py-10"><form onSubmit={connect} className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><KeyRound className="h-5 w-5" /></div><h1 className="mt-4 text-xl font-bold">Acceso de proveedor</h1><label className="mt-5 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Codigo o enlace de acceso</span><input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="off" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600" /></label>{feedback && <p role="alert" className="mt-3 border-l-2 border-rose-500 bg-rose-50 p-3 text-sm text-rose-700">{feedback}</p>}<button disabled={loading || !accessCode.trim()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white disabled:opacity-50">{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Ingresar</button></form></div></main>;

  return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-600 font-bold text-white">S</div><div className="min-w-0"><p className="truncate font-bold">{portal.supplier.name}</p><p className="truncate text-xs text-slate-500">{portal.access.label}</p></div></div><button onClick={disconnect} aria-label="Cerrar acceso" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600"><LogOut className="h-4 w-4" /></button></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-6"><section><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase text-emerald-700">Ordenes autorizadas</p><h1 className="text-2xl font-bold">Entregas del proveedor</h1><p className="text-sm text-slate-500">Acceso vigente hasta {new Date(portal.access.expiresAt).toLocaleDateString('es-AR')}.</p></div><button onClick={() => void load(token)} disabled={loading} aria-label="Actualizar ordenes" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>{feedback && <p role="status" className="mt-4 border-l-2 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-800">{feedback}</p>}</section><section className="grid gap-3 sm:grid-cols-3"><Metric icon={Truck} label="Por entregar" value={String(pending)} /><Metric icon={CheckCircle2} label="Confirmadas" value={String(confirmed)} /><Metric icon={PackageCheck} label="Recibidas" value={String(portal.orders.filter((order) => order.status === 'received').length)} /></section><section><h2 className="mb-3 font-bold">Ordenes de compra</h2><div className="grid gap-4 lg:grid-cols-2">{portal.orders.map((order) => <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">OC {order.orderNumber ?? order.id.slice(0, 8)}</p><h3 className="mt-1 font-bold">{order.productName}</h3></div><OrderStatus order={order} /></div><div className="mt-4 grid grid-cols-3 gap-3"><Value label="Cantidad" value={String(order.quantity)} /><Value label="Costo" value={money(order.unitCost)} /><Value label="Total" value={money(order.total)} /></div><div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600"><CalendarClock className="h-4 w-4" />Entrega solicitada: <strong>{order.expectedDate ? new Date(`${order.expectedDate}T12:00:00`).toLocaleDateString('es-AR') : 'Sin fecha'}</strong></div>{order.deliveryStatus && <div className="mt-3 bg-slate-50 p-3 text-sm"><p className="font-bold">{order.deliveryStatus === 'confirmed' ? 'Entrega confirmada' : order.deliveryStatus === 'rescheduled' ? 'Entrega reprogramada' : 'Producto no disponible'}</p>{order.promisedDate && <p className="text-slate-600">Fecha comprometida: {new Date(`${order.promisedDate}T12:00:00`).toLocaleDateString('es-AR')}</p>}{order.notes && <p className="mt-1 text-slate-600">{order.notes}</p>}</div>}{order.status === 'ordered' && <button onClick={() => setDelivery({ order, status: order.deliveryStatus ?? 'confirmed', promisedDate: order.promisedDate || order.expectedDate || today(), notes: order.notes })} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white"><Truck className="h-4 w-4" />Actualizar entrega</button>}</article>)}</div>{!portal.orders.length && <p className="rounded-lg border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">No hay ordenes disponibles.</p>}</section></div>{delivery && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Actualizar entrega"><div className="w-full max-w-lg rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold">Actualizar entrega</h2><p className="text-xs text-slate-500">{delivery.order.productName}</p></div><button onClick={() => setDelivery(null)} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><label><FieldLabel text="Estado" /><select value={delivery.status} onChange={(event) => setDelivery({ ...delivery, status: event.target.value as SupplierDeliveryStatus })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="confirmed">Confirmada</option><option value="rescheduled">Reprogramada</option><option value="unavailable">No disponible</option></select></label>{delivery.status !== 'unavailable' && <label><FieldLabel text="Fecha comprometida" /><input type="date" min={today()} value={delivery.promisedDate} onChange={(event) => setDelivery({ ...delivery, promisedDate: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>}<label><FieldLabel text="Observaciones" /><textarea rows={3} value={delivery.notes} onChange={(event) => setDelivery({ ...delivery, notes: event.target.value })} className="w-full rounded-md border border-slate-300 p-3 text-sm" /></label></div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={() => setDelivery(null)} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancelar</button><button onClick={() => void confirmDelivery()} disabled={loading || (delivery.status !== 'unavailable' && !delivery.promisedDate)} className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">Confirmar</button></div></div></div>}</main>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><p className="text-xs font-bold uppercase">{label}</p></div><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function FieldLabel({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function OrderStatus({ order }: { order: SupplierPortalOrder }) { if (order.status === 'received') return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"><PackageCheck className="h-3 w-3" />Recibida</span>; if (order.deliveryStatus === 'unavailable') return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700"><XCircle className="h-3 w-3" />No disponible</span>; if (order.deliveryStatus) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Confirmada</span>; return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700"><Clock3 className="h-3 w-3" />Pendiente</span>; }
