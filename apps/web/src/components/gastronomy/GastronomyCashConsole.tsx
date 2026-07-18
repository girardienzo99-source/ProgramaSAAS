'use client';

import Link from 'next/link';
import { Banknote, CreditCard, Landmark, LockKeyhole, QrCode, ReceiptText, Send } from 'lucide-react';

export interface CashState {
  isOpen: boolean;
  cashId: string | null;
  name: string;
  openingBalance: number;
  expectedCash: number;
  salesTotal: number;
  cashPayments: number;
  cardPayments: number;
  qrPayments: number;
  tipsTotal: number;
  openedAt: string | null;
}

export interface SettlementRecord {
  id: string;
  settlementNumber: number;
  tableName: string;
  saleId: string;
  saleTotal: number;
  tipAmount: number;
  chargedTotal: number;
  splitCount: number;
  fiscalStatus: 'pending' | 'authorized' | 'rejected' | 'not_required';
  payments: Array<{ paymentNumber: number; method: 'cash' | 'card' | 'qr'; amount: number; reference: string }>;
  createdAt: string;
}

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function GastronomyCashConsole({
  state,
  settlements,
  openingBalance,
  declaredCash,
  busy,
  onOpeningBalanceChange,
  onDeclaredCashChange,
  onOpen,
  onClose,
}: {
  state: CashState;
  settlements: SettlementRecord[];
  openingBalance: number;
  declaredCash: number;
  busy: boolean;
  onOpeningBalanceChange: (value: number) => void;
  onDeclaredCashChange: (value: number) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <section className="space-y-5" aria-label="Caja gastronomica">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase text-cyan-400">Turno de caja</p>
          <h2 className="text-lg font-black text-white">{state.name}</h2>
          <p className="text-xs text-slate-500">{state.isOpen && state.openedAt ? `Abierta ${new Date(state.openedAt).toLocaleString('es-AR')}` : 'No hay una caja abierta en esta sucursal.'}</p>
        </div>
        <span className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-bold ${state.isOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
          <LockKeyhole className="h-4 w-4" />{state.isOpen ? 'Caja abierta' : 'Caja cerrada'}
        </span>
      </div>

      {!state.isOpen ? (
        <div className="max-w-md space-y-4 border-l-2 border-cyan-500 bg-slate-900/50 p-5">
          <div><h3 className="font-bold text-white">Abrir turno</h3><p className="text-xs text-slate-500">Declara el efectivo inicial antes de registrar cobros.</p></div>
          <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Fondo inicial</span><input type="number" min="0" step="0.01" value={openingBalance} onChange={(event) => onOpeningBalanceChange(Math.max(0, Number(event.target.value)))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white" /></label>
          <button onClick={onOpen} disabled={busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-black text-slate-950 disabled:opacity-50"><Landmark className="h-4 w-4" />Abrir caja</button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={ReceiptText} label="Ventas del turno" value={money(state.salesTotal)} detail={`${settlements.length} cierres registrados`} />
            <Metric icon={Banknote} label="Efectivo esperado" value={money(state.expectedCash)} detail={`${money(state.openingBalance)} de fondo inicial`} />
            <Metric icon={CreditCard} label="Tarjeta y QR" value={money(state.cardPayments + state.qrPayments)} detail={`Tarjeta ${money(state.cardPayments)} | QR ${money(state.qrPayments)}`} />
            <Metric icon={QrCode} label="Propinas" value={money(state.tipsTotal)} detail="Separadas de la venta gravada" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="bg-slate-900 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Cierre</th><th className="px-4 py-3">Mesa</th><th className="px-4 py-3">Pagos</th><th className="px-4 py-3">Venta</th><th className="px-4 py-3">Propina</th><th className="px-4 py-3">Fiscal</th><th className="px-4 py-3 text-right">Accion</th></tr></thead>
                <tbody className="divide-y divide-slate-800">{settlements.map((item) => <tr key={item.id}><td className="px-4 py-3 font-bold text-white">#{item.settlementNumber}<span className="mt-0.5 block font-normal text-slate-500">{new Date(item.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span></td><td className="px-4 py-3 text-slate-300">{item.tableName}</td><td className="px-4 py-3 text-slate-300">{item.payments.map((payment) => payment.method.toUpperCase()).join(' + ')}<span className="block text-slate-500">{item.splitCount} pago{item.splitCount === 1 ? '' : 's'}</span></td><td className="px-4 py-3 font-bold text-white">{money(item.saleTotal)}</td><td className="px-4 py-3 text-emerald-400">{money(item.tipAmount)}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 font-bold ${item.fiscalStatus === 'authorized' ? 'bg-emerald-500/10 text-emerald-400' : item.fiscalStatus === 'rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{item.fiscalStatus === 'pending' ? 'Pendiente ARCA' : item.fiscalStatus}</span></td><td className="px-4 py-3 text-right">{item.fiscalStatus === 'pending' ? <Link href={`/billing?rubro=gastronomy&saleId=${encodeURIComponent(item.saleId)}`} className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 px-3 py-2 font-bold text-cyan-400"><Send className="h-3.5 w-3.5" />Preparar</Link> : <span className="text-slate-600">Procesado</span>}</td></tr>)}</tbody>
              </table>
              {!settlements.length && <p className="py-10 text-center text-xs text-slate-500">Todavia no hay mesas cobradas en este turno.</p>}
            </div>

            <div className="space-y-4 border-l-2 border-amber-500 bg-slate-900/50 p-5">
              <div><h3 className="font-bold text-white">Arqueo y cierre</h3><p className="text-xs text-slate-500">El sistema conservara cualquier diferencia declarada.</p></div>
              <div className="grid grid-cols-2 gap-3 text-xs"><Value label="Cobros efectivo" value={money(state.cashPayments)} /><Value label="Esperado" value={money(state.expectedCash)} /></div>
              <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Efectivo contado</span><input type="number" min="0" step="0.01" value={declaredCash} onChange={(event) => onDeclaredCashChange(Math.max(0, Number(event.target.value)))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white" /></label>
              <p className={`text-xs font-bold ${Math.abs(declaredCash - state.expectedCash) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}>Diferencia: {money(declaredCash - state.expectedCash)}</p>
              <button onClick={onClose} disabled={busy} className="h-10 w-full rounded-md border border-amber-500/40 text-sm font-black text-amber-400 disabled:opacity-50">Cerrar turno</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Banknote; label: string; value: string; detail: string }) {
  return <div className="border-l-2 border-slate-700 bg-slate-900/40 p-4"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-[10px] font-bold uppercase">{label}</span></div><p className="mt-2 text-xl font-black text-white">{value}</p><p className="mt-1 text-[10px] text-slate-500">{detail}</p></div>;
}

function Value({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold text-white">{value}</p></div>; }
