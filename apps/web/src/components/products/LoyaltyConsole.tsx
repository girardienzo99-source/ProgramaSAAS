'use client';

import React, { useState } from 'react';
import { Heart, Search, PlusCircle, Gift, Award, ShieldCheck, RefreshCw } from 'lucide-react';

const MOCK_CLIENTS = [
  { id: 'c1', name: 'Horacio Quiroga', phone: '11-5544-3322', points: 850, tier: 'Plata', discount: 10 },
  { id: 'c2', name: 'Clara Vignolo', phone: '11-9988-7766', points: 1450, tier: 'Oro', discount: 15 },
  { id: 'c3', name: 'Esteban Gomez', phone: '11-2233-4455', points: 320, tier: 'Bronce', discount: 5 }
];

const REWARDS = [
  { id: 'r1', name: 'Gorra Trucker AURA', pointsCost: 500, category: 'Accesorios' },
  { id: 'r2', name: 'Cupón 25% OFF Adicional', pointsCost: 750, category: 'Descuentos' },
  { id: 'r3', name: 'Remera Orgánica Básica', pointsCost: 1000, category: 'Indumentaria' }
];

export default function LoyaltyConsole() {
  const [clients, setClients] = useState(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  
  // Acumulación manual
  const [amountSpent, setAmountSpent] = useState('');
  
  // Registro de transacciones
  const [transactions, setTransactions] = useState([
    { clientName: 'Clara Vignolo', action: 'Canje de Premio: Gorra Trucker', points: -500, date: '2026-07-10' },
    { clientName: 'Horacio Quiroga', action: 'Acumulación por Compra', points: 185, date: '2026-07-10' }
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = clients.find(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery)
    );
    if (found) {
      setSelectedClient(found);
    } else {
      alert('Cliente no registrado. Probá con Horacio, Clara o Esteban.');
      setSelectedClient(null);
    }
  };

  const handleAddPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !amountSpent) return;

    const spent = Number(amountSpent);
    if (isNaN(spent) || spent <= 0) return;

    // 1 punto por cada $100 gastados
    const pointsEarned = Math.floor(spent / 100);
    
    // Actualizar cliente
    const updatedClients = clients.map(c => {
      if (c.id === selectedClient.id) {
        const nextPoints = c.points + pointsEarned;
        let nextTier = c.tier;
        let nextDiscount = c.discount;

        if (nextPoints >= 1000) {
          nextTier = 'Oro';
          nextDiscount = 15;
        } else if (nextPoints >= 500) {
          nextTier = 'Plata';
          nextDiscount = 10;
        }

        const updated = { ...c, points: nextPoints, tier: nextTier, discount: nextDiscount };
        setSelectedClient(updated);
        return updated;
      }
      return c;
    });

    setClients(updatedClients);
    setTransactions([
      { clientName: selectedClient.name, action: `Acumulación por Compra ($${spent.toFixed(2)})`, points: pointsEarned, date: new Date().toISOString().split('T')[0] },
      ...transactions
    ]);

    setAmountSpent('');
    alert(`Acumulación Exitosa. Se sumaron ${pointsEarned} puntos a ${selectedClient.name}.`);
  };

  const handleRedeemReward = (reward: any) => {
    if (!selectedClient) return;

    if (selectedClient.points < reward.pointsCost) {
      alert(`Puntos insuficientes. ${selectedClient.name} necesita ${reward.pointsCost} puntos (Actual: ${selectedClient.points}).`);
      return;
    }

    const updatedClients = clients.map(c => {
      if (c.id === selectedClient.id) {
        const nextPoints = c.points - reward.pointsCost;
        let nextTier = c.tier;
        let nextDiscount = c.discount;

        if (nextPoints < 500) {
          nextTier = 'Bronce';
          nextDiscount = 5;
        } else if (nextPoints < 1000) {
          nextTier = 'Plata';
          nextDiscount = 10;
        }

        const updated = { ...c, points: nextPoints, tier: nextTier, discount: nextDiscount };
        setSelectedClient(updated);
        return updated;
      }
      return c;
    });

    setClients(updatedClients);
    setTransactions([
      { clientName: selectedClient.name, action: `Canje de Premio: ${reward.name}`, points: -reward.pointsCost, date: new Date().toISOString().split('T')[0] },
      ...transactions
    ]);

    alert(`¡Premio canjeado! Imprimiendo voucher de canje para entregar la prenda: "${reward.name}".`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl shadow-lg">
              <Heart className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Club de Puntos (Fidelización de Clientes)
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Acumulación de puntos por compras en mostrador, escalas de beneficios VIP (Bronce, Plata, Oro) y catálogo de premios de moda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Izquierdo: Buscar y Sumar */}
        <div className="space-y-6">
          
          {/* Buscador */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-4 flex items-center gap-2">
              <Search className="h-4.5 w-4.5 text-cyan-400" />
              Identificar Socio
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-750"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Ficha Cliente & Suma Puntos */}
          {selectedClient && (
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-5">
              <div className="pb-3 border-b border-slate-850">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-base">{selectedClient.name}</h4>
                  <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${
                    selectedClient.tier === 'Oro'
                      ? 'bg-amber-500/10 text-amber-450 border-amber-500/20'
                      : selectedClient.tier === 'Plata'
                      ? 'bg-slate-300/10 text-slate-300 border-slate-300/20'
                      : 'bg-orange-950/20 text-orange-400 border-orange-900/20'
                  }`}>
                    VIP {selectedClient.tier}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Tel: {selectedClient.phone}</p>
              </div>

              {/* Puntos y Descuento */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Puntos Acumulados</span>
                  <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">{selectedClient.points} pts</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Descuento VIP</span>
                  <span className="text-2xl font-black text-emerald-450 font-mono mt-1 block">-{selectedClient.discount}%</span>
                </div>
              </div>

              {/* FASE 3: Barra de Progreso VIP */}
              <div className="space-y-1.5 pt-1">
                {(() => {
                  const pts = selectedClient.points;
                  let nextTierName = 'Plata';
                  let progressPct = 0;
                  let pointsLeft = 0;

                  if (pts < 500) {
                    nextTierName = 'Plata';
                    progressPct = Math.round((pts / 500) * 100);
                    pointsLeft = 500 - pts;
                  } else if (pts < 1000) {
                    nextTierName = 'Oro';
                    progressPct = Math.round(((pts - 500) / 500) * 100);
                    pointsLeft = 1000 - pts;
                  } else {
                    nextTierName = 'Máximo';
                    progressPct = 100;
                    pointsLeft = 0;
                  }

                  return (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850/80 space-y-2 text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Progreso a VIP {nextTierName}:</span>
                        <span className="font-bold text-cyan-400 font-mono">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      {pointsLeft > 0 ? (
                        <p className="text-[9px] text-slate-500 font-mono">
                          Faltan <strong className="text-cyan-400">{pointsLeft} pts</strong> para alcanzar el beneficio de VIP {nextTierName}.
                        </p>
                      ) : (
                        <p className="text-[9px] text-emerald-450 font-bold">
                          🎉 ¡Felicitaciones! Has alcanzado el nivel VIP máximo.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Sumar puntos por compra */}
              <form onSubmit={handleAddPoints} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto de la Venta ($)</label>
                  <input
                    type="number"
                    value={amountSpent}
                    onChange={(e) => setAmountSpent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs text-center"
                    placeholder="Ingrese total abonado"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  Acumular Puntos (10%)
                </button>
              </form>
            </div>
          )}

          {/* FASE 3: Programa de Referidos */}
          {selectedClient && (
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-cyan-400" />
                Programa de Referidos VIP
              </h3>
              
              <div className="space-y-3.5 text-xs">
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Sumá <strong className="text-cyan-455">50 puntos extras</strong> registrando un amigo recomendado que realice su primera compra.
                </p>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const updatedClients = clients.map(c => {
                      if (c.id === selectedClient.id) {
                        const nextPoints = c.points + 50;
                        const updated = { ...c, points: nextPoints };
                        setSelectedClient(updated);
                        return updated;
                      }
                      return c;
                    });
                    setClients(updatedClients);
                    setTransactions([
                      { clientName: selectedClient.name, action: `Premio por Referido Registrado`, points: 50, date: new Date().toISOString().split('T')[0] },
                      ...transactions
                    ]);
                    alert('Amigo referido registrado con éxito. Se acreditaron +50 puntos de fidelización.');
                  }}
                  className="space-y-2.5"
                >
                  <input
                    type="text"
                    required
                    placeholder="Nombre del amigo..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-bold border border-slate-750 cursor-pointer"
                  >
                    Acreditar Puntos de Referido
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Panel Central: Catálogo de Canje */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-2">
            <Gift className="h-4.5 w-4.5 text-cyan-400" />
            Catálogo de Canje de Premios
          </h3>

          <div className="space-y-3">
            {REWARDS.map(reward => (
              <div key={reward.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-mono">
                    {reward.category}
                  </span>
                  <h4 className="font-bold text-white text-xs mt-1.5">{reward.name}</h4>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold mt-1 block">{reward.pointsCost} pts</span>
                </div>
                
                <button
                  onClick={() => handleRedeemReward(reward)}
                  disabled={!selectedClient}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedClient && selectedClient.points >= reward.pointsCost
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-650 cursor-not-allowed'
                  }`}
                >
                  Canjear
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Derecho: Historial del Club */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-2">
            <Award className="h-4.5 w-4.5 text-cyan-400" />
            Auditoría de Puntos Recientes
          </h3>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {transactions.map((t, idx) => (
              <div key={idx} className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-200">{t.clientName}</strong>
                  <span className={`font-mono font-bold ${t.points > 0 ? 'text-emerald-450' : 'text-red-400'}`}>
                    {t.points > 0 ? `+${t.points}` : t.points} pts
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">{t.action}</p>
                <div className="text-[9px] text-slate-600 text-right">{t.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
