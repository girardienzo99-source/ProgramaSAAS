'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Download,
  Landmark,
  LoaderCircle,
  Percent,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { apiFetch } from '@/lib/client/apiFetch';
import type { SupermarketSalesReportRecord } from '@/lib/api/supermarketRepository';

interface BranchOption { id: string; name: string }

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const categoryLabels: Record<string, string> = {
  almacen: 'Almacen', bebidas: 'Bebidas', lacteos: 'Lacteos', carniceria: 'Carniceria',
  verduleria: 'Verduleria', limpieza: 'Limpieza', panaderia: 'Panaderia',
};

function localDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function SupermarketReportsConsole({ branches }: { branches: BranchOption[] }) {
  const [from, setFrom] = useState(() => localDate(29));
  const [to, setTo] = useState(() => localDate());
  const [branchId, setBranchId] = useState('all');
  const [report, setReport] = useState<SupermarketSalesReportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (start = from, end = to, branch = branchId) => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ from: start, to: end, branchId: branch });
      const response = await apiFetch<{ report: SupermarketSalesReportRecord }>(`/api/rubros/supermarket/reports?${query}`);
      setReport(response.report);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [branchId, from, to]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPeriod = (days: number) => {
    const start = localDate(days - 1);
    const end = localDate();
    setFrom(start);
    setTo(end);
    void load(start, end, branchId);
  };

  const selectBranch = (value: string) => {
    setBranchId(value);
    void load(from, to, value);
  };

  const salesComparison = useMemo(() => {
    const current = report?.summary.salesTotal ?? 0;
    const previous = report?.summary.previousSalesTotal ?? 0;
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, [report]);
  const maxDaily = Math.max(1, ...(report?.daily.map((row) => Math.max(row.sales, row.profit)) ?? []));
  const paymentTotal = report?.payments.reduce((sum, row) => sum + row.amount, 0) ?? 0;
  const downloadQuery = new URLSearchParams({ from, to, branchId, format: 'csv' });

  return (
    <section className="space-y-5" aria-label="Reportes y rentabilidad de supermercado">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">Gestion comercial</p>
          <h2 className="text-lg font-bold text-slate-950">Reportes y rentabilidad</h2>
          <p className="text-sm text-slate-500">Ventas, costos historicos, margen y comparacion entre sucursales.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex rounded-md border border-slate-300 p-0.5" aria-label="Periodos rapidos">
            {[7, 30, 90].map((days) => <button key={days} onClick={() => selectPeriod(days)} className="h-8 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100">{days} dias</button>)}
          </div>
          <label className="text-xs font-bold text-slate-600">Sucursal
            <select value={branchId} onChange={(event) => selectBranch(event.target.value)} className="mt-1 block h-9 max-w-48 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold">
              <option value="all">Todas</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Desde<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">Hasta<input type="date" value={to} min={from} max={localDate()} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm" /></label>
          <button onClick={() => void load()} disabled={loading} aria-label="Actualizar reporte" title="Actualizar reporte" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <a href={`/api/rubros/supermarket/reports?${downloadQuery}`} download className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-300 px-3 text-xs font-bold text-emerald-700"><Download className="h-4 w-4" />CSV</a>
        </div>
      </header>

      {error && <div role="alert" className="border-l-2 border-rose-500 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {loading && !report ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Calculando rentabilidad...</div> : report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Landmark} label="Ventas brutas" value={money(report.summary.salesTotal)} detail={`${report.summary.tickets} tickets · ${salesComparison >= 0 ? '+' : ''}${salesComparison.toFixed(1)}% vs anterior`} accent={salesComparison >= 0 ? 'positive' : 'negative'} />
            <Metric icon={TrendingUp} label="Ganancia bruta" value={money(report.summary.grossProfit)} detail={`Ventas netas ${money(report.summary.netTotal)}`} accent={report.summary.grossProfit >= 0 ? 'positive' : 'negative'} />
            <Metric icon={Percent} label="Margen bruto" value={`${report.summary.marginPercent.toFixed(1)}%`} detail={`Costo historico ${money(report.summary.costTotal)}`} accent={report.summary.marginPercent >= 20 ? 'positive' : 'negative'} />
            <Metric icon={ReceiptText} label="Ticket promedio" value={money(report.summary.averageTicket)} detail={`Descuentos ${money(report.summary.discountTotal)}`} />
          </div>

          {report.summary.costCoveragePercent < 100 && <div className="border-l-2 border-amber-500 bg-amber-50 p-3 text-xs text-amber-800">Cobertura de costos: {report.summary.costCoveragePercent.toFixed(1)}%. Las lineas historicas sin captura usan costo cero y deben revisarse.</div>}

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <section className="min-w-0 border-l-2 border-emerald-500 bg-white p-4" aria-label="Evolucion diaria">
              <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-950">Resultado diario</h3><p className="text-xs text-slate-500">Ventas brutas y ganancia sobre venta neta.</p></div><CalendarDays className="h-5 w-5 text-emerald-600" /></div>
              {report.daily.length ? <div className="mt-5 flex h-56 items-end gap-2 overflow-x-auto border-b border-slate-200 px-1 pb-7">{report.daily.map((row) => <div key={row.day} className="relative flex h-full min-w-12 flex-1 items-end justify-center gap-1" title={`${row.day}: ventas ${money(row.sales)}, ganancia ${money(row.profit)}`}><div style={{ height: `${Math.max(3, row.sales * 100 / maxDaily)}%` }} className="w-3 bg-slate-300 sm:w-4" /><div style={{ height: `${Math.max(3, Math.max(0, row.profit) * 100 / maxDaily)}%` }} className={`w-3 sm:w-4 ${row.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span className="absolute -bottom-6 text-[10px] text-slate-500">{row.day.slice(5)}</span></div>)}</div> : <Empty text="No hay ventas en el periodo seleccionado." />}
              <div className="mt-3 flex gap-4 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-slate-300" />Ventas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-emerald-500" />Ganancia</span></div>
            </section>

            <section className="border-l-2 border-cyan-500 bg-white p-4" aria-label="Medios de pago">
              <h3 className="font-bold text-slate-950">Medios de pago</h3><p className="text-xs text-slate-500">Participacion sobre ventas cobradas.</p>
              <div className="mt-5 space-y-5">{report.payments.map((row) => { const share = paymentTotal ? row.amount * 100 / paymentTotal : 0; return <div key={row.method}><div className="flex justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-semibold text-slate-700"><WalletCards className="h-4 w-4" />{row.method === 'cash' ? 'Efectivo' : 'QR'}</span><strong>{money(row.amount)}</strong></div><div className="mt-2 h-2 bg-slate-100"><div className="h-full bg-cyan-500" style={{ width: `${share}%` }} /></div><p className="mt-1 text-xs text-slate-500">{share.toFixed(1)}% · {row.tickets} tickets</p></div>; })}{!report.payments.length && <Empty text="Sin cobros para analizar." />}</div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4"><Value label="IVA" value={money(report.summary.taxTotal)} /><Value label="Devoluciones" value={`${report.summary.returnsCount} · ${money(report.summary.returnsValue)}`} /></div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section className="overflow-x-auto border border-slate-200 bg-white" aria-label="Rentabilidad por categoria">
              <table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Categoria</th><th className="px-4 py-3 text-right">Venta neta</th><th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">Ganancia</th><th className="px-4 py-3 text-right">Margen</th></tr></thead><tbody className="divide-y divide-slate-100">{report.categories.map((row) => <tr key={row.category}><td className="px-4 py-3 font-bold text-slate-950">{categoryLabels[row.category] ?? row.category}</td><td className="px-4 py-3 text-right">{money(row.netSales)}</td><td className="px-4 py-3 text-right text-slate-600">{money(row.cost)}</td><td className={`px-4 py-3 text-right font-bold ${row.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(row.profit)}</td><td className="px-4 py-3 text-right font-bold">{row.marginPercent.toFixed(1)}%</td></tr>)}</tbody></table>
              {!report.categories.length && <Empty text="Las categorias apareceran con las nuevas ventas." />}
            </section>

            <section className="border-l-2 border-indigo-500 bg-white p-4" aria-label="Sucursales">
              <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-950">Sucursales</h3><p className="text-xs text-slate-500">Comparacion consolidada.</p></div><BarChart3 className="h-5 w-5 text-indigo-600" /></div>
              <div className="mt-4 space-y-3">{report.branches.map((row) => <article key={row.branchId} className="border-b border-slate-100 pb-3"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{row.tickets} tickets · margen {row.marginPercent.toFixed(1)}%</p></div><div className="text-right"><p className="font-bold text-slate-950">{money(row.sales)}</p><p className={row.profit >= 0 ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-rose-700'}>{money(row.profit)}</p></div></div></article>)}{!report.branches.length && <Empty text="Sin sucursales con ventas." />}</div>
            </section>
          </div>

          <section className="overflow-x-auto border border-slate-200 bg-white" aria-label="Rentabilidad por producto">
            <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-bold text-slate-950">Rentabilidad por producto</h3><p className="text-xs text-slate-500">Hasta 100 productos ordenados por venta neta.</p></div>
            <table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3 text-right">Venta neta</th><th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">Ganancia</th><th className="px-4 py-3 text-right">Margen</th></tr></thead><tbody className="divide-y divide-slate-100">{report.products.map((row) => <tr key={row.productId}><td className="px-4 py-3 font-bold text-slate-950">{row.name}</td><td className="px-4 py-3 text-slate-600">{categoryLabels[row.category] ?? row.category}</td><td className="px-4 py-3 text-right">{row.quantity.toLocaleString('es-AR')}</td><td className="px-4 py-3 text-right">{money(row.netSales)}</td><td className="px-4 py-3 text-right text-slate-600">{money(row.cost)}</td><td className={`px-4 py-3 text-right font-bold ${row.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(row.profit)}</td><td className="px-4 py-3 text-right font-bold">{row.marginPercent.toFixed(1)}%</td></tr>)}</tbody></table>
            {!report.products.length && <Empty text="El detalle se completa al registrar ventas POS." />}
          </section>
        </>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail, accent }: { icon: typeof Landmark; label: string; value: string; detail: string; accent?: 'positive' | 'negative' }) {
  const TrendIcon = accent === 'negative' ? TrendingDown : TrendingUp;
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-xs font-bold uppercase">{label}</span></div><p className="mt-2 text-xl font-bold text-slate-950">{value}</p><p className={`mt-1 flex items-center gap-1 text-xs ${accent === 'positive' ? 'text-emerald-700' : accent === 'negative' ? 'text-rose-700' : 'text-slate-500'}`}>{accent && <TrendIcon className="h-3 w-3" />}{detail}</p></div>;
}

function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-slate-500">{text}</p>; }
