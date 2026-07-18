'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  FileClock,
  FileText,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';

type FiscalStatus = 'draft' | 'authorizing' | 'authorized' | 'observed' | 'rejected' | 'uncertain' | 'cancelled';

interface FiscalInvoice {
  id: string;
  saleId: string;
  settlementId: string | null;
  invoiceType: 'FA' | 'FB' | 'FC';
  pointOfSale: number;
  voucherNumber: number | null;
  status: FiscalStatus;
  environment: 'homologacion' | 'produccion';
  recipientName: string;
  recipientDocumentType: string;
  recipientDocumentNumber: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  cae: string | null;
  caeDueDate: string | null;
  qrUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    totalAmount: number;
  }>;
}

interface PendingSale {
  saleId: string;
  settlementId: string | null;
  reference: string;
  total: number;
  tipAmount: number;
  createdAt: string;
}

interface BillingDashboard {
  invoices: FiscalInvoice[];
  pendingSales: PendingSale[];
  config: {
    configured: boolean;
    environment: 'homologacion' | 'produccion';
    pointOfSale: number;
    cuitMasked: string;
    authorizationMethod: 'CAE' | 'CAEA';
    missing: string[];
  };
}

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<FiscalStatus, string> = {
  draft: 'Borrador',
  authorizing: 'Autorizando',
  authorized: 'Autorizado',
  observed: 'Observado',
  rejected: 'Rechazado',
  uncertain: 'A conciliar',
  cancelled: 'Cancelado',
};

const STATUS_STYLE: Record<FiscalStatus, string> = {
  draft: 'bg-amber-500/10 text-amber-400',
  authorizing: 'bg-cyan-500/10 text-cyan-400',
  authorized: 'bg-emerald-500/10 text-emerald-400',
  observed: 'bg-blue-500/10 text-blue-400',
  rejected: 'bg-rose-500/10 text-rose-400',
  uncertain: 'bg-orange-500/10 text-orange-400',
  cancelled: 'bg-slate-800 text-slate-400',
};

export default function BillingConsole() {
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState<PendingSale | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<FiscalInvoice | null>(null);
  const [invoiceType, setInvoiceType] = useState<'FA' | 'FB' | 'FC'>('FB');
  const [recipientName, setRecipientName] = useState('Consumidor final');
  const [documentType, setDocumentType] = useState<'99' | 'DNI' | 'CUIT' | 'CUIL'>('99');
  const [documentNumber, setDocumentNumber] = useState('0');
  const [vatCondition, setVatCondition] = useState('consumidor_final');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/billing/invoices', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo consultar la cola fiscal.');
      setDashboard({ invoices: data.invoices, pendingSales: data.pendingSales, config: data.config });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo consultar la cola fiscal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!dashboard?.pendingSales.length || selectedSale) return;
    const requestedSale = new URLSearchParams(window.location.search).get('saleId');
    if (requestedSale) setSelectedSale(dashboard.pendingSales.find((sale) => sale.saleId === requestedSale) ?? null);
  }, [dashboard, selectedSale]);

  const metrics = useMemo(() => {
    const invoices = dashboard?.invoices ?? [];
    return {
      pending: invoices.filter((invoice) => ['draft', 'authorizing', 'uncertain'].includes(invoice.status)).length,
      authorized: invoices.filter((invoice) => ['authorized', 'observed'].includes(invoice.status)).length,
      authorizedTotal: invoices.filter((invoice) => ['authorized', 'observed'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total, 0),
    };
  }, [dashboard]);

  const resetRecipient = (type: 'FA' | 'FB' | 'FC') => {
    setInvoiceType(type);
    if (type === 'FA') {
      setDocumentType('CUIT');
      setDocumentNumber('');
      setVatCondition('responsable_inscripto');
      setRecipientName('');
    } else {
      setDocumentType('99');
      setDocumentNumber('0');
      setVatCondition('consumidor_final');
      setRecipientName('Consumidor final');
    }
  };

  const prepareInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSale) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `billing:${selectedSale.saleId}:${invoiceType}`.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128),
        },
        body: JSON.stringify({
          saleId: selectedSale.saleId,
          settlementId: selectedSale.settlementId,
          invoiceType,
          recipientName,
          recipientDocumentType: documentType,
          recipientDocumentNumber: documentNumber,
          recipientVatCondition: vatCondition,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo preparar el comprobante.');
      setSelectedSale(null);
      setMessage(data.duplicate ? 'La venta ya tenia un comprobante preparado.' : 'Comprobante preparado y vinculado a la venta.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo preparar el comprobante.');
    } finally {
      setBusy(false);
    }
  };

  const checkConnection = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/billing/test-connection', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo verificar ARCA.');
      setMessage(data.message ?? 'Conexion verificada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo verificar ARCA.');
    } finally {
      setBusy(false);
    }
  };

  const requestAuthorization = async (invoice: FiscalInvoice) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/billing/emit-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `arca:${invoice.id}`.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128),
        },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo autorizar el comprobante.');
      setMessage(data.duplicate ? 'El comprobante ya estaba autorizado.' : 'Comprobante autorizado.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo autorizar el comprobante.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !dashboard) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Cargando cola fiscal...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
      {(message || error) && (
        <div role="status" className={`border-l-2 p-3 text-sm ${error ? 'border-rose-500 bg-rose-500/5 text-rose-400' : 'border-emerald-500 bg-emerald-500/5 text-emerald-400'}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen fiscal">
        <Metric icon={ReceiptText} label="Ventas sin preparar" value={String(dashboard?.pendingSales.length ?? 0)} detail="Disponibles para facturar" />
        <Metric icon={FileClock} label="En proceso" value={String(metrics.pending)} detail="Borradores y conciliaciones" />
        <Metric icon={BadgeCheck} label="Autorizados" value={String(metrics.authorized)} detail={money(metrics.authorizedTotal)} />
        <Metric icon={ShieldCheck} label="Entorno" value={dashboard?.config.environment === 'produccion' ? 'Produccion' : 'Homologacion'} detail={`Punto de venta ${dashboard?.config.pointOfSale || 'sin configurar'}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-cyan-400">Cola de ventas</p>
              <h2 className="text-lg font-black text-white">Pendientes de comprobante</h2>
              <p className="text-xs text-slate-500">Cada borrador conserva el vínculo con su venta y cierre de caja.</p>
            </div>
            <button onClick={() => void loadDashboard()} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-bold text-slate-300 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-slate-900 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3 text-right">Venta</th><th className="px-4 py-3 text-right">Propina</th><th className="px-4 py-3 text-right">Accion</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {(dashboard?.pendingSales ?? []).map((sale) => (
                  <tr key={sale.saleId}>
                    <td className="px-4 py-3 font-bold text-white">{sale.reference}<span className="block font-mono text-[10px] font-normal text-slate-600">{sale.saleId}</span></td>
                    <td className="px-4 py-3 text-slate-400">{new Date(sale.createdAt).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{money(sale.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{money(sale.tipAmount)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setSelectedSale(sale)} className="rounded-md bg-cyan-500 px-3 py-2 font-black text-slate-950">Preparar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dashboard?.pendingSales.length && <p className="py-10 text-center text-xs text-slate-500">No hay ventas pendientes de preparar.</p>}
          </div>
        </div>

        <aside className={`border-l-2 p-5 ${dashboard?.config.configured ? 'border-emerald-500 bg-emerald-500/5' : 'border-amber-500 bg-amber-500/5'}`} aria-label="Configuracion ARCA">
          <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-slate-400" /><h2 className="font-black text-white">Configuracion fiscal</h2></div>
          <p className="mt-1 text-xs text-slate-500">Las credenciales permanecen en el servidor y nunca se envian al navegador.</p>
          <dl className="mt-5 space-y-3 text-xs">
            <ConfigValue label="CUIT emisor" value={dashboard?.config.cuitMasked ?? 'Sin configurar'} />
            <ConfigValue label="Metodo" value={dashboard?.config.authorizationMethod ?? 'CAE'} />
            <ConfigValue label="Punto de venta" value={String(dashboard?.config.pointOfSale || 'Sin configurar')} />
            <ConfigValue label="Estado" value={dashboard?.config.configured ? 'Credenciales disponibles' : `Falta: ${dashboard?.config.missing.join(', ')}`} />
          </dl>
          <button onClick={() => void checkConnection()} disabled={busy || !dashboard?.config.configured} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-700 text-xs font-black text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck className="h-4 w-4" />Verificar WSAA</button>
          {!dashboard?.config.configured && <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-amber-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />La autorizacion queda bloqueada hasta completar la configuracion segura.</p>}
        </aside>
      </section>

      <section className="space-y-3">
        <div><p className="text-[10px] font-bold uppercase text-indigo-400">Trazabilidad</p><h2 className="text-lg font-black text-white">Comprobantes preparados</h2></div>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-900 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Comprobante</th><th className="px-4 py-3">Receptor</th><th className="px-4 py-3">Venta</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {(dashboard?.invoices ?? []).map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-bold text-white">Factura {invoice.invoiceType.slice(1)}<span className="block font-mono text-[10px] font-normal text-slate-500">{invoice.voucherNumber ? `${String(invoice.pointOfSale).padStart(5, '0')}-${String(invoice.voucherNumber).padStart(8, '0')}` : 'Sin numerar'}</span></td>
                  <td className="px-4 py-3 text-slate-300">{invoice.recipientName}<span className="block text-[10px] text-slate-500">{invoice.recipientDocumentType} {invoice.recipientDocumentNumber}</span></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{invoice.saleId}</td>
                  <td className="px-4 py-3 text-right font-black text-white">{money(invoice.total)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-1 font-bold ${STATUS_STYLE[invoice.status]}`}>{STATUS_LABEL[invoice.status]}</span></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => setSelectedInvoice(invoice)} className="rounded-md border border-slate-700 px-3 py-2 font-bold text-slate-300">Detalle</button>{invoice.status === 'draft' && <button onClick={() => void requestAuthorization(invoice)} disabled={busy || !dashboard?.config.configured} className="inline-flex items-center gap-1 rounded-md bg-indigo-500 px-3 py-2 font-black text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" />Autorizar</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!dashboard?.invoices.length && <p className="py-10 text-center text-xs text-slate-500">Todavia no hay comprobantes preparados.</p>}
        </div>
      </section>

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="prepare-invoice-title">
          <form onSubmit={prepareInvoice} className="w-full max-w-lg space-y-5 rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase text-cyan-400">{selectedSale.reference}</p><h2 id="prepare-invoice-title" className="text-xl font-black text-white">Preparar comprobante</h2><p className="mt-1 text-sm font-bold text-slate-300">Venta {money(selectedSale.total)}</p></div><button type="button" onClick={() => setSelectedSale(null)} aria-label="Cerrar preparacion" className="p-2 text-slate-400"><X className="h-5 w-5" /></button></div>
            <div><span className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Tipo</span><div className="grid grid-cols-3 gap-2">{(['FB', 'FC', 'FA'] as const).map((type) => <button key={type} type="button" aria-pressed={invoiceType === type} onClick={() => resetRecipient(type)} className={`h-10 rounded-md border text-xs font-black ${invoiceType === type ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-700 text-slate-400'}`}>Factura {type.slice(1)}</button>)}</div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-400">Razon social / nombre<input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} maxLength={255} required className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white" /></label>
              <label className="text-xs text-slate-400">Condicion IVA<select value={vatCondition} onChange={(event) => setVatCondition(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white"><option value="consumidor_final">Consumidor final</option><option value="responsable_inscripto">Responsable inscripto</option><option value="monotributo">Monotributo</option><option value="exento">Exento</option></select></label>
              <label className="text-xs text-slate-400">Tipo de documento<select value={documentType} onChange={(event) => { const value = event.target.value as typeof documentType; setDocumentType(value); if (value === '99') setDocumentNumber('0'); }} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white"><option value="99">Sin documento</option><option value="DNI">DNI</option><option value="CUIT">CUIT</option><option value="CUIL">CUIL</option></select></label>
              <label className="text-xs text-slate-400">Numero<input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value.replace(/\D/g, '').slice(0, 11))} disabled={documentType === '99'} inputMode="numeric" required className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white disabled:opacity-50" /></label>
            </div>
            <div className="border-l-2 border-amber-500 bg-amber-500/5 p-3 text-xs text-amber-300">Este paso crea un borrador persistente. No genera CAE, numero fiscal ni QR.</div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedSale(null)} className="h-10 rounded-md border border-slate-700 px-4 text-sm font-bold text-slate-300">Cancelar</button><button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Crear borrador</button></div>
          </form>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase text-indigo-400">Trazabilidad fiscal</p><h2 id="invoice-detail-title" className="text-xl font-black text-white">Factura {selectedInvoice.invoiceType.slice(1)} - {STATUS_LABEL[selectedInvoice.status]}</h2></div><button onClick={() => setSelectedInvoice(null)} aria-label="Cerrar detalle" className="p-2 text-slate-400"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><Detail label="Venta" value={selectedInvoice.saleId} /><Detail label="Entorno" value={selectedInvoice.environment} /><Detail label="CAE" value={selectedInvoice.cae ?? 'No autorizado'} /></div>
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b border-slate-700 text-[10px] uppercase text-slate-500"><tr><th className="py-2">Detalle</th><th className="py-2 text-right">Cantidad</th><th className="py-2 text-right">IVA</th><th className="py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-800">{selectedInvoice.items.map((item) => <tr key={item.id}><td className="py-3 text-slate-300">{item.description}</td><td className="py-3 text-right text-slate-400">{item.quantity}</td><td className="py-3 text-right text-slate-400">{item.vatRate}%</td><td className="py-3 text-right font-bold text-white">{money(item.totalAmount)}</td></tr>)}</tbody></table></div>
            <div className="mt-5 flex items-end justify-between border-t border-slate-700 pt-4"><p className="max-w-sm text-xs text-slate-500">El PDF y el QR fiscal solo se habilitan despues de recibir una autorizacion real de ARCA.</p><p className="text-right"><span className="block text-[10px] font-bold uppercase text-slate-500">Total</span><strong className="text-xl text-white">{money(selectedInvoice.total)}</strong></p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof CircleDollarSign; label: string; value: string; detail: string }) {
  return <div className="border-l-2 border-slate-700 bg-slate-900/40 p-4"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-[10px] font-bold uppercase">{label}</span></div><p className="mt-2 text-xl font-black text-white">{value}</p><p className="mt-1 text-[10px] text-slate-500">{detail}</p></div>;
}

function ConfigValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words font-bold text-slate-200">{value}</dd></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 break-all text-xs font-bold text-slate-200">{value}</p></div>;
}
