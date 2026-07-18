'use client';

import React, { useState } from 'react';
import { Layers, Plus, Calendar, Tag, Percent, Image, Share2, ShieldCheck } from 'lucide-react';

const INITIAL_COLLECTIONS = [
  { id: 'col1', name: 'Lino Drop 01', season: 'Primavera-Verano 2026', margin: 65, discount: 10, itemsCount: 12, active: true },
  { id: 'col2', name: 'Algodón Orgánico Essentials', season: 'Permanente', margin: 55, discount: 0, itemsCount: 8, active: true },
  { id: 'col3', name: 'Sastrera Urbana', season: 'Otoño-Invierno', margin: 70, discount: 25, itemsCount: 15, active: false }
];

const INITIAL_COUPONS = [
  { code: 'VERANO26', discount: 15, usage: 142, active: true },
  { code: 'CONSCIENTE', discount: 10, usage: 89, active: true },
  { code: 'BIENVENIDA', discount: 15, usage: 304, active: true }
];

export default function CollectionsConsole() {
  const [collections, setCollections] = useState(INITIAL_COLLECTIONS);
  const [coupons, setCoupons] = useState(INITIAL_COUPONS);

  React.useEffect(() => {
    const saved = localStorage.getItem('aura_coupons');
    if (saved) {
      try {
        setCoupons(JSON.parse(saved));
      } catch (e) {
        localStorage.setItem('aura_coupons', JSON.stringify(INITIAL_COUPONS));
      }
    } else {
      localStorage.setItem('aura_coupons', JSON.stringify(INITIAL_COUPONS));
    }
  }, []);

  // Formulario nueva colección
  const [newName, setNewName] = useState('');
  const [newSeason, setNewSeason] = useState('Primavera-Verano 2026');
  const [newMargin, setNewMargin] = useState(60);
  
  // Formulario cupón
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);

  // FASE 3: Simulador de Márgenes y Costos
  const [simCost, setSimCost] = useState('5000');
  const [simMargin, setSimMargin] = useState(60);
  const [simVat, setSimVat] = useState(21);

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const newCol = {
      id: `col-${Date.now()}`,
      name: newName,
      season: newSeason,
      margin: Number(newMargin),
      discount: 0,
      itemsCount: 0,
      active: true
    };

    setCollections([...collections, newCol]);
    setNewName('');
    alert(`Colección "${newName}" creada con éxito en el sistema.`);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;

    const newC = {
      code: newCouponCode.trim().toUpperCase(),
      discount: Number(newCouponDiscount),
      usage: 0,
      active: true
    };

    const updated = [...coupons, newC];
    setCoupons(updated);
    localStorage.setItem('aura_coupons', JSON.stringify(updated));
    setNewCouponCode('');
    alert(`Cupón promocional "${newC.code}" activo en e-commerce y mostrador POS.`);
  };

  const handleToggleCollection = (id: string) => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl shadow-lg">
              <Layers className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Diseño de Colecciones & Campañas
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Administrá temporadas de moda, márgenes de ganancia globales, descuentos por colección y cupones de promoción.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Izquierdo: Gestión de Temporadas / Alta */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-4 flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-cyan-400" />
              Nueva Colección / Temporada
            </h3>

            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre Colección</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Lino Orgánico Drop"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Temporada</label>
                <select
                  value={newSeason}
                  onChange={(e) => setNewSeason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-300 text-xs focus:outline-none"
                >
                  <option value="Primavera-Verano 2026">Primavera-Verano 2026</option>
                  <option value="Otoño-Invierno">Otoño-Invierno</option>
                  <option value="Permanente">Permanente (Básicos)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Margen de Ganancia Promedio ({newMargin}%)</label>
                <input
                  type="range"
                  min="30"
                  max="85"
                  value={newMargin}
                  onChange={(e) => setNewMargin(Number(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold rounded-xl text-xs"
              >
                Crear Colección
              </button>
            </form>
          </div>

          {/* Cupones de descuento */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-4 flex items-center gap-2">
              <Tag className="h-4.5 w-4.5 text-cyan-400" />
              Cupones de Descuento Promocionales
            </h3>

            <form onSubmit={handleCreateCoupon} className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código Cupón</label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs font-mono"
                    placeholder="VERANO20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descuento (%)</label>
                  <input
                    type="number"
                    required
                    min="5"
                    max="60"
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs font-mono text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-750"
              >
                Activar Cupón
              </button>
            </form>

            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {coupons.map(c => (
                <div key={c.code} className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
                  <div>
                    <span className="font-bold text-cyan-400">{c.code}</span>
                    <span className="text-[10px] text-slate-500 ml-2">Uso: {c.usage}</span>
                  </div>
                  <span className="text-emerald-450 font-bold">-{c.discount}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* FASE 3: Simulador Financiero de Margen & Costos */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-2">
              <Percent className="h-4.5 w-4.5 text-cyan-400" />
              Simulador de Costos y Márgenes (Retail)
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo de Fabricación ($)</label>
                <input
                  type="number"
                  value={simCost}
                  onChange={(e) => setSimCost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs font-mono"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                  <span>Margen Deseado</span>
                  <span className="text-cyan-400 font-mono font-bold">{simMargin}%</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={simMargin}
                  onChange={(e) => setSimMargin(Number(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alícuota IVA</label>
                  <select
                    value={simVat}
                    onChange={(e) => setSimVat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2 text-slate-300 text-xs focus:outline-none"
                  >
                    <option value="21">21% (Normal)</option>
                    <option value="10.5">10.5% (Reducido)</option>
                    <option value="0">0% (Exento)</option>
                  </select>
                </div>
                
                {(() => {
                  const cost = Number(simCost) || 0;
                  const margin = simMargin / 100;
                  const priceNet = cost / (1 - margin);
                  const vat = simVat / 100;
                  const retailPrice = priceNet * (1 + vat);
                  const profit = priceNet - cost;
                  
                  return (
                    <div className="col-span-2 bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5 font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Precio Neto:</span>
                        <span className="text-slate-200 font-bold">${priceNet.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">IVA ({simVat}%):</span>
                        <span className="text-slate-400">${(priceNet * vat).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-1.5 text-xs text-cyan-400 font-extrabold">
                        <span>PVP Sugerido:</span>
                        <span>${retailPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-1 text-[9px] text-emerald-450">
                        <span>Ganancia Neta:</span>
                        <span>${profit.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Panel Central/Derecha: Colecciones Activas y Moodboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Listado de Colecciones */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-4">
              Colecciones en Sistema
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map(col => (
                <div key={col.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white text-sm">{col.name}</h4>
                      <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[8px] uppercase border ${
                        col.active 
                          ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {col.active ? 'Activo' : 'Borrador'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">{col.season}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-900/40 p-2 rounded-lg border border-slate-850/50">
                    <div>
                      <span className="text-slate-500 block font-bold">Margen</span>
                      <span className="font-mono text-slate-300 font-bold">{col.margin}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-bold">Descuento</span>
                      <span className="font-mono text-red-400 font-bold">{col.discount}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-bold">Prendas</span>
                      <span className="font-mono text-slate-300 font-bold">{col.itemsCount}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleToggleCollection(col.id)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-colors ${
                        col.active
                          ? 'bg-red-950/20 text-red-400 border-red-900/20 hover:bg-red-950/40'
                          : 'bg-emerald-950/20 text-emerald-455 border-emerald-900/20 hover:bg-emerald-950/40'
                      }`}
                    >
                      {col.active ? 'Suspender' : 'Activar'}
                    </button>
                    <button
                      onClick={() => alert('Simulación: Difundiendo campaña de email marketing con cupón de temporada.')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded text-[10px] font-bold flex items-center gap-1.5"
                    >
                      <Share2 className="h-3 w-3" />
                      Lanzar Campaña
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Mood board */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-4 flex items-center gap-2">
              <Image className="h-4.5 w-4.5 text-cyan-400" />
              Línea de Diseño Visual (Moodboard Drops)
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="aspect-video bg-gradient-to-tr from-orange-500/20 to-amber-600/20 border border-amber-900/30 rounded-xl flex items-center justify-center text-[10px] font-bold text-amber-500 uppercase tracking-wider text-center p-2">
                Paleta Cálida (Lino Natural)
              </div>
              <div className="aspect-video bg-gradient-to-tr from-slate-850 to-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center p-2">
                Essentials Heavy (Negro Orgánico)
              </div>
              <div className="aspect-video bg-gradient-to-tr from-blue-900/20 to-indigo-900/20 border border-indigo-900/30 rounded-xl flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase tracking-wider text-center p-2">
                Drop Denim (Sustentable)
              </div>
            </div>
          </div>

          {/* FASE 3: Cronograma de Lanzamientos (Drop Timeline) */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-cyan-400" />
              Cronograma de Lanzamientos de Colección (Drops)
            </h3>

            <div className="relative pl-6 border-l border-slate-800 space-y-4 ml-2">
              <div className="relative">
                <span className="absolute left-[-29px] top-1 bg-emerald-500 h-2 w-2 rounded-full border-4 border-slate-900" />
                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-200">Drop 01: Lino Natural</strong>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Lanzado</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Fecha: 10 Ago 2026 | 12 artículos cargados</p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-[-29px] top-1 bg-cyan-500 h-2 w-2 rounded-full border-4 border-slate-900" />
                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-200">Drop 02: Denim Reciclado</strong>
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-bold uppercase">En Diseño</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Fecha: 25 Sep 2026 | 8 moldes confirmados</p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-[-29px] top-1 bg-slate-700 h-2 w-2 rounded-full border-4 border-slate-900" />
                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-400">Campaña Invierno 2027</strong>
                    <span className="text-[9px] bg-slate-900 text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded font-bold uppercase">Planeado</span>
                  </div>
                  <p className="text-[10px] text-slate-650 mt-0.5 font-mono">Fecha: 15 Mar 2027 | Planificación de hilado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
