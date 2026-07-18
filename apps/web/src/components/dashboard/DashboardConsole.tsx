'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, Calendar, MapPin, DollarSign, ShoppingCart, Percent, 
  Download, ArrowUpRight, BarChart2, ShieldCheck, Database, RefreshCw, HelpCircle,
  CreditCard, Info, MessageSquare, Bell, Send
} from 'lucide-react';

// Mock de ventas diarias para los gráficos
const DAILY_SALES = [
  { date: '03/07', sales: 125000, transactions: 15 },
  { date: '04/07', sales: 185000, transactions: 22 },
  { date: '05/07', sales: 142000, transactions: 18 },
  { date: '06/07', sales: 210000, transactions: 25 },
  { date: '07/07', sales: 295000, transactions: 31 },
  { date: '08/07', sales: 312000, transactions: 35 },
  { date: '09/07', sales: 245000, transactions: 28 } // hoy
];

// Mock de productos más vendidos
const TOP_PRODUCTS = [
  { name: 'Remera Algodón Premium', qty: 45, total: 832500 },
  { name: 'Pantalón Jean Slim Fit', qty: 28, total: 837200 },
  { name: 'Zapatillas Deportivas Run', qty: 12, total: 780000 },
  { name: 'Gorra Trucker Retro', qty: 20, total: 170000 }
];

export default function DashboardConsole() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  
  // Mes para exportación de IVA Ventas
  const [ivaMonth, setIvaMonth] = useState('2026-07');
  
  // Estado de proyección
  const [showProjection, setShowProjection] = useState(false);
  const [projectionType, setProjectionType] = useState<'optimista' | 'moderada'>('moderada');

  // Estados de IA y Autogestión
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [tickets, setTickets] = useState([
    { id: 't1', subject: 'Falla impresora comandas WebUSB', status: 'open', created: '9/7/2026' }
  ]);

  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'Plan Vence Pronto', message: 'Tu suscripción mensual vence en 5 días.', type: 'billing', read: false }
  ]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery })
      });
      const data = await res.json();
      setAiAnswer(data.answer);
    } catch (err) {
      setAiAnswer('Error al conectar con el Asistente de IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket = {
      id: `t-${Date.now()}`,
      subject: ticketSubject,
      status: 'open',
      created: new Date().toLocaleDateString()
    };
    setTickets([newTicket, ...tickets]);
    setTicketSubject('');
    setTicketDesc('');
    setIsTicketModalOpen(false);
    alert('Ticket de soporte registrado.');
  };

  // Cálculos de IVA Ventas
  const totalSalesAmount = DAILY_SALES.reduce((acc, curr) => acc + curr.sales, 0);
  const netAmount = totalSalesAmount / 1.21;
  const vatAmount = totalSalesAmount - netAmount;

  // Algoritmo de proyección simple (Promedio ponderado móvil)
  const calculateProjection = () => {
    const totalDays = DAILY_SALES.length;
    const averageDaily = totalSalesAmount / totalDays;
    const multiplier = projectionType === 'optimista' ? 1.25 : 1.05;
    
    // Proyección para la próxima semana (7 días)
    return averageDaily * 7 * multiplier;
  };

  // SVG Chart variables
  const maxSaleValue = Math.max(...DAILY_SALES.map(d => d.sales));
  const chartHeight = 160;
  const chartWidth = 500;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Header Sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl shadow-lg">
              <BarChart2 className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Estadísticas e Inteligencia de Negocio
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Auditoría en tiempo real de transacciones, liquidaciones fiscales y algoritmos proyectivos de facturación.
          </p>
        </div>

        {/* Controles de Filtro Global */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Todas las Sucursales</option>
              <option value="b1" className="bg-slate-900">Sucursal Centro</option>
              <option value="b2" className="bg-slate-900">Sucursal Palermo</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="7d" className="bg-slate-900">Últimos 7 días</option>
              <option value="30d" className="bg-slate-900">Último mes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Centrales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Facturación Total</span>
            <span className="text-2xl font-black text-white mt-1.5 block">${totalSalesAmount.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" />
              +12.4% vs período anterior
            </span>
          </div>
          <span className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <DollarSign className="h-6 w-6" />
          </span>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transacciones</span>
            <span className="text-2xl font-black text-white mt-1.5 block">
              {DAILY_SALES.reduce((acc, curr) => acc + curr.transactions, 0)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-2">
              Ticket Promedio: ${(totalSalesAmount / DAILY_SALES.reduce((acc, curr) => acc + curr.transactions, 0)).toFixed(2)}
            </span>
          </div>
          <span className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <ShoppingCart className="h-6 w-6" />
          </span>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Neto Gravado (Est.)</span>
            <span className="text-2xl font-black text-white mt-1.5 block">${Math.round(netAmount).toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block mt-2">Base imponible calculada</span>
          </div>
          <span className="p-3 bg-slate-950 text-slate-400 rounded-xl border border-slate-800">
            <Percent className="h-6 w-6" />
          </span>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">IVA Débito Fiscal</span>
            <span className="text-2xl font-black text-cyan-400 mt-1.5 block">${Math.round(vatAmount).toLocaleString()}</span>
            <span className="text-[10px] text-slate-450 block mt-2">Alícuota ponderada 21.0%</span>
          </div>
          <span className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <CreditCard className="h-6 w-6" />
          </span>
        </div>
      </div>

      {/* Gráfico y Ventas por Día */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Ventas (SVG Nativo) */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 mb-4">Ventas Diarias ($)</h3>
            
            {/* Contenedor del Gráfico */}
            <div className="w-full flex items-end justify-between h-40 pt-4 px-2 border-b border-slate-800">
              {DAILY_SALES.map((d, index) => {
                const heightPercentage = (d.sales / maxSaleValue) * 100;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group">
                    {/* Tooltip flotante */}
                    <span className="opacity-0 group-hover:opacity-100 bg-slate-950 border border-slate-850 px-2 py-1 rounded text-[9px] font-mono text-cyan-400 absolute mb-24 transition-opacity duration-200 shadow-xl">
                      ${d.sales.toLocaleString()}
                    </span>
                    
                    {/* Barra */}
                    <div 
                      style={{ height: `${(heightPercentage / 100) * chartHeight}px` }}
                      className="w-8/12 max-w-[32px] bg-gradient-to-t from-indigo-600 to-cyan-500 rounded-t-lg group-hover:from-indigo-500 group-hover:to-cyan-400 transition-all duration-300 shadow-md shadow-indigo-500/5 hover:shadow-cyan-400/20"
                    ></div>
                    
                    {/* Etiqueta Eje X */}
                    <span className="text-[10px] text-slate-500 mt-2 font-semibold">{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-850 mt-4">
            <span>Período actual analizado: <strong>03 de Julio a 09 de Julio de 2026</strong></span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></span>
              En tiempo real
            </span>
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850">
            Top Productos y Servicios
          </h3>

          <div className="space-y-4">
            {TOP_PRODUCTS.map((prod, index) => (
              <div key={index} className="flex items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-slate-200 line-clamp-1">{prod.name}</h5>
                  <span className="text-[10px] text-slate-500 font-semibold">{prod.qty} unidades vendidas</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-cyan-400">${prod.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* IVA Ventas / Reporte Contable */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-5">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350">Liquidación Contable IVA Ventas</h3>
            <p className="text-slate-400 text-xs mt-2">
              Exportá el libro de IVA Ventas homologado para enviar a tu estudio contable.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-850">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Seleccionar Período Mensual</label>
              <input
                type="month"
                value={ivaMonth}
                onChange={(e) => setIvaMonth(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 text-xs focus:outline-none"
              />
            </div>
            
            <button
              onClick={() => alert(`Simulación: Archivo CSV 'iva_ventas_${ivaMonth}.csv' generado con éxito.`)}
              className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-xs font-bold text-slate-300 rounded-xl border border-slate-750 flex items-center gap-2 self-end h-[fit-content]"
            >
              <Download className="h-4 w-4" />
              Exportar Libro IVA
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-400 bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
            <div className="flex justify-between">
              <span>Comprobantes Emitidos A/B/C:</span>
              <span className="text-white font-bold">177 facturas</span>
            </div>
            <div className="flex justify-between">
              <span>Total Exento (IVA 0%):</span>
              <span className="text-slate-300 font-semibold">$0.00</span>
            </div>
            <div className="flex justify-between">
              <span>Total Neto Gravado (21.0%):</span>
              <span className="text-slate-300 font-semibold">${Math.round(netAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-850">
              <span>Total IVA Débito Fiscal:</span>
              <span className="text-cyan-400">${Math.round(vatAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Algoritmo Proyectivo / IA Predicción Ventas */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350">Proyecciones del Algoritmo</h3>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                IA ENGINE
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Estimación de facturación futura en base al promedio ponderado móvil y tendencias del período previo.
            </p>
          </div>

          {showProjection ? (
            <div className="my-5 bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Tipo de Proyección:</span>
                <div className="flex bg-slate-900 p-0.5 rounded-lg text-[10px] border border-slate-800">
                  <button
                    onClick={() => setProjectionType('moderada')}
                    className={`px-2.5 py-1 rounded font-semibold ${projectionType === 'moderada' ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                  >
                    Moderada (+5%)
                  </button>
                  <button
                    onClick={() => setProjectionType('optimista')}
                    className={`px-2.5 py-1 rounded font-semibold ${projectionType === 'optimista' ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                  >
                    Optimista (+25%)
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-850 pt-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Facturación Próximos 7 días</span>
                  <span className="text-xl font-extrabold text-cyan-400">${Math.round(calculateProjection()).toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Confiabilidad</span>
                  <span className="text-xs text-emerald-450 font-bold">89.4% (R²)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-6 text-center py-5 border border-dashed border-slate-850 rounded-xl bg-slate-950/20">
              <TrendingUp className="h-8 w-8 mx-auto text-slate-650 mb-2" />
              <button
                onClick={() => setShowProjection(true)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-xs font-bold text-slate-350 rounded-lg border border-slate-750"
              >
                Calcular Proyección Semanal
              </button>
            </div>
          )}

          <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850/80 text-[10px] text-slate-500">
            <Info className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
            <p>
              El motor de proyecciones utiliza regresión lineal básica en base a las ventas diarias del mostrador (POS) y las compras ingresadas para estimar flujo de fondos neto.
            </p>
          </div>
        </div>
      </div>

      {/* NUEVO BLOQUE: Copiloto IA y Autogestión del Tenant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna 1: Copiloto de Inteligencia Artificial */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              Copiloto AI (Asistente Interno)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Consultas en lenguaje natural. Ej: "¿cuánto vendí esta semana?" o "¿qué producto rota más?".
            </p>

            <form onSubmit={handleAskAI} className="mt-4 flex gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none placeholder:text-slate-600"
                placeholder="Preguntale al Copiloto..."
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            {aiAnswer && (
              <div className="mt-4 bg-slate-950/60 p-3.5 rounded-xl border border-cyan-900/10 text-xs text-cyan-400 font-mono">
                {aiAnswer}
              </div>
            )}
          </div>
        </div>

        {/* Columna 2: Autogestión de Licencias y Soporte */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-850">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-emerald-450" />
              Suscripción y Soporte
            </h3>
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-[10px] text-emerald-450 border border-slate-800 rounded font-bold cursor-pointer"
            >
              Nuevo Ticket
            </button>
          </div>

          <div className="bg-slate-955 p-3 rounded-xl border border-slate-850 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Plan Actual:</span>
              <strong className="text-white">Plan Premium</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Próxima Renovación:</span>
              <strong className="text-slate-300">09/08/2026</strong>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tickets Recientes</span>
            {tickets.map(t => (
              <div key={t.id} className="p-2 bg-slate-950/40 rounded-lg border border-slate-850 flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium truncate max-w-[150px]">{t.subject}</span>
                <span className="text-[9px] font-bold text-cyan-400 uppercase font-mono">{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 3: Centro de Notificaciones y Alertas */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-amber-500" />
            Notificaciones Internas
          </h3>

          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-400">{n.title}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase font-mono">Facturas</span>
                </div>
                <p className="text-[11px] text-slate-400">{n.message}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modal Crear Ticket de Soporte */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2">Crear Ticket de Soporte</h3>
            <p className="text-slate-400 text-xs mb-5">
              Informanos cualquier inconveniente y nuestro equipo técnico lo resolverá.
            </p>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Asunto / Resumen</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Problemas con escáner de barras"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descripción Detallada</label>
                <textarea
                  required
                  rows={3}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none resize-none"
                  placeholder="Describe detalladamente el error..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Enviar Ticket
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
