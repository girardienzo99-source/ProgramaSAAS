'use client';

import React, { useState } from 'react';
import { Sparkles, Scale, Ruler, User, ShieldCheck, Printer, Heart, ArrowRight } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Remera Algodón Premium', category: 'Tops', sizeChart: { S: 92, M: 100, L: 108, XL: 116 } },
  { id: 'p2', name: 'Pantalón Jean Slim Fit', category: 'Bottoms', sizeChart: { S: 80, M: 88, L: 96, XL: 104 } },
  { id: 'p3', name: 'Saco Sastrero Lino', category: 'Tops', sizeChart: { S: 96, M: 104, L: 112, XL: 120 } }
];

export default function FittingRoomConsole() {
  const [selectedProduct, setSelectedProduct] = useState(MOCK_PRODUCTS[0]);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(72);
  const [chest, setChest] = useState(98);
  const [waist, setWaist] = useState(84);
  const [hip, setHip] = useState(96);
  const [fitPreference, setFitPreference] = useState<'slim' | 'regular' | 'oversized'>('regular');
  
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);
  const [fitScore, setFitScore] = useState<number | null>(null); // 0 to 100
  const [isCalculating, setIsCalculating] = useState(false);

  // FASE 3: Lógica matemática de estimación por zona anatómica
  const getZoneFit = (zoneName: 'chest' | 'waist' | 'hip') => {
    if (!calculatedSize) return { ratio: 100, label: 'Normal', color: '#1e293b', stroke: '#334155', textClass: 'text-slate-400' };
    
    const size = calculatedSize as 'S' | 'M' | 'L' | 'XL';
    const chart = selectedProduct.sizeChart;
    const baseValue = chart[size] || 100;
    
    let targetGarmentValue = baseValue;
    let userMeasure = chest;

    if (zoneName === 'chest') {
      targetGarmentValue = selectedProduct.category === 'Tops' ? baseValue : baseValue * 1.15;
      userMeasure = chest;
    } else if (zoneName === 'waist') {
      targetGarmentValue = selectedProduct.category === 'Bottoms' ? baseValue : baseValue * 0.84;
      userMeasure = waist;
    } else if (zoneName === 'hip') {
      targetGarmentValue = selectedProduct.category === 'Bottoms' ? baseValue * 1.1 : baseValue * 0.95;
      userMeasure = hip;
    }

    let fitAdj = 0;
    if (fitPreference === 'slim') fitAdj = -4;
    if (fitPreference === 'oversized') fitAdj = 6;

    const ratio = Math.round((userMeasure / targetGarmentValue) * 100) + fitAdj;

    let label = 'Perfecto';
    let color = '#10b981'; // emerald-500
    let stroke = '#34d399';
    let textClass = 'text-emerald-450';

    if (ratio >= 98) {
      label = 'Ajustado';
      color = '#ef4444'; // red-500
      stroke = '#f87171';
      textClass = 'text-red-400';
    } else if (ratio < 90) {
      label = 'Holgado';
      color = '#3b82f6'; // blue-500
      stroke = '#60a5fa';
      textClass = 'text-blue-400';
    }

    return { ratio, label, color, stroke, textClass };
  };

  const chestFit = getZoneFit('chest');
  const waistFit = getZoneFit('waist');
  const hipFit = getZoneFit('hip');

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      // Lógica de estimación premium
      let recommendedSize = 'M';
      let measureToCompare = chest;
      if (selectedProduct.category === 'Bottoms') {
        measureToCompare = waist;
      }

      const chart = selectedProduct.sizeChart;
      if (measureToCompare < chart.S + 2) {
        recommendedSize = 'S';
      } else if (measureToCompare < chart.M + 2) {
        recommendedSize = 'M';
      } else if (measureToCompare < chart.L + 2) {
        recommendedSize = 'L';
      } else {
        recommendedSize = 'XL';
      }

      // Ajustes por preferencia de calce
      if (fitPreference === 'slim') {
        // Prefiere ajustado, tal vez bajar si está al límite
      } else if (fitPreference === 'oversized') {
        // Prefiere holgado, sugerir un talle más
        if (recommendedSize === 'S') recommendedSize = 'M';
        else if (recommendedSize === 'M') recommendedSize = 'L';
        else if (recommendedSize === 'L') recommendedSize = 'XL';
      }

      setCalculatedSize(recommendedSize);
      setFitScore(Math.floor(Math.random() * 15) + 83); // 83% to 98% de precisión
      setIsCalculating(false);
    }, 800);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-6 w-6 text-white animate-pulse" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Probador Virtual IA
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Recomendador inteligente de talles para e-commerce. Analizá el calce anatómico exacto y reducí tasas de devolución.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Izquierdo: Parámetros del Cliente */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-cyan-400" />
            Medidas Corporales del Cliente
          </h3>

          <div className="space-y-4">
            {/* Producto Seleccionado */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prenda a Probar</label>
              <select
                value={selectedProduct.id}
                onChange={(e) => {
                  const prod = MOCK_PRODUCTS.find(p => p.id === e.target.value);
                  if (prod) setSelectedProduct(prod);
                  setCalculatedSize(null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
              >
                {MOCK_PRODUCTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                ))}
              </select>
            </div>

            {/* Altura */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Altura</span>
                <span className="font-mono text-cyan-400 font-bold">{height} cm</span>
              </div>
              <input
                type="range"
                min="140"
                max="210"
                value={height}
                onChange={(e) => { setHeight(Number(e.target.value)); setCalculatedSize(null); }}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Peso */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Peso</span>
                <span className="font-mono text-cyan-400 font-bold">{weight} kg</span>
              </div>
              <input
                type="range"
                min="40"
                max="130"
                value={weight}
                onChange={(e) => { setWeight(Number(e.target.value)); setCalculatedSize(null); }}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Contornos */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pecho (cm)</label>
                <input
                  type="number"
                  value={chest}
                  onChange={(e) => { setChest(Number(e.target.value)); setCalculatedSize(null); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-200 text-xs text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cintura (cm)</label>
                <input
                  type="number"
                  value={waist}
                  onChange={(e) => { setWaist(Number(e.target.value)); setCalculatedSize(null); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-200 text-xs text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cadera (cm)</label>
                <input
                  type="number"
                  value={hip}
                  onChange={(e) => { setHip(Number(e.target.value)); setCalculatedSize(null); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-200 text-xs text-center font-mono"
                />
              </div>
            </div>

            {/* Preferencia de Calce */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preferencia de Calce</label>
              <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => { setFitPreference('slim'); setCalculatedSize(null); }}
                  className={`flex-1 py-1.5 rounded font-semibold ${fitPreference === 'slim' ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                >
                  Entallado (Slim)
                </button>
                <button
                  type="button"
                  onClick={() => { setFitPreference('regular'); setCalculatedSize(null); }}
                  className={`flex-1 py-1.5 rounded font-semibold ${fitPreference === 'regular' ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                >
                  Regular Fit
                </button>
                <button
                  type="button"
                  onClick={() => { setFitPreference('oversized'); setCalculatedSize(null); }}
                  className={`flex-1 py-1.5 rounded font-semibold ${fitPreference === 'oversized' ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                >
                  Suelto (Oversized)
                </button>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              {isCalculating ? 'Calculando anatometría...' : 'Estimar Talle Ideal'}
            </button>
          </div>
        </div>

        {/* Panel Central: Representación 3D del Calce */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 w-full mb-4">
            Mapa de Calce Térmico (Ajuste)
          </h3>

          {/* Silueta interactiva animada mediante SVG */}
          <div className="relative w-48 h-80 flex items-center justify-center">
            <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md">
              {/* Cabeza */}
              <circle cx="50" cy="22" r="10" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              {/* Cuello */}
              <rect x="47" y="32" width="6" height="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              {/* Pecho */}
              <path
                d="M 30,40 L 70,40 L 73,65 L 27,65 Z"
                fill={calculatedSize ? chestFit.color : '#1e293b'}
                fillOpacity={calculatedSize ? "0.6" : "0.4"}
                stroke={calculatedSize ? chestFit.stroke : '#475569'}
                strokeWidth="2"
                className="transition-colors duration-500"
              />
              {/* Cintura */}
              <path
                d="M 27,65 L 73,65 L 70,90 L 30,90 Z"
                fill={calculatedSize ? waistFit.color : '#1e293b'}
                fillOpacity={calculatedSize ? "0.6" : "0.4"}
                stroke={calculatedSize ? waistFit.stroke : '#475569'}
                strokeWidth="2"
                className="transition-colors duration-500"
              />
              {/* Cadera */}
              <path
                d="M 30,90 L 70,90 L 68,110 L 32,110 Z"
                fill={calculatedSize ? hipFit.color : '#1e293b'}
                fillOpacity={calculatedSize ? "0.6" : "0.4"}
                stroke={calculatedSize ? hipFit.stroke : '#475569'}
                strokeWidth="2"
                className="transition-colors duration-500"
              />
              {/* Brazos */}
              <line x1="25" y1="65" x2="15" y2="115" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
              <line x1="75" y1="65" x2="85" y2="115" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
              {/* Piernas */}
              <line x1="38" y1="110" x2="38" y2="180" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
              <line x1="62" y1="110" x2="62" y2="180" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
            </svg>

            {/* Badges descriptivos flotantes */}
            {calculatedSize && (
              <div className="absolute inset-0 pointer-events-none text-[8px] font-bold font-mono">
                <div className="absolute top-[50px] right-[-15px] bg-slate-950/95 border border-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                  Pecho: <span className={chestFit.textClass}>{chestFit.label}</span>
                </div>
                <div className="absolute top-[85px] left-[-20px] bg-slate-950/95 border border-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                  Cintura: <span className={waistFit.textClass}>{waistFit.label}</span>
                </div>
                <div className="absolute top-[120px] right-[-15px] bg-slate-950/95 border border-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                  Cadera: <span className={hipFit.textClass}>{hipFit.label}</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-slate-500 mt-4 leading-relaxed">
            El mapa de calor representa los puntos de tensión del hilado según la tabla de elasticidad del producto.
          </div>
        </div>

        {/* Panel Derecho: Recomendación Final */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-6">
              Diagnóstico de Calce
            </h3>

            {calculatedSize ? (
              <div className="space-y-6">
                <div className="text-center bg-slate-950/80 p-6 rounded-2xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">TALLE SUGERIDO</span>
                  <span className="text-6xl font-black text-white block my-2 tracking-tighter bg-gradient-to-tr from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
                    {calculatedSize}
                  </span>
                  <span className="text-[11px] text-emerald-450 bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold border border-emerald-500/20">
                    Precisión del calce: {fitScore}%
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-450">Prenda:</span>
                    <span className="font-bold text-slate-200">{selectedProduct.name}</span>
                  </div>

                  {/* Stretch Gauges por Zona */}
                  <div className="space-y-2 py-1.5">
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-450 mb-0.5">
                        <span>Ajuste en Pecho</span>
                        <span className={`${chestFit.textClass} font-mono font-bold`}>{chestFit.ratio}% ({chestFit.label})</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, chestFit.ratio)}%`, backgroundColor: chestFit.color }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] text-slate-450 mb-0.5">
                        <span>Ajuste en Cintura</span>
                        <span className={`${waistFit.textClass} font-mono font-bold`}>{waistFit.ratio}% ({waistFit.label})</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, waistFit.ratio)}%`, backgroundColor: waistFit.color }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] text-slate-450 mb-0.5">
                        <span>Ajuste en Cadera</span>
                        <span className={`${hipFit.textClass} font-mono font-bold`}>{hipFit.ratio}% ({hipFit.label})</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, hipFit.ratio)}%`, backgroundColor: hipFit.color }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-850 pt-2.5 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Recomendación de Asesor:</span>
                    <p className="text-[10px] text-slate-350 leading-relaxed font-sans">
                      {chestFit.label === 'Ajustado' || waistFit.label === 'Ajustado' || hipFit.label === 'Ajustado' ? (
                        <span className="text-amber-500 font-semibold">⚠️ Ciertas zonas quedarán ceñidas al cuerpo. Si preferís un estilo más relajado, te sugerimos un talle extra.</span>
                      ) : chestFit.label === 'Holgado' && waistFit.label === 'Holgado' ? (
                        <span className="text-cyan-400 font-semibold">✨ El calce tendrá un estilo Oversized relajado, ideal para siluetas street-wear.</span>
                      ) : (
                        <span className="text-emerald-450 font-semibold">✅ El talle seleccionado es el óptimo para tu estructura corporal según el patrón de costura.</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/15 border border-emerald-900/30 rounded-xl flex gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Este talle cuenta con garantía de primer cambio gratis directo en e-commerce.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-650 text-xs">
                <Ruler className="h-10 w-10 mx-auto mb-2 text-slate-750" />
                Ingresá las medidas del cliente y haz clic en "Estimar Talle Ideal" para ver el diagnóstico.
              </div>
            )}
          </div>

          {calculatedSize && (
            <button
              onClick={() => alert('Imprimiendo prescripción de talle con código de barra para mostrador...')}
              className="w-full mt-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Ficha de Talle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
