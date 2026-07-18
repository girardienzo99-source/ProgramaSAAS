'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, MessageSquareWarning, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { apiFetch } from '@/lib/client/apiFetch';
import type { SupermarketSupplierClaimRecord, SupplierClaimStatus } from '@/lib/api/supermarketSupplierPortalRepository';

const STATUS_OPTIONS: Array<{ value: '' | SupplierClaimStatus; label: string }> = [
  { value: '', label: 'Todos' }, { value: 'open', label: 'Abiertos' },
  { value: 'acknowledged', label: 'Acusados' }, { value: 'disputed', label: 'Objetados' },
  { value: 'resolved', label: 'Resueltos' },
];

const TYPE_LABELS: Record<SupermarketSupplierClaimRecord['claimType'], string> = {
  partial_delivery: 'Entrega parcial', rejected_items: 'Mercaderia rechazada',
  document_mismatch: 'Diferencia documental', missing_asn: 'Sin aviso de despacho',
};

interface DecisionDraft {
  claim: SupermarketSupplierClaimRecord;
  status: 'acknowledged' | 'resolved';
  notes: string;
}

export default function SupermarketSupplierClaimsConsole() {
  const [claims, setClaims] = useState<SupermarketSupplierClaimRecord[]>([]);
  const [status, setStatus] = useState<'' | SupplierClaimStatus>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [decision, setDecision] = useState<DecisionDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : '';
      const response = await apiFetch<{ items: SupermarketSupplierClaimRecord[] }>(`/api/rubros/supermarket/supplier-claims${query}`);
      setClaims(response.items);
      setFeedback('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudieron cargar los reclamos.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return !term ? claims : claims.filter((item) =>
      `${item.claimNumber} ${item.supplierName} ${item.productName} ${item.subject}`.toLowerCase().includes(term));
  }, [claims, search]);
  const today = new Date().toISOString().slice(0, 10);
  const open = claims.filter((item) => item.status !== 'resolved').length;
  const overdue = claims.filter((item) => item.status !== 'resolved' && item.responseDueOn < today).length;
  const disputed = claims.filter((item) => item.status === 'disputed').length;
  const resolved = claims.filter((item) => item.status === 'resolved').length;

  const submitDecision = async () => {
    if (!decision) return;
    setLoading(true);
    try {
      await apiFetch('/api/rubros/supermarket/supplier-claims', {
        method: 'PATCH',
        headers: { 'Idempotency-Key': `supplier-claim:${crypto.randomUUID()}` },
        body: JSON.stringify({ claimId: decision.claim.id, status: decision.status, notes: decision.notes }),
      });
      const message = decision.status === 'resolved' ? 'Reclamo resuelto.' : 'Reclamo acusado.';
      setDecision(null);
      await load();
      setFeedback(message);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo actualizar el reclamo.');
      setLoading(false);
    }
  };

  return <section className="space-y-5">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div><div className="flex items-center gap-2"><MessageSquareWarning className="h-5 w-5 text-emerald-700" /><h3 className="font-bold text-slate-950">Reclamos a proveedores</h3></div><p className="mt-1 text-sm text-slate-500">Diferencias detectadas en recepciones, plazos de respuesta y resolucion auditada.</p></div>
      <button onClick={() => void load()} disabled={loading} aria-label="Actualizar reclamos" title="Actualizar reclamos" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={ShieldAlert} label="En gestion" value={open} tone="amber" />
      <Metric icon={Clock3} label="Vencidos" value={overdue} tone={overdue ? 'rose' : 'slate'} />
      <Metric icon={AlertTriangle} label="Objetados" value={disputed} tone={disputed ? 'rose' : 'slate'} />
      <Metric icon={CheckCircle2} label="Resueltos" value={resolved} tone="emerald" />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar reclamo, proveedor o producto" className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm" />
      <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filtrar por estado" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">{STATUS_OPTIONS.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}</select>
    </div>
    {feedback && <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{feedback}</p>}

    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full min-w-[1060px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Reclamo</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Diferencia</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3">Respuesta</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"></th></tr></thead>
        <tbody className="divide-y divide-slate-100">{visible.map((claim) => <tr key={claim.id} className={claim.priority === 'urgent' && claim.status !== 'resolved' ? 'bg-rose-50/40' : ''}>
          <td className="px-4 py-3"><p className="font-mono font-bold">#{claim.claimNumber}</p><p className="text-xs text-slate-500">OC {claim.orderNumber ?? claim.orderId.slice(0, 8)} / REC {claim.receiptNumber}</p></td>
          <td className="px-4 py-3 font-bold text-slate-950">{claim.supplierName}</td>
          <td className="px-4 py-3"><p className="font-semibold text-slate-900">{claim.productName}</p><p className="text-xs text-slate-500">{claim.subject}</p></td>
          <td className="px-4 py-3">{TYPE_LABELS[claim.claimType]}</td>
          <td className="px-4 py-3 text-right font-bold">{claim.claimedQuantity}</td>
          <td className={`px-4 py-3 font-semibold ${claim.status !== 'resolved' && claim.responseDueOn < today ? 'text-rose-700' : 'text-slate-700'}`}>{new Date(`${claim.responseDueOn}T12:00:00`).toLocaleDateString('es-AR')}</td>
          <td className="px-4 py-3"><ClaimStatus value={claim.status} /></td>
          <td className="px-4 py-3"><div className="flex justify-end gap-2">{claim.status === 'open' && <button onClick={() => setDecision({ claim, status: 'acknowledged', notes: '' })} className="h-8 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700">Acusar</button>}{claim.status !== 'resolved' && <button onClick={() => setDecision({ claim, status: 'resolved', notes: '' })} className="h-8 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white">Resolver</button>}</div></td>
        </tr>)}</tbody>
      </table>
      {!visible.length && <p className="py-12 text-center text-sm text-slate-500">No hay reclamos para este filtro.</p>}
    </div>

    {decision && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={decision.status === 'resolved' ? 'Resolver reclamo' : 'Acusar reclamo'}><div className="w-full max-w-lg rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h3 className="font-bold">{decision.status === 'resolved' ? 'Resolver reclamo' : 'Acusar reclamo'}</h3><p className="text-xs text-slate-500">#{decision.claim.claimNumber} · {decision.claim.supplierName}</p></div><button onClick={() => setDecision(null)} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-5"><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Observaciones</span><textarea rows={4} value={decision.notes} onChange={(event) => setDecision({ ...decision, notes: event.target.value })} placeholder={decision.status === 'resolved' ? 'Detalle el acuerdo, reposicion o nota de credito.' : 'Registre el contacto o seguimiento.'} className="w-full rounded-md border border-slate-300 p-3 text-sm" /></label></div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={() => setDecision(null)} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancelar</button><button onClick={() => void submitDecision()} disabled={loading || (decision.status === 'resolved' && !decision.notes.trim())} className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40">Confirmar</button></div></div></div>}
  </section>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof AlertTriangle; label: string; value: number; tone: 'slate' | 'amber' | 'rose' | 'emerald' }) {
  const colors = { slate: 'text-slate-600', amber: 'text-amber-700', rose: 'text-rose-700', emerald: 'text-emerald-700' };
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className={`flex items-center gap-2 ${colors[tone]}`}><Icon className="h-4 w-4" /><p className="text-xs font-bold uppercase">{label}</p></div><p className="mt-2 text-xl font-bold text-slate-950">{value}</p></div>;
}

function ClaimStatus({ value }: { value: SupplierClaimStatus }) {
  const style = value === 'resolved' ? 'bg-emerald-100 text-emerald-700' : value === 'disputed' ? 'bg-rose-100 text-rose-700' : value === 'acknowledged' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
  const label = value === 'resolved' ? 'Resuelto' : value === 'disputed' ? 'Objetado' : value === 'acknowledged' ? 'Acusado' : 'Abierto';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${style}`}>{label}</span>;
}
