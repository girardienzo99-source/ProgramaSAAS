'use client';

import React, { useMemo, useState } from 'react';
import { 
  Scissors, Calendar, Clock, User, Plus, Trash2, CheckCircle2, 
  DollarSign, Sparkles, AlertTriangle, FileText, ShoppingBag,
  Search, Printer, Phone, MessageSquare, Award, Trash, X, ListFilter,
  Layers, TrendingUp
} from 'lucide-react';

type BeautyAppointmentStatus = 'reserved' | 'confirmed' | 'in_progress' | 'completed' | 'absent' | 'cancelled';
type ChairOrBox = 'Silla 1' | 'Silla 2' | 'Silla 3';
type PaymentStatus = 'pending' | 'señado' | 'paid';
type Feedback = { type: 'success' | 'error'; message: string } | null;

const BEAUTY_STATUSES: BeautyAppointmentStatus[] = ['reserved', 'confirmed', 'in_progress', 'completed', 'absent', 'cancelled'];
const CHAIRS: ChairOrBox[] = ['Silla 1', 'Silla 2', 'Silla 3'];

function isBeautyStatus(value: string): value is BeautyAppointmentStatus {
  return BEAUTY_STATUSES.includes(value as BeautyAppointmentStatus);
}

function isChairOrBox(value: string): value is ChairOrBox {
  return CHAIRS.includes(value as ChairOrBox);
}

export interface BeautyService {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  cost?: number;
  category?: string;
  active?: boolean;
}

interface Stylist {
  id: string;
  name: string;
  commissionRate: number; // e.g. 0.40
  totalEarnedCommissions: number;
  productCommissions: number;
}

interface BeautyAppointment {
  id: string;
  clientName: string;
  stylistId: string;
  service: BeautyService;
  time: string;
  status: BeautyAppointmentStatus;
  colorFormula: string;
  appliedProducts: string;
  chairOrBox: ChairOrBox;
  depositAmount: number;
  paymentStatus: PaymentStatus;
  recommendedProducts: string;
}

export const BEAUTY_SERVICES: BeautyService[] = [
  { id: 's1', name: 'Corte Unisex + Lavado', price: 9500, durationMins: 45 },
  { id: 's2', name: 'Coloración / Tintura Completa', price: 25000, durationMins: 120 },
  { id: 's3', name: 'Alisado Keratina Profesional', price: 32000, durationMins: 150 },
  { id: 's4', name: 'Perfilado de Cejas + Depilación', price: 4500, durationMins: 30 }
];

const INITIAL_STYLISTS: Stylist[] = [
  { id: 'st1', name: 'Sofía Martínez', commissionRate: 0.40, totalEarnedCommissions: 15000, productCommissions: 1200 },
  { id: 'st2', name: 'Claudio Barber', commissionRate: 0.35, totalEarnedCommissions: 8500, productCommissions: 800 }
];

const INITIAL_APPTS: BeautyAppointment[] = [
  { id: 'ba-1', clientName: 'Horacio Quiroga', stylistId: 'st2', service: BEAUTY_SERVICES[0], time: '11:00', status: 'reserved', colorFormula: '', appliedProducts: 'Shampoo Neutro', chairOrBox: 'Silla 2', depositAmount: 2000, paymentStatus: 'señado', recommendedProducts: 'Cera Fijadora Matte' },
  { id: 'ba-2', clientName: 'Clara Vignolo', stylistId: 'st1', service: BEAUTY_SERVICES[1], time: '11:45', status: 'in_progress', colorFormula: 'Tono 7.3 + Oxidante 20vol (1:1)', appliedProducts: 'Sérum Argan', chairOrBox: 'Silla 1', depositAmount: 0, paymentStatus: 'pending', recommendedProducts: 'Shampoo Care Color' },
  { id: 'ba-3', clientName: 'Florencia Luna', stylistId: 'st1', service: BEAUTY_SERVICES[3], time: '13:00', status: 'completed', colorFormula: '', appliedProducts: '', chairOrBox: 'Silla 1', depositAmount: 0, paymentStatus: 'paid', recommendedProducts: '' }
];

interface BeautyConsoleProps {
  services?: BeautyService[];
  onServiceCompleted?: (serviceId: string) => void;
}

export default function BeautyConsole({ services = BEAUTY_SERVICES, onServiceCompleted }: BeautyConsoleProps) {
  const [appointments, setAppointments] = useState<BeautyAppointment[]>(INITIAL_APPTS);
  const [stylists, setStylists] = useState<Stylist[]>(INITIAL_STYLISTS);
  const [selectedAppt, setSelectedAppt] = useState<BeautyAppointment | null>(INITIAL_APPTS[1]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // FASE 3: Calculador de Mezclas de Coloración Capilar
  const [baseTone, setBaseTone] = useState('Castaño Oscuro (3)');
  const [targetTone, setTargetTone] = useState('Rubio Dorado (8.3)');

  const handleCalculateMix = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    let peroxideVol = '20 Vol.';
    let ratio = '1:1.5 (Tinte + Oxidante)';
    let timeMins = '35 minutos';
    
    if (targetTone.includes('Platinado') || targetTone.includes('10')) {
      peroxideVol = '30 Vol. o 40 Vol.';
      ratio = '1:2 (Polvo Decolorante + Oxidante)';
      timeMins = '45 minutos (Monitoreo visual)';
    } else if (targetTone.includes('Rubio') || targetTone.includes('8')) {
      peroxideVol = '30 Vol.';
      ratio = '1:1.5 (Tinte Superaclarante + Oxidante)';
      timeMins = '40 minutos';
    } else if (targetTone.includes('Cobrizo') || targetTone.includes('7')) {
      peroxideVol = '20 Vol.';
      ratio = '1:1.5 (Tinte Cobrizo + Oxidante)';
      timeMins = '35 minutos';
    }

    const recommendation = `Base: ${baseTone} -> Deseado: ${targetTone}. Mezclar en proporción ${ratio} con agua oxigenada de ${peroxideVol}. Tiempo de exposición recomendado: ${timeMins}.`;

    setColorFormula(recommendation);
    setFeedback({ type: 'success', message: 'Fórmula química calculada y copiada al borrador de ficha técnica.' });
  };

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [stylistFilter, setStylistFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  // Form turnero
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [selectedStylistId, setSelectedStylistId] = useState('st1');
  const [selectedServiceId, setSelectedServiceId] = useState('s1');
  const [newTime, setNewTime] = useState('14:00');
  const [newChair, setNewChair] = useState<ChairOrBox>('Silla 1');
  const [newDeposit, setNewDeposit] = useState(0);

  // Form técnica capilar
  const [colorFormula, setColorFormula] = useState('');
  const [appliedProducts, setAppliedProducts] = useState('');
  const [recProducts, setRecProducts] = useState('');

  // Modal Comprobante
  const [printComprobante, setPrintComprobante] = useState<BeautyAppointment | null>(null);

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient) return;

    const service = services.find(s => s.id === selectedServiceId) || services[0];
    if (!service) return;

    const newAppt: BeautyAppointment = {
      id: `ba-${Date.now()}`,
      clientName: newClient,
      stylistId: selectedStylistId,
      service,
      time: newTime,
      status: 'reserved',
      colorFormula: '',
      appliedProducts: '',
      chairOrBox: newChair,
      depositAmount: Number(newDeposit),
      paymentStatus: newDeposit > 0 ? 'señado' : 'pending',
      recommendedProducts: ''
    };

    setAppointments(prev => [...prev, newAppt]);
    setSelectedAppt(newAppt);
    setIsAddModalOpen(false);
    setNewClient('');
    setNewDeposit(0);
    setFeedback({ type: 'success', message: `Turno agendado en ${newChair} para ${newClient}.` });
  };

  const handleStatusChange = (id: string, status: BeautyAppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (selectedAppt && selectedAppt.id === id) {
      setSelectedAppt(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleCheckoutAppointment = (appt: BeautyAppointment) => {
    const servicePrice = appt.service.price;
    const stylist = stylists.find(s => s.id === appt.stylistId);
    
    if (stylist) {
      const remainingToPay = servicePrice - appt.depositAmount;
      const commissionAmount = servicePrice * stylist.commissionRate;
      const productCommission = appt.recommendedProducts ? 500 : 0;
      
      setStylists(prev => prev.map(s => s.id === stylist.id 
        ? { 
            ...s, 
            totalEarnedCommissions: s.totalEarnedCommissions + commissionAmount,
            productCommissions: s.productCommissions + productCommission 
          }
        : s
      ));

      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, paymentStatus: 'paid', status: 'completed' } : a));
      if (selectedAppt && selectedAppt.id === appt.id) {
        setSelectedAppt(prev => prev ? { ...prev, paymentStatus: 'paid', status: 'completed' } : null);
      }

      setFeedback({
        type: 'success',
        message: `Cobro confirmado. Restante: $${remainingToPay.toLocaleString()} | Comisión: $${(commissionAmount + productCommission).toLocaleString()}.`
      });
      onServiceCompleted?.(appt.service.id);
    }
  };

  const handleSaveTechnicalSheet = () => {
    if (!selectedAppt) return;
    setAppointments(prev => prev.map(a => {
      if (a.id === selectedAppt.id) {
        const updated = { ...a, colorFormula, appliedProducts, recommendedProducts: recProducts };
        setSelectedAppt(updated);
        return updated;
      }
      return a;
    }));
    setFeedback({ type: 'success', message: 'Ficha técnica capilar y preferencias del cliente actualizadas.' });
  };

  const handleSendReminder = (appt: BeautyAppointment) => {
    const text = `Hola ${appt.clientName}, te recordamos tu turno hoy a las ${appt.time} hs para ${appt.service.name} en SASS Estilistas. ¡Te esperamos!`;
    setFeedback({ type: 'success', message: `Recordatorio enviado a ${appt.clientName}: "${text}"` });
  };

  // Filtrar
  const filteredAppointments = useMemo(() => appointments.filter(appt => {
    const matchSearch = appt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        appt.service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStylist = stylistFilter === 'all' || appt.stylistId === stylistFilter;
    const matchService = serviceFilter === 'all' || appt.service.name === serviceFilter;

    return matchSearch && matchStylist && matchService;
  }), [appointments, searchTerm, serviceFilter, stylistFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Scissors className="h-6 w-6 text-pink-400 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">Consola de Salón & Fichas de Estilistas</h1>
            <p className="text-slate-400 text-xs mt-0.5">Control de agendas por silla, señas de turnos y comisiones de coloración profesional.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Turno Silla
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-semibold ${
          feedback.type === 'success'
            ? 'border-emerald-500/25 bg-emerald-950/20 text-emerald-300'
            : 'border-rose-500/25 bg-rose-950/20 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-950 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Turnos de Hoy</span>
          <span className="text-xl font-black text-white mt-1 block">{appointments.length}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">En Atención (Sillas)</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {appointments.filter(a => a.status === 'in_progress').length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Señas Recibidas</span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            ${appointments.reduce((acc, curr) => acc + curr.depositAmount, 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Comisión Estilistas</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">
            ${stylists.reduce((acc, curr) => acc + curr.totalEarnedCommissions + curr.productCommissions, 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Servicio Estrella</span>
          <span className="text-xs font-bold text-pink-400 mt-2 block truncate">Tintura Completa</span>
        </div>
      </div>

      {/* Alertas Rápidas */}
      {appointments.some(a => a.status === 'reserved' && a.paymentStatus === 'pending') && (
        <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-550 animate-pulse" />
            <span>Alerta de Caja: Hay turnos programados próximos a ingresar sin seña de reserva registrada.</span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Cliente / Servicio</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none"
            />
            <Search className="h-3.5 w-3.5 text-slate-650 absolute left-2.5 top-3" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Filtrar por Estilista</label>
          <select
            value={stylistFilter}
            onChange={e => setStylistFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Estilistas</option>
            {stylists.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Filtrar por Servicio</label>
          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Servicios</option>
            <option value="Corte Unisex + Lavado">Corte Unisex</option>
            <option value="Coloración / Tintura Completa">Tintura Completa</option>
            <option value="Perfilado de Cejas + Depilación">Perfilado de Cejas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agenda Sillas */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Layers className="h-4.5 w-4.5 text-pink-400" />
            Agenda por Sillas / Boxes
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                Sin turnos con los filtros activos.
              </div>
            ) : (
              filteredAppointments.map(appt => {
                const active = selectedAppt?.id === appt.id;
                const stylist = stylists.find(s => s.id === appt.stylistId);
                return (
                  <div
                    key={appt.id}
                    onClick={() => {
                      setSelectedAppt(appt);
                      setColorFormula(appt.colorFormula);
                      setAppliedProducts(appt.appliedProducts);
                      setRecProducts(appt.recommendedProducts);
                    }}
                    className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                      active ? 'bg-pink-950/10 border-pink-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-white">{appt.clientName}</span>
                      <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                        {appt.chairOrBox}
                      </span>
                    </div>
                    
                    <span className="text-[10px] text-slate-400 block mt-1">Estilista: {stylist?.name} | Hora: {appt.time}hs</span>
                    <span className="text-[10px] text-cyan-400 block font-semibold">{appt.service.name} (${appt.service.price.toLocaleString()})</span>

                    <div className="mt-3 flex justify-between items-center border-t border-slate-950 pt-2.5">
                      <select
                        value={appt.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          if (isBeautyStatus(e.target.value)) {
                            handleStatusChange(appt.id, e.target.value);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-350 focus:outline-none"
                      >
                        <option value="reserved">Reservado</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="in_progress">En Atención</option>
                        <option value="completed">Finalizado</option>
                        <option value="absent">Ausente</option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleSendReminder(appt);
                          }}
                          className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setPrintComprobante(appt);
                          }}
                          className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Printer className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ficha Técnica & Liquidaciones */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Ficha Capilar del Cliente */}
          {selectedAppt ? (
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-extrabold text-base text-white">{selectedAppt.clientName}</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Servicio: {selectedAppt.service.name} | Ubicación: {selectedAppt.chairOrBox} | Seña: ${selectedAppt.depositAmount}
                  </span>
                </div>

                {selectedAppt.paymentStatus !== 'paid' ? (
                  <button
                    onClick={() => handleCheckoutAppointment(selectedAppt)}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold rounded-xl text-xs uppercase"
                  >
                    Cobrar & Cerrar Servicio
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold text-[10px] rounded-xl uppercase">
                    Pagado
                  </span>
                )}
              </div>

              {/* Fórmulas Técnicas capilares */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5" />
                  Historial Técnico Capilar & Coloración
                </span>

                {/* FASE 3: Calculador Químico Capilar */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3 text-xs">
                  <span className="text-[10px] text-pink-400 font-bold uppercase block">Asistente Mezclador de Tintura & Decolorantes</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 font-bold uppercase block">Tono Base Cliente</label>
                      <select
                        value={baseTone}
                        onChange={e => setBaseTone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                      >
                        <option value="Castaño Oscuro (3)">Castaño Oscuro (3)</option>
                        <option value="Castaño Claro (5)">Castaño Claro (5)</option>
                        <option value="Rubio Oscuro (6)">Rubio Oscuro (6)</option>
                        <option value="Rubio Claro (8)">Rubio Claro (8)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 font-bold uppercase block">Tono Deseado</label>
                      <select
                        value={targetTone}
                        onChange={e => setTargetTone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                      >
                        <option value="Rubio Dorado (8.3)">Rubio Dorado (8.3)</option>
                        <option value="Cobrizo Claro (7.4)">Cobrizo Claro (7.4)</option>
                        <option value="Platinado Ultra (10.1)">Platinado Ultra (10.1)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleCalculateMix}
                      className="self-end px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-pink-400 font-bold rounded-xl text-[10px] uppercase cursor-pointer"
                    >
                      Calcular Mezcla
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-bold uppercase block">Fórmula de Tintura Usada</label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Tono 8.1 + 20vol (1:1)..."
                      value={colorFormula}
                      onChange={e => setColorFormula(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-bold uppercase block">Tratamiento Aplicado</label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Sérum argán anticaída..."
                      value={appliedProducts}
                      onChange={e => setAppliedProducts(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-bold uppercase block">Productos Recomendados</label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Crema protectora de color Alba..."
                      value={recProducts}
                      onChange={e => setRecProducts(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveTechnicalSheet}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 text-xs font-bold rounded-xl"
                >
                  Guardar Ficha Capilar
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/40 p-10 rounded-3xl border border-slate-850 text-center text-slate-650 text-xs italic">
              Selecciona un turno para registrar coloración capilar o comisiones.
            </div>
          )}

          {/* Liquidación de Estilistas */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <DollarSign className="h-4.5 w-4.5 text-pink-400" />
              Comisiones de Profesionales (Peluqueros)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stylists.map(s => (
                <div key={s.id} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-200">{s.name}</span>
                    <span className="text-[9px] text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                      Tasa: {s.commissionRate * 100}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 border-t border-slate-900 pt-2">
                    <div>
                      <span>Comisión Servicios</span>
                      <span className="font-bold text-slate-350 block mt-0.5">${s.totalEarnedCommissions.toLocaleString()}</span>
                    </div>
                    <div>
                      <span>Comisión Productos</span>
                      <span className="font-bold text-slate-350 block mt-0.5">${s.productCommissions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FASE 3: Grilla de Sillones Físicos en Salón */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <Layers className="h-4.5 w-4.5 text-pink-400" />
              Distribución Física de Sillones (Sillas Activas)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CHAIRS.map(chair => {
                const activeAppt = appointments.find(a => a.chairOrBox === chair && (a.status === 'in_progress' || a.status === 'reserved' || a.status === 'confirmed'));
                const isOccupied = activeAppt?.status === 'in_progress';
                const isReserved = activeAppt && !isOccupied;

                return (
                  <div key={chair} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col justify-between min-h-[120px] text-xs gap-3 text-left">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-slate-200">{chair}</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          isOccupied ? 'bg-pink-500/10 text-pink-450 border border-pink-500/20' :
                          isReserved ? 'bg-cyan-500/10 text-cyan-450 border border-cyan-500/20' :
                          'bg-slate-900 text-slate-550 border border-slate-800'
                        }`}>
                          {isOccupied ? 'En Atención' : isReserved ? 'Reservado' : 'Disponible'}
                        </span>
                      </div>

                      {activeAppt ? (
                        <div className="space-y-1 mt-2">
                          <span className="text-[10px] text-slate-350 block font-bold truncate">Huésped: {activeAppt.clientName}</span>
                          <span className="text-[9px] text-slate-500 block truncate">Servicio: {activeAppt.service.name}</span>
                          <span className="text-[9px] text-slate-500 block font-mono">Hora: {activeAppt.time} hs</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-650 italic block mt-2">Sillón libre</span>
                      )}
                    </div>

                    {isOccupied && (
                      <button
                        onClick={() => handleCheckoutAppointment(activeAppt)}
                        className="w-full py-1 bg-pink-600 hover:bg-pink-500 text-slate-950 font-black rounded-lg text-[9px] uppercase cursor-pointer"
                      >
                        Cobrar & Liberar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Modal Agendar Turno */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">Agendar Turno en Salón</h2>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clara Vignolo"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Estilista</label>
                  <select
                    value={selectedStylistId}
                    onChange={e => setSelectedStylistId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {stylists.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Silla / Box</label>
                  <select
                    value={newChair}
                    onChange={e => {
                      if (isChairOrBox(e.target.value)) {
                        setNewChair(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="Silla 1">Silla 1</option>
                    <option value="Silla 2">Silla 2</option>
                    <option value="Silla 3">Silla 3</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Seña de Turno ($)</label>
                  <input
                    type="number"
                    value={newDeposit}
                    onChange={e => setNewDeposit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Hora</label>
                  <input
                    type="text"
                    required
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Servicio Solicitado</label>
                <select
                  value={selectedServiceId}
                  onChange={e => setSelectedServiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (${s.price.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-xs"
                >
                  Confirmar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impresión Comprobante */}
      {printComprobante && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl text-slate-900 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Printer className="h-4.5 w-4.5 text-pink-500" />
                COMPROBANTE DE TURNO
              </h4>
              <button onClick={() => setPrintComprobante(null)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-center">
              SASS ESTILISTAS & COIFFURE{'\n'}
              Caja del Salón{'\n\n'}
              Cliente: {printComprobante.clientName}{'\n'}
              Servicio: {printComprobante.service.name}{'\n'}
              Hora: {printComprobante.time} hs | {printComprobante.chairOrBox}{'\n'}
              Seña Abonada: ${printComprobante.depositAmount.toLocaleString()}{'\n'}
              Total Servicio: ${printComprobante.service.price.toLocaleString()}{'\n\n'}
              ¡Te esperamos en nuestro salón!
            </p>

            <button
              onClick={() => {
                setFeedback({ type: 'success', message: 'Comprobante de turno enviado a impresión.' });
                setPrintComprobante(null);
              }}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Imprimir Comprobante
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
