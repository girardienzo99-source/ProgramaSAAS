'use client';

import React, { useMemo, useState } from 'react';
import {
  Shirt, Plus, CheckCircle2, Tags, AlertTriangle, RefreshCw, Search, Printer, X
} from 'lucide-react';

type GarmentType = 'Camisa' | 'Pantalón' | 'Saco' | 'Vestido' | 'Campera' | 'Acolchado' | 'Cortina' | 'Alfombra';
type StainType = 'Ninguna' | 'Grasa/Aceite' | 'Tinta' | 'Café/Vino' | 'Óxido' | 'Barro';
type WashingCycle = 'Normal' | 'Ecológico (Eco)' | 'Delicado/Seda' | 'DryClean (Seco)';
type ServiceType = 'Lavado' | 'Secado' | 'Planchado' | 'Tintorería' | 'Costura' | 'Express';
type LaundryStatus = 'received' | 'classified' | 'washing' | 'drying' | 'ironing' | 'ready' | 'delivered';
type GarmentFilter = GarmentType | 'all';
type ServiceFilter = ServiceType | 'all';
type Feedback = { tone: 'success' | 'warning' | 'error'; message: string };

interface LaundryItem {
  id: string;
  clientName: string;
  clientPhone: string;
  garmentType: GarmentType;
  color: string;
  material: string;
  qty: number;
  stainNotes: string;
  stainType: StainType;
  washingCycle: WashingCycle;
  serviceType: ServiceType;
  status: LaundryStatus;
  deliveryDate: string;
  price: number;
  isPaid: boolean;
}

const GARMENT_TYPES: GarmentType[] = ['Camisa', 'Pantalón', 'Saco', 'Vestido', 'Campera', 'Acolchado', 'Cortina', 'Alfombra'];
const STAIN_TYPES: StainType[] = ['Ninguna', 'Grasa/Aceite', 'Tinta', 'Café/Vino', 'Óxido', 'Barro'];
const WASHING_CYCLES: WashingCycle[] = ['Normal', 'Ecológico (Eco)', 'Delicado/Seda', 'DryClean (Seco)'];
const SERVICE_TYPES: ServiceType[] = ['Lavado', 'Secado', 'Planchado', 'Tintorería', 'Costura', 'Express'];

const LAUNDRY_STATUS_LABELS: Record<LaundryStatus, string> = {
  received: 'Recepción',
  classified: 'Clasificado',
  washing: 'Lavando',
  drying: 'Secando',
  ironing: 'Planchando',
  ready: 'Listo para Entrega',
  delivered: 'Entregado'
};

const LAUNDRY_STATUS_STEPS: Array<{ label: string; status: LaundryStatus }> = Object.entries(LAUNDRY_STATUS_LABELS)
  .map(([status, label]) => ({ status: status as LaundryStatus, label }));

const GARMENT_FILTERS: Array<{ label: string; value: GarmentFilter }> = [
  { label: 'Todas las Prendas', value: 'all' },
  ...GARMENT_TYPES.map(type => ({ label: type, value: type }))
];

const SERVICE_FILTERS: Array<{ label: string; value: ServiceFilter }> = [
  { label: 'Todos los Servicios', value: 'all' },
  ...SERVICE_TYPES.map(type => ({ label: type, value: type }))
];

const isGarmentType = (value: string): value is GarmentType =>
  GARMENT_TYPES.includes(value as GarmentType);

const isStainType = (value: string): value is StainType =>
  STAIN_TYPES.includes(value as StainType);

const isWashingCycle = (value: string): value is WashingCycle =>
  WASHING_CYCLES.includes(value as WashingCycle);

const isServiceType = (value: string): value is ServiceType =>
  SERVICE_TYPES.includes(value as ServiceType);

const isGarmentFilter = (value: string): value is GarmentFilter =>
  GARMENT_FILTERS.some(option => option.value === value);

const isServiceFilter = (value: string): value is ServiceFilter =>
  SERVICE_FILTERS.some(option => option.value === value);

const todayPlusDaysISO = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const INITIAL_LAUNDRY: LaundryItem[] = [
  { id: 'l-1001', clientName: 'Horacio Quiroga', clientPhone: '11-5841-2532', garmentType: 'Saco', color: 'Gris Melange', material: 'Lana Merino', qty: 1, stainNotes: 'Mancha de grasa en solapa izquierda.', stainType: 'Grasa/Aceite', washingCycle: 'DryClean (Seco)', serviceType: 'Tintorería', status: 'washing', deliveryDate: '2026-07-12', price: 8500, isPaid: true },
  { id: 'l-1002', clientName: 'Clara Vignolo', clientPhone: '11-9988-7733', garmentType: 'Vestido', color: 'Rojo Carmín', material: 'Seda', qty: 1, stainNotes: 'Sin manchas. Lavado ecológico.', stainType: 'Ninguna', washingCycle: 'Delicado/Seda', serviceType: 'Tintorería', status: 'ironing', deliveryDate: '2026-07-11', price: 15000, isPaid: false },
  { id: 'l-1003', clientName: 'Marcos Juárez', clientPhone: '11-5544-3322', garmentType: 'Camisa', color: 'Blanco', material: 'Algodón', qty: 3, stainNotes: 'Manchas de café en puño derecho.', stainType: 'Café/Vino', washingCycle: 'Normal', serviceType: 'Planchado', status: 'ready', deliveryDate: '2026-07-09', price: 4200, isPaid: true }
];

export default function LaundryConsole() {
  const [laundryItems, setLaundryItems] = useState<LaundryItem[]>(INITIAL_LAUNDRY);
  const [selectedItem, setSelectedItem] = useState<LaundryItem | null>(INITIAL_LAUNDRY[0]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // FASE 3: Estado de Lavadoras/Secadoras Industriales IoT
  const [machines, setMachines] = useState([
    { id: 'm1', name: 'Lavarropas Industrial #1', type: 'washing', status: 'available', timeRemaining: 0, ticketId: null as string | null },
    { id: 'm2', name: 'Lavarropas Industrial #2', type: 'washing', status: 'available', timeRemaining: 0, ticketId: null as string | null },
    { id: 'm3', name: 'Secadora Centrífuga #1', type: 'drying', status: 'available', timeRemaining: 0, ticketId: null as string | null },
    { id: 'm4', name: 'Secadora Centrífuga #2', type: 'drying', status: 'available', timeRemaining: 0, ticketId: null as string | null }
  ]);

  // Recetas químicas de desmanchado técnico
  const STAIN_RECIPES: Record<StainType, string> = {
    'Ninguna': 'Prenda sin manchas detectadas. Lavar según ciclo estándar.',
    'Grasa/Aceite': 'Tratamiento: Aplicar solvente orgánico pre-lavado en seco. Centrifugado a temperatura templada.',
    'Tinta': 'Tratamiento: Tratar mancha con alcohol isopropílico antes de lavado. No planchar hasta remover.',
    'Café/Vino': 'Tratamiento: Limpieza con solución ácida diluida y agua fría. Enjuague abundante.',
    'Óxido': 'Tratamiento: Tratar con ácido oxálico. Lavar por separado para evitar transferencia.',
    'Barro': 'Tratamiento: Dejar secar, cepillar el exceso. Lavado con detergente enzimático estándar.'
  };

  // Temporizador activo para centrifugados y lavados
  React.useEffect(() => {
    const timer = setInterval(() => {
      setMachines(prev => prev.map(m => {
        if (m.status === 'running') {
          if (m.timeRemaining <= 1) {
            return { ...m, status: 'completed', timeRemaining: 0 };
          }
          return { ...m, timeRemaining: m.timeRemaining - 1 };
        }
        return m;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [garmentFilter, setGarmentFilter] = useState<GarmentFilter>('all');

  // Form ingreso prendas
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGarment, setNewGarment] = useState<LaundryItem['garmentType']>('Camisa');
  const [newColor, setNewColor] = useState('Blanco');
  const [newMaterial, setNewMaterial] = useState('Algodón');
  const [newQty, setNewQty] = useState(1);
  const [newStains, setNewStains] = useState('');
  const [newStainType, setNewStainType] = useState<LaundryItem['stainType']>('Ninguna');
  const [newCycle, setNewCycle] = useState<LaundryItem['washingCycle']>('Normal');
  const [newService, setNewService] = useState<LaundryItem['serviceType']>('Lavado');
  const [newPrice, setNewPrice] = useState(4200);
  const [newIsPaid, setNewIsPaid] = useState(false);

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleRegisterGarment = (e: React.FormEvent) => {
    e.preventDefault();
    const clientName = newClient.trim();
    const qty = Number(newQty);
    const price = Number(newPrice);

    if (!clientName || qty <= 0 || price <= 0) {
      setFeedback({ tone: 'error', message: 'Completá cliente, cantidad y precio con valores válidos.' });
      return;
    }

    const newItem: LaundryItem = {
      id: `l-${1000 + laundryItems.length + 1}`,
      clientName,
      clientPhone: newPhone.trim() || 'N/A',
      garmentType: newGarment,
      color: newColor.trim(),
      material: newMaterial.trim(),
      qty,
      stainNotes: newStains.trim() || 'Sin manchas visibles.',
      stainType: newStainType,
      washingCycle: newCycle,
      serviceType: newService,
      status: 'received',
      deliveryDate: todayPlusDaysISO(3),
      price,
      isPaid: newIsPaid
    };

    setLaundryItems(prev => [...prev, newItem]);
    setSelectedItem(newItem);
    setIsAddModalOpen(false);

    // Reset
    setNewClient('');
    setNewPhone('');
    setNewStains('');
    setFeedback({ tone: 'success', message: 'Prendas ingresadas y ticket de lavado emitido.' });
  };

  const handleUpdateStatus = (id: string, status: LaundryStatus) => {
    setLaundryItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(prev => prev ? { ...prev, status } : null);
    }
    setFeedback({ tone: 'success', message: `Estado actualizado a ${LAUNDRY_STATUS_LABELS[status]}.` });
  };

  const handlePayTicket = () => {
    if (!selectedItem) return;

    const updated: LaundryItem = { ...selectedItem, isPaid: true };

    setLaundryItems(prev => prev.map(item => item.id === updated.id ? updated : item));
    setSelectedItem(updated);

    setFeedback({ tone: 'success', message: 'Pago de ticket de tintorería registrado con éxito.' });
  };

  // FASE 3: Iniciar ciclo en lavadora/secadora
  const handleStartMachineCycle = (machineId: string) => {
    if (!selectedItem) return;
    
    setMachines(prev => prev.map(m => {
      if (m.id === machineId) {
        return {
          ...m,
          status: 'running',
          timeRemaining: 30,
          ticketId: selectedItem.id
        };
      }
      return m;
    }));

    setFeedback({ tone: 'success', message: `Ciclo de lavado/secado iniciado en máquina para el ticket ${selectedItem.id}.` });
  };

  const handlePrintRetiroTicket = (item: LaundryItem) => {
    setPrintModalContent({
      title: `TICKET DE RETIRO / TINTORERÍA`,
      content: `SASS TINTORERÍAS & LAVANDERÍA\n\nTicket ID: ${item.id.toUpperCase()}\nCliente: ${item.clientName}\nTeléfono: ${item.clientPhone}\n\nDetalle Prendas:\n- ${item.qty}x ${item.garmentType} (${item.color})\n- Servicio: ${item.serviceType}\n- Ciclo de Lavado: ${item.washingCycle}\n\nObservaciones/Manchas: ${item.stainNotes}\n\nFecha Retiro Pactada: ${item.deliveryDate}\nPrecio Total: $${item.price.toLocaleString()}\nPago: ${item.isPaid ? 'ANTICIPADO (PAGADO)' : 'AL RETIRAR (IMPAGO)'}\n\n¡Conserve este ticket para el retiro!`
    });
  };

  const handlePrintWashLabel = (item: LaundryItem) => {
    setPrintModalContent({
      title: `ETIQUETA DE LAVADO / ROTULADO`,
      content: `ETIQUETA DE CLASIFICACIÓN INTERNA\n\nID PRENDA: ${item.id.toUpperCase()}\n\nCliente: ${item.clientName}\nTipo: ${item.garmentType} | Color: ${item.color}\nMaterial: ${item.material}\n\nTipo Mancha: ${item.stainType.toUpperCase()}\nCiclo Técnico: ${item.washingCycle.toUpperCase()}\nServicio: ${item.serviceType.toUpperCase()}\n\nSASS TALLER DE LIMPIEZA`
    });
  };

  const metrics = useMemo(() => ({
    activeCount: laundryItems.filter(item => item.status !== 'delivered').length,
    inProcessCount: laundryItems.filter(item => ['washing', 'drying', 'ironing'].includes(item.status)).length,
    readyCount: laundryItems.filter(item => item.status === 'ready').length,
    dueTodayCount: laundryItems.filter(item => item.deliveryDate <= new Date().toISOString().split('T')[0] && item.status !== 'delivered').length,
    paidRevenue: laundryItems.filter(item => item.isPaid).reduce((acc, curr) => acc + curr.price, 0)
  }), [laundryItems]);

  // Filtrado
  const filteredLaundryItems = useMemo(() => laundryItems.filter(item => {
    const matchSearch = item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.includes(searchTerm);
    const matchService = serviceFilter === 'all' || item.serviceType === serviceFilter;
    const matchGarment = garmentFilter === 'all' || item.garmentType === garmentFilter;

    return matchSearch && matchService && matchGarment;
  }), [laundryItems, searchTerm, serviceFilter, garmentFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Shirt className="h-6 w-6 text-slate-350 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">Recepción de Prendas & Control de Taller</h1>
            <p className="text-slate-400 text-xs mt-0.5">Control de lavado, secado, planchado y rotulado con especificación de manchas.</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Ingresar Prendas
        </button>
      </div>

      {/* Métricas Rápidas */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
          feedback.tone === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            : feedback.tone === 'warning'
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
        }`}>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {feedback.message}
          </span>
          <button onClick={() => setFeedback(null)} className="text-current/70 hover:text-current">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Tickets Activos</span>
          <span className="text-xl font-black text-white mt-1 block">{metrics.activeCount}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Prendas en Proceso</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {metrics.inProcessCount}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Prendas Listas</span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">{metrics.readyCount}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Por entregar hoy</span>
          <span className="text-xl font-black text-amber-500 mt-1 block">{metrics.dueTodayCount}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Recaudación Turno</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">
            ${metrics.paidRevenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Alertas Críticas */}
      {laundryItems.some(item => !item.isPaid && item.status === 'ready') && (
        <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-550 animate-pulse" />
            <span>Alerta de Caja: Existen prendas en estado "Listo para Entrega" con saldos de pago pendientes de cobro.</span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Cliente / Nro Ticket</label>
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
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Tipo Prenda</label>
          <select
            value={garmentFilter}
            onChange={e => {
              if (isGarmentFilter(e.target.value)) setGarmentFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {GARMENT_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Servicio Solicitado</label>
          <select
            value={serviceFilter}
            onChange={e => {
              if (isServiceFilter(e.target.value)) setServiceFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {SERVICE_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Prendas en taller */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Tags className="h-4.5 w-4.5 text-cyan-400" />
            Prendas en Taller
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredLaundryItems.map(item => {
              const active = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                    active ? 'bg-cyan-950/10 border-cyan-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-xs text-white">{item.clientName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">#{item.id}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">{item.garmentType} ({item.color}) | Cant: {item.qty}</span>

                  <div className="mt-3 flex justify-between items-center border-t border-slate-900 pt-2 text-[10px]">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      item.status === 'ready' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                      item.status === 'washing' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {LAUNDRY_STATUS_LABELS[item.status]}
                    </span>
                    <span className="font-bold text-slate-350">${item.price.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalle Prenda & Etapas */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 flex flex-col justify-between min-h-[480px]">
          {selectedItem ? (
            <div className="space-y-6">
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">{selectedItem.garmentType} ({selectedItem.material})</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Cliente: {selectedItem.clientName} (${selectedItem.clientPhone}) | Entrega: {selectedItem.deliveryDate}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintRetiroTicket(selectedItem)}
                    className="p-2 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850"
                  >
                    <Printer className="h-3.5 w-3.5 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => handlePrintWashLabel(selectedItem)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 font-bold rounded-xl text-[10px]"
                  >
                    Etiqueta Lavado
                  </button>
                  {!selectedItem.isPaid ? (
                    <button
                      onClick={handlePayTicket}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs uppercase"
                    >
                      Registrar Pago
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold text-[10px] rounded-xl uppercase">
                      Pagado
                    </span>
                  )}
                </div>
              </div>

              {/* Rotulado y Manchas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs">
                  <span className="text-[9px] text-slate-550 font-bold uppercase block">Ciclo Técnico</span>
                  <span className="font-bold text-slate-300 block mt-0.5">{selectedItem.washingCycle}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs">
                  <span className="text-[9px] text-slate-550 font-bold uppercase block">Tipo Mancha</span>
                  <span className="font-bold text-slate-300 block mt-0.5">{selectedItem.stainType}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs">
                  <span className="text-[9px] text-slate-550 font-bold uppercase block">Detalle de Manchas</span>
                  <span className="text-rose-455 font-bold block mt-0.5">{selectedItem.stainNotes}</span>
                </div>
              </div>

              {/* FASE 3: Asistente Técnico de Desmanchado */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex gap-3.5 items-center">
                <div className="p-3 bg-cyan-950/20 text-cyan-400 border border-cyan-500/25 rounded-2xl shrink-0">
                  <Tags className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wider">Receta Química de Desmanchado</span>
                  <p className="text-slate-300 font-semibold italic">
                    "{STAIN_RECIPES[selectedItem.stainType]}"
                  </p>
                </div>
              </div>

              {/* Monitor de Etapas */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  Actualizar Estado de Procesamiento
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LAUNDRY_STATUS_STEPS.map(step => (
                    <button
                      key={step.status}
                      onClick={() => handleUpdateStatus(selectedItem.id, step.status)}
                      className={`py-2 px-3 text-[10px] font-bold rounded-xl border transition-all ${
                        selectedItem.status === step.status 
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                          : 'bg-slate-900 border-slate-855 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-28 text-slate-650 text-xs my-auto">
              <Shirt className="h-10 w-10 mx-auto mb-2 text-slate-800" />
              Selecciona una prenda en taller para inspeccionar estado de lavado y manchas.
            </div>
          )}
        </div>
      </div>

      {/* FASE 3: Monitor de Lavado IoT y Centrifugado */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
            <RefreshCw className="h-4.5 w-4.5 text-cyan-400" />
            Maquinaria de Lavandería Industrial (Monitoreo IoT)
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Asigná el ticket de prenda seleccionado para iniciar el proceso de lavado/secado mecánico y visualizar tiempos restantes en tiempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {machines.map(m => {
            const isRunning = m.status === 'running';
            const isCompleted = m.status === 'completed';
            return (
              <div key={m.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-3.5 flex flex-col justify-between text-xs">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200">{m.name}</span>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      isRunning ? 'bg-amber-500/10 text-amber-450 border border-amber-500/20' :
                      isCompleted ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                      'bg-slate-900 text-slate-550 border border-slate-800'
                    }`}>
                      {m.status === 'available' ? 'Disponible' : isRunning ? 'Ejecutando' : 'Completado'}
                    </span>
                  </div>
                  
                  <span className="text-[9px] text-slate-555 block mt-1 uppercase font-mono tracking-wide">
                    Tipo: {m.type === 'washing' ? 'Lavadora' : 'Secadora'}
                  </span>
                </div>

                {isRunning && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-slate-550">
                      <span>Ciclo en curso: {m.ticketId}</span>
                      <span>{m.timeRemaining}s</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        style={{ width: `${(m.timeRemaining / 30) * 100}%` }}
                        className="bg-cyan-500 h-full rounded-full transition-all duration-1000 animate-pulse"
                      ></div>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="text-[10px] text-emerald-455 font-bold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/10 text-center animate-pulse">
                    ✓ Ciclo Finalizado ({m.ticketId})
                  </div>
                )}

                {!isRunning && (
                  <button
                    onClick={() => handleStartMachineCycle(m.id)}
                    disabled={!selectedItem}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 disabled:opacity-50 text-slate-350 font-bold rounded-xl text-[10px] uppercase cursor-pointer"
                  >
                    Iniciar Ciclo
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Impresiones */}
      {printModalContent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-900 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">{printModalContent.title}</h4>
              <button onClick={() => setPrintModalContent(null)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono">
              {printModalContent.content}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPrintModalContent(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setFeedback({ tone: 'success', message: 'Ticket / rótulo enviado a impresión.' });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-550 text-slate-950 font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ingresar Prenda */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">Recepción de Prendas</h2>
            <form onSubmit={handleRegisterGarment} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Cliente</label>
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
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Celular Cliente</label>
                  <input
                    type="text"
                    placeholder="Ej: 11-5841-..."
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Prenda</label>
                  <select
                    value={newGarment}
                    onChange={e => {
                      if (isGarmentType(e.target.value)) setNewGarment(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {GARMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Ciclo Lavado</label>
                  <select
                    value={newCycle}
                    onChange={e => {
                      if (isWashingCycle(e.target.value)) setNewCycle(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {WASHING_CYCLES.map(cycle => (
                      <option key={cycle} value={cycle}>{cycle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Servicio Solicitado</label>
                  <select
                    value={newService}
                    onChange={e => {
                      if (isServiceType(e.target.value)) setNewService(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {SERVICE_TYPES.map(service => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Color</label>
                  <input
                    type="text"
                    required
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Material</label>
                  <input
                    type="text"
                    required
                    value={newMaterial}
                    onChange={e => setNewMaterial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Cant.</label>
                  <input
                    type="number"
                    required
                    value={newQty}
                    onChange={e => setNewQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Precio Cobrado ($)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={e => setNewPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Pago</label>
                  <select
                    value={newIsPaid ? 'yes' : 'no'}
                    onChange={e => setNewIsPaid(e.target.value === 'yes')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="no">Al Retirar (Impago)</option>
                    <option value="yes">Anticipado (Pagado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Clasificación Mancha</label>
                  <select
                    value={newStainType}
                    onChange={e => {
                      if (isStainType(e.target.value)) setNewStainType(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {STAIN_TYPES.map(stain => (
                      <option key={stain} value={stain}>{stain}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Rotulado / Detalle de Manchas</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Mancha de salsa en cuello..."
                  value={newStains}
                  onChange={e => setNewStains(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                />
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
                  className="px-5 py-2.5 bg-cyan-650 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Confirmar Recepción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
