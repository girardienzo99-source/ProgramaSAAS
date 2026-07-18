'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Download, FileCheck2, LoaderCircle, ReceiptText, RefreshCw, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';

type PaymentMethod = 'cash' | 'card' | 'qr';

interface SalesReport {
  from: string;
  to: string;
  summary: {
    salesTotal: number;
    netTotal: number;
    taxTotal: number;
    tipsTotal: number;
    chargedTotal: number;
    settlementsCount: number;
    averageTicket: number;
    previousSalesTotal: number;
  };
  daily: Array<{ day: string; sales: number; tips: number; settlements: number }>;
  payments: Array<{ method: PaymentMethod; amount: number; payments: number }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; total: number }>;
  fiscal: Array<{ status: 'pending' | 'authorized' | 'rejected' | 'not_required'; count: number; total: number }>;
}

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentLabel: Record<PaymentMethod, string> = { cash: 'Efectivo', card: 'Tarjeta', qr: 'QR' };

function localDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function GastronomyReportsConsole() {
  const [from, setFrom] = useState(() => localDate(29));
  const [to, setTo] = useState(() => localDate());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (start = from, end = to) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/rubros/gastronomy/reports?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo generar el reporte.');
      setReport(data.report);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPeriod = (days: number) => {
    const start = localDate(days - 1);
    const end = localDate();
    setFrom(start);
    setTo(end);
    void load(start, end);
  };

  const comparison = useMemo(() => {
    if (!report) return 0;
    if (!report.summary.previousSalesTotal) return report.summary.salesTotal ? 100 : 0;
    return ((report.summary.salesTotal - report.summary.previousSalesTotal) / report.summary.previousSalesTotal) * 100;
  }, [report]);
  const maxDaily = Math.max(1, ...(report?.daily.map((row) => row.sales) ?? []));
  const paymentTotal = report?.payments.reduce((sum, row) => sum + row.amount, 0) ?? 0;

  return (
    <section className="space-y-5" aria-label="Reportes gastronomicos">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase text-indigo-400">Gestion basada en datos</p><h2 className="text-lg font-black text-white">Reportes Gastronomicos</h2><p className="text-xs text-slate-500">Ventas cobradas, propinas, medios de pago y productos del periodo.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex rounded-md border border-slate-700 p-0.5">{[7, 30, 90].map((days) => <button key={days} onClick={() => selectPeriod(days)} className="h-8 px-3 text-xs font-bold text-slate-300 hover:bg-slate-800">{days} dias</button>)}</div>
          <label className="text-[10px] font-bold uppercase text-slate-500">Desde<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-white" /></label>
          <label className="text-[10px] font-bold uppercase text-slate-500">Hasta<input type="date" value={to} min={from} max={localDate()} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-white" /></label>
          <button onClick={() => void load()} disabled={loading} aria-label="Actualizar reporte" title="Actualizar reporte" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <a href={`/api/rubros/gastronomy/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=csv`} download className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-500/40 px-3 text-xs font-black text-emerald-400"><Download className="h-4 w-4" />CSV</a>
        </div>
      </div>

      {error && <div role="alert" className="border-l-2 border-rose-500 bg-rose-500/5 p-3 text-sm text-rose-400">{error}</div>}
      {loading && !report ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Calculando reporte...</div> : report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Banknote} label="Ventas" value={money(report.summary.salesTotal)} detail={`${report.summary.settlementsCount} cierres`} />
            <Metric icon={ReceiptText} label="Ticket promedio" value={money(report.summary.averageTicket)} detail={`${comparison >= 0 ? '+' : ''}${comparison.toFixed(1)}% vs periodo anterior`} accent={comparison >= 0 ? 'positive' : 'negative'} />
            <Metric icon={WalletCards} label="Propinas" value={money(report.summary.tipsTotal)} detail="Fuera de la venta gravada" />
            <Metric icon={FileCheck2} label="IVA ventas" value={money(report.summary.taxTotal)} detail={`Neto ${money(report.summary.netTotal)}`} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <div className="min-w-0 border-l-2 border-cyan-500 bg-slate-900/40 p-5">
              <div className="flex items-center justify-between"><div><h3 className="font-black text-white">Ventas por dia</h3><p className="text-xs text-slate-500">Solo incluye cierres cobrados.</p></div><CalendarDays className="h-5 w-5 text-cyan-400" /></div>
              {report.daily.length ? <div className="mt-5 flex h-52 items-end gap-2 overflow-x-auto border-b border-slate-700 px-1 pb-7">{report.daily.map((row) => <div key={row.day} className="relative flex h-full min-w-10 flex-1 items-end justify-center" title={`${row.day}: ${money(row.sales)}`}><div style={{ height: `${Math.max(4, (row.sales / maxDaily) * 100)}%` }} className="w-5 bg-cyan-500 sm:w-7" /><span className="absolute -bottom-6 text-[9px] text-slate-500">{row.day.slice(5)}</span></div>)}</div> : <Empty text="No hay ventas cobradas en este periodo." />}
            </div>

            <div className="border-l-2 border-indigo-500 bg-slate-900/40 p-5">
              <h3 className="font-black text-white">Medios de pago</h3><p className="text-xs text-slate-500">Participacion sobre el total cobrado.</p>
              <div className="mt-5 space-y-4">{report.payments.map((row) => { const percentage = paymentTotal ? (row.amount / paymentTotal) * 100 : 0; return <div key={row.method}><div className="flex justify-between text-xs"><span className="font-bold text-slate-300">{paymentLabel[row.method]}</span><span className="text-white">{money(row.amount)} <span className="text-slate-500">({percentage.toFixed(1)}%)</span></span></div><div className="mt-2 h-2 bg-slate-800"><div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }} /></div><p className="mt-1 text-[10px] text-slate-600">{row.payments} pagos</p></div>; })}{!report.payments.length && <Empty text="No hay pagos en este periodo." />}</div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
              <table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-slate-900 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3 text-right">Ventas</th><th className="px-4 py-3 text-right">Participacion</th></tr></thead><tbody className="divide-y divide-slate-800">{report.topProducts.map((item) => <tr key={item.productId}><td className="px-4 py-3 font-bold text-white">{item.name}</td><td className="px-4 py-3 text-right text-slate-300">{item.quantity.toLocaleString('es-AR')}</td><td className="px-4 py-3 text-right font-bold text-white">{money(item.total)}</td><td className="px-4 py-3 text-right text-cyan-400">{report.summary.salesTotal ? ((item.total / report.summary.salesTotal) * 100).toFixed(1) : '0.0'}%</td></tr>)}</tbody></table>
              {!report.topProducts.length && <p className="py-10 text-center text-xs text-slate-500">El detalle por producto aparecera con las nuevas ventas.</p>}
            </div>
            <div className="border-l-2 border-amber-500 bg-slate-900/40 p-5"><h3 className="font-black text-white">Estado fiscal</h3><p className="text-xs text-slate-500">Conciliacion de ventas con ARCA.</p><div className="mt-5 space-y-3">{report.fiscal.map((row) => <div key={row.status} className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs"><div><p className="font-bold capitalize text-slate-300">{row.status === 'pending' ? 'Pendiente' : row.status}</p><p className="text-[10px] text-slate-600">{row.count} cierres</p></div><strong className="text-white">{money(row.total)}</strong></div>)}{!report.fiscal.length && <Empty text="Sin cierres fiscales en el periodo." />}</div></div>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail, accent }: { icon: typeof Banknote; label: string; value: string; detail: string; accent?: 'positive' | 'negative' }) {
  const TrendIcon = accent === 'negative' ? TrendingDown : TrendingUp;
  return <div className="border-l-2 border-slate-700 bg-slate-900/40 p-4"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-[10px] font-bold uppercase">{label}</span></div><p className="mt-2 text-xl font-black text-white">{value}</p><p className={`mt-1 flex items-center gap-1 text-[10px] ${accent === 'positive' ? 'text-emerald-400' : accent === 'negative' ? 'text-rose-400' : 'text-slate-500'}`}>{accent && <TrendIcon className="h-3 w-3" />}{detail}</p></div>;
}

function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-xs text-slate-500">{text}</p>; }
