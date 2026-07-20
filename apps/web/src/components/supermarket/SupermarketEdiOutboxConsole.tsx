'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, RadioTower, RefreshCw, RotateCcw, Send, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/client/apiFetch';
import type { SupermarketEdiMessageRecord, SupermarketEdiStatus } from '@/lib/api/supermarketSupplyRepository';

const STATUS_OPTIONS: Array<{ value: '' | SupermarketEdiStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'processing', label: 'Procesando' },
  { value: 'failed', label: 'Fallidos' },
  { value: 'dead_letter', label: 'Bloqueados' },
  { value: 'sent', label: 'Enviados' },
];

interface EdiSummary {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  deadLetter: number;
  readyToRetry: number;
}

const emptySummary: EdiSummary = { total: 0, pending: 0, processing: 0, sent: 0, failed: 0, deadLetter: 0, readyToRetry: 0 };
const typeLabel = { DESADV: 'Aviso despacho', RECADV: 'Recepcion', COMDIS: 'Reclamo' };

export default function SupermarketEdiOutboxConsole() {
  const [items, setItems] = useState<SupermarketEdiMessageRecord[]>([]);
  const [summary, setSummary] = useState<EdiSummary>(emptySummary);
  const [status, setStatus] = useState<'' | SupermarketEdiStatus>('');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : '';
      const response = await apiFetch<{ items: SupermarketEdiMessageRecord[]; summary: EdiSummary }>(`/api/rubros/supermarket/edi-outbox${query}`);
      setItems(response.items);
      setSummary(response.summary);
      setFeedback('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo consultar la cola EDI.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return !term ? items : items.filter((item) =>
      `${item.eventType} ${item.status} ${item.sourceLabel} ${item.lastError}`.toLowerCase().includes(term));
  }, [items, search]);

  const retry = async (message: SupermarketEdiMessageRecord) => {
    setLoading(true);
    try {
      await apiFetch('/api/rubros/supermarket/edi-outbox', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'retry', messageId: message.id, reason: `Reintento manual desde consola ${new Date().toISOString()}` }),
      });
      await load();
      setFeedback('Mensaje EDI reprogramado para envio.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo reintentar el mensaje.');
      setLoading(false);
    }
  };

  return <section className="space-y-5">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div>
        <div className="flex items-center gap-2"><RadioTower className="h-5 w-5 text-emerald-700" /><h3 className="font-bold text-slate-950">Mensajeria EDI</h3></div>
        <p className="mt-1 text-sm text-slate-500">DESADV, RECADV y COMDIS con reintentos, alertas y trazabilidad por sucursal.</p>
      </div>
      <button onClick={() => void load()} disabled={loading} aria-label="Actualizar EDI" title="Actualizar EDI" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={Clock3} label="Pendientes" value={summary.pending} tone={summary.pending ? 'amber' : 'slate'} />
      <Metric icon={AlertCircle} label="Listos retry" value={summary.readyToRetry} tone={summary.readyToRetry ? 'amber' : 'slate'} />
      <Metric icon={XCircle} label="Fallidos" value={summary.failed + summary.deadLetter} tone={summary.failed || summary.deadLetter ? 'rose' : 'slate'} />
      <Metric icon={Send} label="Procesando" value={summary.processing} tone="blue" />
      <Metric icon={CheckCircle2} label="Enviados" value={summary.sent} tone="emerald" />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tipo, origen, estado o error" className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm" />
      <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filtrar estado EDI" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
        {STATUS_OPTIONS.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
      </select>
    </div>
    {feedback && <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{feedback}</p>}

    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Mensaje</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Reintentos</th><th className="px-4 py-3">Proximo intento</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Error</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map((item) => <tr key={item.id} className={item.status === 'dead_letter' ? 'bg-rose-50/50' : item.status === 'failed' ? 'bg-amber-50/50' : ''}>
            <td className="px-4 py-3"><p className="font-bold text-slate-950">{typeLabel[item.eventType]}</p><p className="text-xs text-slate-500">{item.standard} · {item.id.slice(0, 8)}</p></td>
            <td className="px-4 py-3"><p className="font-semibold text-slate-900">{item.sourceLabel}</p><p className="text-xs text-slate-500">{item.sourceType}</p></td>
            <td className="px-4 py-3"><EdiStatus value={item.status} /></td>
            <td className="px-4 py-3 text-right font-bold">{item.retryCount}</td>
            <td className="px-4 py-3 text-slate-600">{formatDateTime(item.nextRetryAt || item.availableAt)}</td>
            <td className="px-4 py-3 text-xs text-slate-500">{item.deliveredReference || item.destinationEndpoint || '-'}</td>
            <td className="max-w-[260px] truncate px-4 py-3 text-xs text-slate-500" title={item.lastError}>{item.lastError || '-'}</td>
            <td className="px-4 py-3 text-right">{item.status !== 'sent' && <button onClick={() => void retry(item)} disabled={loading} className="inline-flex h-8 items-center gap-2 rounded-md border border-emerald-200 px-3 text-xs font-bold text-emerald-800 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Reintentar</button>}</td>
          </tr>)}
        </tbody>
      </table>
      {!visible.length && <p className="py-12 text-center text-sm text-slate-500">No hay mensajes EDI para este filtro.</p>}
    </div>
  </section>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof AlertCircle; label: string; value: number; tone: 'slate' | 'amber' | 'rose' | 'emerald' | 'blue' }) {
  const colors = { slate: 'text-slate-600', amber: 'text-amber-700', rose: 'text-rose-700', emerald: 'text-emerald-700', blue: 'text-blue-700' };
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className={`flex items-center gap-2 ${colors[tone]}`}><Icon className="h-4 w-4" /><p className="text-xs font-bold uppercase">{label}</p></div><p className="mt-2 text-xl font-bold text-slate-950">{value}</p></div>;
}

function EdiStatus({ value }: { value: SupermarketEdiStatus }) {
  const style = value === 'sent' ? 'bg-emerald-100 text-emerald-700' : value === 'dead_letter' ? 'bg-rose-100 text-rose-700' : value === 'failed' ? 'bg-amber-100 text-amber-700' : value === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700';
  const label = value === 'sent' ? 'Enviado' : value === 'dead_letter' ? 'Bloqueado' : value === 'failed' ? 'Fallido' : value === 'processing' ? 'Procesando' : 'Pendiente';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${style}`}>{label}</span>;
}

function formatDateTime(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}
