'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Award, Coins, Gift, History, Megaphone, Pencil, Plus, Search, Sparkles, Users, X } from 'lucide-react';
import { apiFetch, uploadCatalogImage } from '@/lib/client/apiFetch';

type Tier = 'bronze' | 'silver' | 'gold';
type BenefitType = 'points_multiplier' | 'fixed_points' | 'percent_discount';
type View = 'customers' | 'activity' | 'campaigns' | 'rewards';

interface Customer {
  id: string; name: string; phone: string; email: string; documentNumber: string; birthDate: string;
  pointsBalance: number; lifetimePoints: number; tier: Tier; marketingConsent: boolean;
  active: boolean; lastMovementAt: string | null;
}

interface Campaign {
  id: string; name: string; benefitType: BenefitType; benefitValue: number; minimumPurchase: number;
  startsOn: string; endsOn: string; active: boolean; isCurrent: boolean;
}

interface Reward {
  id: string; name: string; description: string; pointsCost: number; stockLimit: number | null;
  redeemedCount: number; availableCount: number | null; imageUrl: string | null; active: boolean;
}

interface Movement {
  id: string; customerId: string; customerName: string; movementType: 'earn' | 'redeem' | 'adjust';
  pointsDelta: number; balanceAfter: number; purchaseAmount: number | null; campaignName: string;
  rewardName: string; reference: string; createdAt: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const futureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

export default function SupermarketLoyaltyConsole() {
  const [view, setView] = useState<View>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState(10000);
  const [campaignId, setCampaignId] = useState('');
  const [adjustment, setAdjustment] = useState(50);
  const [adjustmentReason, setAdjustmentReason] = useState('Bonificacion comercial autorizada');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [busy, setBusy] = useState(true);
  const [feedback, setFeedback] = useState('');

  const refresh = async () => {
    const [customerResponse, campaignResponse, rewardResponse, movementResponse] = await Promise.all([
      apiFetch<{ items: Customer[] }>('/api/rubros/supermarket/loyalty/customers'),
      apiFetch<{ items: Campaign[] }>('/api/rubros/supermarket/loyalty/campaigns'),
      apiFetch<{ items: Reward[] }>('/api/rubros/supermarket/loyalty/rewards'),
      apiFetch<{ items: Movement[] }>('/api/rubros/supermarket/loyalty/movements'),
    ]);
    setCustomers(customerResponse.items);
    setCampaigns(campaignResponse.items);
    setRewards(rewardResponse.items);
    setMovements(movementResponse.items);
    setSelectedCustomerId((current) => current || customerResponse.items[0]?.id || '');
  };

  useEffect(() => {
    let active = true;
    setBusy(true);
    refresh().catch((error: unknown) => {
      if (active) setFeedback(error instanceof Error ? error.message : 'No se pudo cargar la fidelizacion.');
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const visibleCustomers = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.documentNumber}`.toLowerCase().includes(search.toLowerCase())), [customers, search]);
  const currentCampaigns = campaigns.filter((campaign) => campaign.isCurrent);
  const pointsIssued = customers.reduce((sum, customer) => sum + customer.pointsBalance, 0);
  const redemptions = movements.filter((movement) => movement.movementType === 'redeem').length;

  const execute = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setFeedback('');
    try {
      await action();
      await refresh();
      setFeedback(success);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo completar la operacion.');
    } finally { setBusy(false); }
  };

  const saveCustomer = (customer: Customer) => execute(async () => {
    await apiFetch('/api/rubros/supermarket/loyalty/customers', { method: 'POST', body: JSON.stringify(customer) });
    setEditingCustomer(null);
  }, customer.id ? 'Socio actualizado.' : 'Socio incorporado al programa.');

  const saveCampaign = (campaign: Campaign) => execute(async () => {
    await apiFetch('/api/rubros/supermarket/loyalty/campaigns', { method: 'POST', body: JSON.stringify(campaign) });
    setEditingCampaign(null);
  }, campaign.id ? 'Campana actualizada.' : 'Campana creada.');

  const saveReward = (reward: Reward) => execute(async () => {
    await apiFetch('/api/rubros/supermarket/loyalty/rewards', { method: 'POST', body: JSON.stringify(reward) });
    setEditingReward(null);
  }, reward.id ? 'Premio actualizado.' : 'Premio agregado al catalogo.');

  const creditPurchase = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCustomer || purchaseAmount <= 0) return;
    void execute(() => apiFetch('/api/rubros/supermarket/loyalty/movements', {
      method: 'POST', headers: { 'Idempotency-Key': `loyalty-earn:${crypto.randomUUID()}` },
      body: JSON.stringify({ action: 'earn', customerId: selectedCustomer.id, purchaseAmount, campaignId: campaignId || undefined }),
    }).then(() => undefined), 'Puntos de compra acreditados.');
  };

  const adjustPoints = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCustomer || !Number.isInteger(adjustment) || adjustment === 0 || !adjustmentReason.trim()) return;
    void execute(() => apiFetch('/api/rubros/supermarket/loyalty/movements', {
      method: 'POST', headers: { 'Idempotency-Key': `loyalty-adjust:${crypto.randomUUID()}` },
      body: JSON.stringify({ action: 'adjust', customerId: selectedCustomer.id, pointsDelta: adjustment, reference: adjustmentReason }),
    }).then(() => undefined), 'Saldo de puntos ajustado.');
  };

  const redeemReward = (reward: Reward) => {
    if (!selectedCustomer) return;
    void execute(() => apiFetch('/api/rubros/supermarket/loyalty/movements', {
      method: 'POST', headers: { 'Idempotency-Key': `loyalty-redeem:${crypto.randomUUID()}` },
      body: JSON.stringify({ action: 'redeem', customerId: selectedCustomer.id, rewardId: reward.id }),
    }).then(() => undefined), `${reward.name} canjeado.`);
  };

  const views: Array<{ id: View; label: string; icon: typeof Users }> = [
    { id: 'customers', label: 'Socios y puntos', icon: Users },
    { id: 'activity', label: 'Movimientos', icon: History },
    { id: 'campaigns', label: 'Campanas', icon: Megaphone },
    { id: 'rewards', label: 'Premios', icon: Gift },
  ];

  return <section className="space-y-5" aria-label="Fidelizacion de supermercado">
    {(feedback || busy) && <div role="status" className={`rounded-md border px-4 py-2 text-sm font-semibold ${feedback && !busy ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{busy ? 'Sincronizando fidelizacion...' : feedback}</div>}
    <div><h2 className="font-bold text-slate-900">Fidelizacion de clientes</h2><p className="text-sm text-slate-500">Socios, puntos, niveles, campanas y premios propios del supermercado.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Socios activos" value={String(customers.filter((item) => item.active).length)} detail={`${customers.length} registrados`} />
      <Metric label="Puntos circulantes" value={pointsIssued.toLocaleString('es-AR')} detail="Saldo total disponible" />
      <Metric label="Campanas vigentes" value={String(currentCampaigns.length)} detail={`${campaigns.length} configuradas`} />
      <Metric label="Canjes registrados" value={String(redemptions)} detail="En esta sucursal" />
    </div>
    <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Areas de fidelizacion"><div className="flex min-w-max gap-1">{views.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`flex h-10 items-center gap-2 border-b-2 px-4 text-sm font-bold ${view === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>

    {view === 'customers' && <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="space-y-3 border-b border-slate-200 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Socios</h3><button onClick={() => setEditingCustomer(emptyCustomer())} aria-label="Nuevo socio" className="rounded-md bg-emerald-600 p-2 text-white"><Plus className="h-4 w-4" /></button></div><label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar socio" className={`${inputClass} pl-9`} /></label></div>
        <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">{visibleCustomers.map((customer) => <button key={customer.id} onClick={() => setSelectedCustomerId(customer.id)} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${selectedCustomerId === customer.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}><div className="min-w-0"><p className="truncate font-bold text-slate-900">{customer.name}</p><p className="text-xs text-slate-500">{customer.phone}</p></div><div className="text-right"><p className="font-bold text-emerald-700">{customer.pointsBalance} pts</p><Tier value={customer.tier} /></div></button>)}{visibleCustomers.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay socios para mostrar.</p>}</div>
      </div>
      {selectedCustomer ? <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h3><Tier value={selectedCustomer.tier} /></div><p className="text-sm text-slate-500">{selectedCustomer.phone}{selectedCustomer.email ? ` - ${selectedCustomer.email}` : ''}</p></div><button onClick={() => setEditingCustomer({ ...selectedCustomer })} className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold"><Pencil className="h-4 w-4" />Editar socio</button></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={creditPurchase} className="rounded-lg border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Coins className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Acreditar compra</h3></div><Field label="Importe de compra"><input type="number" min="0.01" step="0.01" value={purchaseAmount} onChange={(event) => setPurchaseAmount(Number(event.target.value))} className={inputClass} /></Field><Field label="Campana aplicable"><select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className={inputClass}><option value="">Puntuacion base: 1 punto cada $100</option>{currentCampaigns.filter((campaign) => campaign.benefitType !== 'percent_discount').map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} - minimo ${campaign.minimumPurchase}</option>)}</select></Field><button disabled={busy || purchaseAmount <= 0} className="h-10 w-full rounded-md bg-emerald-600 text-sm font-bold text-white disabled:opacity-50">Acreditar puntos</button></form>
          <form onSubmit={adjustPoints} className="rounded-lg border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-600" /><h3 className="font-bold">Ajuste autorizado</h3></div><Field label="Puntos (+/-)"><input type="number" step="1" value={adjustment} onChange={(event) => setAdjustment(Number(event.target.value))} className={inputClass} /></Field><Field label="Motivo"><input value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} maxLength={180} className={inputClass} /></Field><button disabled={busy || adjustment === 0 || !adjustmentReason.trim()} className="h-10 w-full rounded-md bg-indigo-600 text-sm font-bold text-white disabled:opacity-50">Registrar ajuste</button></form>
        </div>
        <div><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-slate-900">Premios disponibles</h3><button onClick={() => setView('rewards')} className="text-xs font-bold text-emerald-700">Administrar catalogo</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rewards.filter((reward) => reward.active).slice(0, 6).map((reward) => <RewardCard key={reward.id} reward={reward} customer={selectedCustomer} busy={busy} onRedeem={() => redeemReward(reward)} />)}</div></div>
      </div> : <Empty text="Selecciona o crea un socio para administrar sus puntos." />}
    </div>}

    {view === 'activity' && <ActivityTable movements={movements} />}
    {view === 'campaigns' && <div className="space-y-4"><Header title="Campanas comerciales" detail="Beneficios con vigencia y compra minima controladas." action={<button onClick={() => setEditingCampaign(emptyCampaign())} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nueva campana</button>} /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{campaigns.map((campaign) => <article key={campaign.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className={`text-xs font-bold ${campaign.isCurrent ? 'text-emerald-700' : 'text-slate-400'}`}>{campaign.isCurrent ? 'Vigente' : campaign.active ? 'Fuera de fecha' : 'Pausada'}</p><h3 className="font-bold text-slate-900">{campaign.name}</h3></div><button onClick={() => setEditingCampaign({ ...campaign })} aria-label={`Editar ${campaign.name}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button></div><p className="mt-3 text-2xl font-black text-emerald-700">{benefitLabel(campaign)}</p><p className="mt-2 text-xs text-slate-500">Compra minima ${campaign.minimumPurchase.toLocaleString('es-AR')} - {campaign.startsOn} a {campaign.endsOn}</p></article>)}</div></div>}
    {view === 'rewards' && <div className="space-y-4"><Header title="Catalogo de premios" detail="Costo en puntos, stock disponible e imagen comercial." action={<button onClick={() => setEditingReward(emptyReward())} className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nuevo premio</button>} /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{rewards.map((reward) => <article key={reward.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="flex h-32 items-center justify-center bg-slate-100">{reward.imageUrl ? <img src={reward.imageUrl} alt={reward.name} className="h-full w-full object-cover" /> : <Gift className="h-9 w-9 text-slate-300" />}</div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-slate-900">{reward.name}</h3><p className="text-xs text-slate-500">{reward.description}</p></div><button onClick={() => setEditingReward({ ...reward })} aria-label={`Editar ${reward.name}`} className="rounded-md border border-slate-200 p-2"><Pencil className="h-4 w-4" /></button></div><div className="mt-4 flex items-end justify-between"><p className="text-lg font-black text-emerald-700">{reward.pointsCost} pts</p><p className="text-xs font-semibold text-slate-500">{reward.availableCount === null ? 'Sin limite' : `${reward.availableCount} disponibles`}</p></div></div></article>)}</div></div>}

    {editingCustomer && <CustomerEditor customer={editingCustomer} onSave={saveCustomer} onClose={() => setEditingCustomer(null)} />}
    {editingCampaign && <CampaignEditor campaign={editingCampaign} onSave={saveCampaign} onClose={() => setEditingCampaign(null)} />}
    {editingReward && <RewardEditor reward={editingReward} onSave={saveReward} onClose={() => setEditingReward(null)} />}
  </section>;
}

function emptyCustomer(): Customer { return { id: '', name: '', phone: '', email: '', documentNumber: '', birthDate: '', pointsBalance: 0, lifetimePoints: 0, tier: 'bronze', marketingConsent: false, active: true, lastMovementAt: null }; }
function emptyCampaign(): Campaign { return { id: '', name: '', benefitType: 'points_multiplier', benefitValue: 2, minimumPurchase: 0, startsOn: today(), endsOn: futureDate(30), active: true, isCurrent: true }; }
function emptyReward(): Reward { return { id: '', name: '', description: '', pointsCost: 100, stockLimit: null, redeemedCount: 0, availableCount: null, imageUrl: null, active: true }; }
function benefitLabel(campaign: Campaign) { if (campaign.benefitType === 'points_multiplier') return `x${campaign.benefitValue} puntos`; if (campaign.benefitType === 'fixed_points') return `+${campaign.benefitValue} puntos`; return `${campaign.benefitValue}% descuento`; }

function RewardCard({ reward, customer, busy, onRedeem }: { reward: Reward; customer: Customer; busy: boolean; onRedeem: () => void }) { const available = reward.availableCount === null || reward.availableCount > 0; const enough = customer.pointsBalance >= reward.pointsCost; return <article className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /><h4 className="font-bold text-slate-900">{reward.name}</h4></div><p className="mt-2 text-xs text-slate-500">{reward.description}</p><div className="mt-4 flex items-center justify-between"><strong className="text-emerald-700">{reward.pointsCost} pts</strong><button onClick={onRedeem} disabled={busy || !enough || !available} className="h-8 rounded-md bg-amber-500 px-3 text-xs font-bold text-slate-950 disabled:bg-slate-200 disabled:text-slate-500">{!available ? 'Sin stock' : enough ? 'Canjear' : 'Sin puntos'}</button></div></article>; }
function Tier({ value }: { value: Tier }) { const style = value === 'gold' ? 'bg-amber-100 text-amber-800' : value === 'silver' ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-800'; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style}`}>{value === 'gold' ? 'Oro' : value === 'silver' ? 'Plata' : 'Bronce'}</span>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Header({ title, detail, action }: { title: string; detail: string; action: ReactNode }) { return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="font-bold text-slate-900">{title}</h3><p className="text-sm text-slate-500">{detail}</p></div>{action}</div>; }
function Empty({ text }: { text: string }) { return <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">{text}</div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="mb-3 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }

function ActivityTable({ movements }: { movements: Movement[] }) { return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Socio</th><th className="px-4 py-3">Operacion</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Puntos</th><th className="px-4 py-3">Saldo</th></tr></thead><tbody className="divide-y divide-slate-100">{movements.map((movement) => <tr key={movement.id}><td className="px-4 py-3 text-xs text-slate-500">{new Date(movement.createdAt).toLocaleString('es-AR')}</td><td className="px-4 py-3 font-bold">{movement.customerName}</td><td className="px-4 py-3">{movement.movementType === 'earn' ? 'Compra' : movement.movementType === 'redeem' ? 'Canje' : 'Ajuste'}</td><td className="px-4 py-3 text-slate-600">{movement.reference}{movement.campaignName ? ` - ${movement.campaignName}` : ''}</td><td className={`px-4 py-3 font-bold ${movement.pointsDelta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{movement.pointsDelta > 0 ? '+' : ''}{movement.pointsDelta}</td><td className="px-4 py-3 font-semibold">{movement.balanceAfter}</td></tr>)}{movements.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Todavia no hay movimientos en esta sucursal.</td></tr>}</tbody></table></div>; }

function CustomerEditor({ customer, onSave, onClose }: { customer: Customer; onSave: (value: Customer) => void; onClose: () => void }) { const [draft, setDraft] = useState(customer); return <Editor title={draft.id ? 'Editar socio' : 'Nuevo socio'} onClose={onClose} onSave={() => onSave(draft)} disabled={!draft.name.trim() || !draft.phone.trim()}><div className="grid gap-x-4 sm:grid-cols-2"><Field label="Nombre"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></Field><Field label="Telefono"><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={inputClass} /></Field><Field label="Email"><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></Field><Field label="Documento"><input value={draft.documentNumber} onChange={(event) => setDraft({ ...draft, documentNumber: event.target.value })} className={inputClass} /></Field><Field label="Nacimiento"><input type="date" value={draft.birthDate} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })} className={inputClass} /></Field><Field label="Estado"><span className="flex h-10 items-center justify-between rounded-md border border-slate-300 px-3 text-sm font-semibold">Socio activo<input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /></span></Field><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.marketingConsent} onChange={(event) => setDraft({ ...draft, marketingConsent: event.target.checked })} />Autoriza comunicaciones de beneficios y campanas.</label></div></Editor>; }
function CampaignEditor({ campaign, onSave, onClose }: { campaign: Campaign; onSave: (value: Campaign) => void; onClose: () => void }) { const [draft, setDraft] = useState(campaign); return <Editor title={draft.id ? 'Editar campana' : 'Nueva campana'} onClose={onClose} onSave={() => onSave(draft)} disabled={!draft.name.trim() || !draft.startsOn || !draft.endsOn || draft.endsOn < draft.startsOn}><div className="grid gap-x-4 sm:grid-cols-2"><Field label="Nombre"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></Field><Field label="Tipo"><select value={draft.benefitType} onChange={(event) => setDraft({ ...draft, benefitType: event.target.value as BenefitType })} className={inputClass}><option value="points_multiplier">Multiplicador de puntos</option><option value="fixed_points">Puntos adicionales</option><option value="percent_discount">Descuento porcentual</option></select></Field><Field label="Valor"><input type="number" min="0.01" step="0.01" value={draft.benefitValue} onChange={(event) => setDraft({ ...draft, benefitValue: Number(event.target.value) })} className={inputClass} /></Field><Field label="Compra minima"><input type="number" min="0" step="0.01" value={draft.minimumPurchase} onChange={(event) => setDraft({ ...draft, minimumPurchase: Number(event.target.value) })} className={inputClass} /></Field><Field label="Desde"><input type="date" value={draft.startsOn} onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })} className={inputClass} /></Field><Field label="Hasta"><input type="date" value={draft.endsOn} onChange={(event) => setDraft({ ...draft, endsOn: event.target.value })} className={inputClass} /></Field><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Campana activa</label></div></Editor>; }
function RewardEditor({ reward, onSave, onClose }: { reward: Reward; onSave: (value: Reward) => void; onClose: () => void }) { const [draft, setDraft] = useState(reward); const upload = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const imageUrl = await uploadCatalogImage(file, 'supermarket_loyalty_rewards'); setDraft((current) => ({ ...current, imageUrl })); }; return <Editor title={draft.id ? 'Editar premio' : 'Nuevo premio'} onClose={onClose} onSave={() => onSave(draft)} disabled={!draft.name.trim() || draft.pointsCost < 1}><div className="grid gap-x-4 sm:grid-cols-2"><div className="sm:col-span-2"><div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-md bg-slate-100">{draft.imageUrl ? <img src={draft.imageUrl} alt="Vista previa" className="h-full w-full object-cover" /> : <Gift className="h-8 w-8 text-slate-300" />}</div><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" />Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="sr-only" /></label></div><Field label="Nombre"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></Field><Field label="Costo en puntos"><input type="number" min="1" step="1" value={draft.pointsCost} onChange={(event) => setDraft({ ...draft, pointsCost: Number(event.target.value) })} className={inputClass} /></Field><Field label="Stock limite (vacio = ilimitado)"><input type="number" min={draft.redeemedCount} step="1" value={draft.stockLimit ?? ''} onChange={(event) => setDraft({ ...draft, stockLimit: event.target.value ? Number(event.target.value) : null })} className={inputClass} /></Field><Field label="Estado"><span className="flex h-10 items-center justify-between rounded-md border border-slate-300 px-3 text-sm font-semibold">Premio activo<input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /></span></Field><div className="sm:col-span-2"><Field label="Descripcion"><input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={240} className={inputClass} /></Field></div></div></Editor>; }
function Editor({ title, children, onClose, onSave, disabled }: { title: string; children: ReactNode; onClose: () => void; onSave: () => void; disabled: boolean }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="font-bold">{title}</h3><button onClick={onClose} aria-label="Cerrar"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancelar</button><button onClick={onSave} disabled={disabled} className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar</button></div></div></div>; }
