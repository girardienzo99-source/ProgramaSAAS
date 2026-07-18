'use client';

import React, { useMemo, useState } from 'react';
import {
  Laptop, Search, Plus, X, Printer, Cpu, AlertTriangle, ClipboardList, CheckCircle2
} from 'lucide-react';

type WarrantyStatus = 'active' | 'expired' | 'extended';
type RmaStatus = 'none' | 'received' | 'diagnostic' | 'sent_to_supplier' | 'repaired' | 'replaced' | 'rejected';
type WarrantyFilter = WarrantyStatus | 'all';
type RmaFilter = RmaStatus | 'all';
type Feedback = { tone: 'success' | 'warning' | 'error'; message: string };

interface TimelineEntry {
  statusName: string;
  date: string;
  comment: string;
}

interface DeviceItem {
  id: string;
  clientName: string;
  deviceModel: string;
  serialNumber: string;
  imei: string;
  purchaseDate: string;
  warrantyExpiration: string;
  warrantyStatus: WarrantyStatus;
  rmaStatus: RmaStatus;
  accessoriesReceived: string[]; // ['Cargador', 'Caja', 'Cables']
  diagnosticNotes: string;
  historicalTimeline: TimelineEntry[];
}

const WARRANTY_LABELS: Record<WarrantyStatus, string> = {
  active: 'Activa',
  expired: 'Vencida',
  extended: 'Extendida'
};

const RMA_LABELS: Record<RmaStatus, string> = {
  none: 'Sin RMA',
  received: 'Recibido',
  diagnostic: 'En Diagnóstico',
  sent_to_supplier: 'En Proveedor',
  repaired: 'Reparado',
  replaced: 'Reemplazado',
  rejected: 'Rechazado'
};

const RMA_STEPS: Array<{ label: string; value: Exclude<RmaStatus, 'none'> }> = [
  { label: 'Recibido', value: 'received' },
  { label: 'Diagnóstico', value: 'diagnostic' },
  { label: 'En Proveedor', value: 'sent_to_supplier' },
  { label: 'Reparado', value: 'repaired' },
  { label: 'Reemplazado', value: 'replaced' },
  { label: 'Rechazado', value: 'rejected' }
];

const WARRANTY_FILTERS: Array<{ label: string; value: WarrantyFilter }> = [
  { label: 'Todas las Coberturas', value: 'all' },
  { label: 'Activa', value: 'active' },
  { label: 'Vencida', value: 'expired' },
  { label: 'Extendida', value: 'extended' }
];

const RMA_FILTERS: Array<{ label: string; value: RmaFilter }> = [
  { label: 'Todos los Estados', value: 'all' },
  { label: 'Sin RMA', value: 'none' },
  ...RMA_STEPS
];

const isWarrantyFilter = (value: string): value is WarrantyFilter =>
  WARRANTY_FILTERS.some(option => option.value === value);

const isRmaFilter = (value: string): value is RmaFilter =>
  RMA_FILTERS.some(option => option.value === value);

const todayISO = () => new Date().toISOString().split('T')[0];

const addYearsISO = (years: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split('T')[0];
};

const INITIAL_DEVICES: DeviceItem[] = [
  {
    id: 'dev-1',
    clientName: 'Eduardo Galeano',
    deviceModel: 'iPhone 15 Pro 256GB',
    serialNumber: 'SN-APL15P8892',
    imei: '358912345678901',
    purchaseDate: '2025-10-12',
    warrantyExpiration: '2026-10-12',
    warrantyStatus: 'active',
    rmaStatus: 'diagnostic',
    accessoriesReceived: ['Cargador', 'Caja Original'],
    diagnosticNotes: 'Pantalla con parpadeos verdes tras recalentamiento. Requiere cambio de módulo.',
    historicalTimeline: [
      { statusName: 'Venta Registrada', date: '2025-10-12', comment: 'Garantía oficial activa.' },
      { statusName: 'Ingreso RMA', date: '2026-07-01', comment: 'Presenta falla en panel OLED.' }
    ]
  },
  {
    id: 'dev-2',
    clientName: 'Paula Albarracín',
    deviceModel: 'Notebook ASUS ZenBook 14',
    serialNumber: 'SN-ASZ881122',
    imei: '',
    purchaseDate: '2024-05-15',
    warrantyExpiration: '2025-05-15',
    warrantyStatus: 'expired',
    rmaStatus: 'none',
    accessoriesReceived: [],
    diagnosticNotes: '',
    historicalTimeline: [
      { statusName: 'Venta Registrada', date: '2024-05-15', comment: 'Garantía 12 meses.' }
    ]
  },
  {
    id: 'dev-3',
    clientName: 'Marcos Juárez',
    deviceModel: 'Samsung Galaxy S24 Ultra',
    serialNumber: 'SN-SAM24U1155',
    imei: '351234123412345',
    purchaseDate: '2025-01-20',
    warrantyExpiration: '2027-01-20',
    warrantyStatus: 'extended',
    rmaStatus: 'repaired',
    accessoriesReceived: ['Cargador', 'Cables', 'Funda de Silicona'],
    diagnosticNotes: 'Batería inflada. Reemplazada por servicio técnico oficial.',
    historicalTimeline: [
      { statusName: 'Venta Registrada', date: '2025-01-20', comment: 'Garantía extendida contratada.' },
      { statusName: 'Ingreso RMA', date: '2026-06-15', comment: 'Falla en carga de batería.' },
      { statusName: 'Reparado', date: '2026-06-20', comment: 'Módulo de batería reemplazado.' }
    ]
  }
];

export default function ElectronicsConsole() {
  const [devices, setDevices] = useState<DeviceItem[]>(INITIAL_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(INITIAL_DEVICES[0]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState<WarrantyFilter>('all');
  const [rmaFilter, setRmaFilter] = useState<RmaFilter>('all');

  // Form ingreso de equipo RMA
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSn, setNewSn] = useState('');
  const [newImei, setNewImei] = useState('');
  
  // Checklist de accesorios
  const [hasCharger, setHasCharger] = useState(false);
  const [hasBox, setHasBox] = useState(false);
  const [hasCables, setHasCables] = useState(false);

  // Form diagnóstico
  const [notes, setNotes] = useState(INITIAL_DEVICES[0]?.diagnosticNotes ?? '');

  // Modales Impresión
  const [printModalContent, setPrintModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleCreateRMA = (e: React.FormEvent) => {
    e.preventDefault();
    const client = newClient.trim();
    const model = newModel.trim();
    const serialNumber = newSn.trim().toUpperCase();
    const imei = newImei.trim();

    if (!client || !model || !serialNumber) {
      setFeedback({ tone: 'error', message: 'Completá cliente, modelo y número de serie para registrar el ingreso.' });
      return;
    }

    const acc: string[] = [];
    if (hasCharger) acc.push('Cargador');
    if (hasBox) acc.push('Caja Original');
    if (hasCables) acc.push('Cables');

    const newDevice: DeviceItem = {
      id: `dev-${Date.now()}`,
      clientName: client,
      deviceModel: model,
      serialNumber,
      imei,
      purchaseDate: todayISO(),
      warrantyExpiration: addYearsISO(1),
      warrantyStatus: 'active',
      rmaStatus: 'received',
      accessoriesReceived: acc,
      diagnosticNotes: '',
      historicalTimeline: [
        { statusName: 'Ingreso RMA', date: todayISO(), comment: 'Equipo ingresado al laboratorio.' }
      ]
    };

    setDevices(prev => [newDevice, ...prev]);
    setSelectedDevice(newDevice);
    setNotes('');
    setIsAddModalOpen(false);
    setFeedback({ tone: 'success', message: `Ingreso RMA generado para ${newDevice.deviceModel}.` });

    // Reset
    setNewClient('');
    setNewModel('');
    setNewSn('');
    setNewImei('');
    setHasCharger(false);
    setHasBox(false);
    setHasCables(false);
  };

  const handleUpdateRMAStatus = (status: Exclude<RmaStatus, 'none'>) => {
    if (!selectedDevice) return;

    const updated: DeviceItem = {
      ...selectedDevice,
      rmaStatus: status,
      historicalTimeline: [
        ...selectedDevice.historicalTimeline,
        { statusName: `Estado: ${RMA_LABELS[status]}`, date: todayISO(), comment: 'Cambio de etapa en laboratorio.' }
      ]
    };

    setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDevice(updated);
    setFeedback({ tone: 'success', message: `RMA actualizado a ${RMA_LABELS[status]}.` });
  };

  const handleSaveDiagnostic = () => {
    if (!selectedDevice) return;

    const updated: DeviceItem = { ...selectedDevice, diagnosticNotes: notes.trim() };

    setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDevice(updated);
    setFeedback({ tone: 'success', message: 'Diagnóstico y peritaje del laboratorio guardados.' });
  };

  const handlePrintWarranty = (dev: DeviceItem) => {
    setPrintModalContent({
      title: `CERTIFICADO DE GARANTÍA OFICIAL`,
      content: `Cliente: ${dev.clientName}\nEquipo: ${dev.deviceModel}\nN/Serie: ${dev.serialNumber}\n${dev.imei ? `IMEI: ${dev.imei}\n` : ''}\nEstado de Cobertura: ${WARRANTY_LABELS[dev.warrantyStatus]}\nFecha de Compra: ${dev.purchaseDate}\nExpiración Garantía: ${dev.warrantyExpiration}\n\nSass Technology Corp.\nFirma Electrónica Autorizada`
    });
  };

  const handlePrintRMA = (dev: DeviceItem) => {
    setPrintModalContent({
      title: `TICKET DE INGRESO A LABORATORIO (RMA)`,
      content: `Ticket ID: ${dev.id.toUpperCase()}\nCliente: ${dev.clientName}\nEquipo: ${dev.deviceModel}\nN/Serie: ${dev.serialNumber}\n\nAccesorios Recibidos: ${dev.accessoriesReceived.join(', ') || 'Ninguno'}\nEstado Laboratorio: ${RMA_LABELS[dev.rmaStatus]}\nDiagnóstico Técnico: ${dev.diagnosticNotes || 'Pendiente de revisión.'}\n\nPresentar este ticket para retirar el equipo.`
    });
  };

  const metrics = useMemo(() => {
    const activeWarranties = devices.filter(d => d.warrantyStatus === 'active' || d.warrantyStatus === 'extended').length;
    const returnedDevices = devices.filter(d => d.rmaStatus === 'replaced' || d.rmaStatus === 'rejected').length;
    const returnRate = devices.length > 0 ? Math.round((returnedDevices / devices.length) * 100) : 0;

    return {
      total: devices.length,
      inDiagnostic: devices.filter(d => d.rmaStatus === 'diagnostic').length,
      activeWarranties,
      delayedRma: devices.filter(d => d.rmaStatus === 'sent_to_supplier').length,
      returnRate
    };
  }, [devices]);

  // Filtrar
  const filteredDevices = useMemo(() => devices.filter(d => {
    const matchSearch = d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        d.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.deviceModel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchWarranty = warrantyFilter === 'all' || d.warrantyStatus === warrantyFilter;
    const matchRma = rmaFilter === 'all' || d.rmaStatus === rmaFilter;

    return matchSearch && matchWarranty && matchRma;
  }), [devices, searchTerm, warrantyFilter, rmaFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Cpu className="h-6 w-6 text-cyan-400 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">Laboratorio de Soporte Técnico & RMA</h1>
            <p className="text-slate-400 text-xs mt-0.5">Control de números de serie/IMEI, diagnóstico técnico y trazabilidad de garantías oficiales.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-555 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Registrar Ingreso RMA
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
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Equipos Registrados</span>
          <span className="text-xl font-black text-white mt-1 block">{metrics.total}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">En Diagnóstico</span>
          <span className="text-xl font-black text-amber-450 mt-1 block">
            {metrics.inDiagnostic}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Garantías Activas</span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            {metrics.activeWarranties}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">RMA Demorados</span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {metrics.delayedRma}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Tasa de Devolución</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">{metrics.returnRate}%</span>
        </div>
      </div>

      {/* Alertas Críticas */}
      {devices.some(d => d.rmaStatus === 'sent_to_supplier') && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
            <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>Alerta de RMA: Hay dispositivos demorados en el taller oficial del fabricante (ASUS/Apple).</span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar por IMEI / Serie / Cliente</label>
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
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Estado Garantía</label>
          <select
            value={warrantyFilter}
            onChange={e => {
              if (isWarrantyFilter(e.target.value)) setWarrantyFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {WARRANTY_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Estado RMA</label>
          <select
            value={rmaFilter}
            onChange={e => {
              if (isRmaFilter(e.target.value)) setRmaFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {RMA_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Listado de Equipos */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Laptop className="h-4.5 w-4.5 text-cyan-400" />
            Inventario & Equipos
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredDevices.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                Sin resultados de equipos o tickets.
              </div>
            ) : (
              filteredDevices.map(dev => {
                const active = selectedDevice?.id === dev.id;
                return (
                  <div
                    key={dev.id}
                    onClick={() => {
                      setSelectedDevice(dev);
                      setNotes(dev.diagnosticNotes);
                    }}
                    className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                      active ? 'bg-cyan-950/10 border-cyan-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-white">{dev.deviceModel}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        dev.warrantyStatus === 'active' || dev.warrantyStatus === 'extended' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {WARRANTY_LABELS[dev.warrantyStatus]}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 block mt-1">Cliente: {dev.clientName}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">Serie: {dev.serialNumber}</span>
                    
                    {dev.rmaStatus !== 'none' && (
                      <span className="text-[9px] text-amber-500 block font-bold mt-2">
                        RMA Activo: {RMA_LABELS[dev.rmaStatus]}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detalle de Ficha y RMA */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
          {selectedDevice ? (
            <>
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">{selectedDevice.deviceModel}</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Serie: {selectedDevice.serialNumber} | Compra: {selectedDevice.purchaseDate} | Vto Garantía: {selectedDevice.warrantyExpiration}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintWarranty(selectedDevice)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 font-bold rounded-xl text-[10px] flex items-center gap-1"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Cert. Garantía
                  </button>
                  {selectedDevice.rmaStatus !== 'none' && (
                    <button
                      onClick={() => handlePrintRMA(selectedDevice)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-[10px]"
                    >
                      Ticket RMA
                    </button>
                  )}
                </div>
              </div>

              {/* Accesorios checklist al recibir */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] text-slate-550 font-bold uppercase block flex items-center gap-1">
                  <ClipboardList className="h-3.5 w-3.5 text-cyan-400" />
                  Accesorios Recibidos (Ingreso de Laboratorio)
                </span>
                <div className="flex gap-3 pt-1 text-slate-350">
                  {selectedDevice.accessoriesReceived.length === 0 ? (
                    <span className="text-slate-600 italic">Ningún accesorio entregado.</span>
                  ) : (
                    selectedDevice.accessoriesReceived.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-[10px]">
                        ✓ {a}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Timeline del Dispositivo */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-[10px] text-slate-550 font-bold uppercase block">Timeline / Historial del Equipo</span>
                <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                  {selectedDevice.historicalTimeline.map((item, i) => (
                    <div key={i} className="flex gap-2 text-xs items-start">
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.date}</span>
                      <span className="font-extrabold text-cyan-400">{item.statusName}:</span>
                      <span className="text-slate-300">{item.comment}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Laboratorio Técnico / Acciones RMA */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <span className="text-xs font-bold text-cyan-400 uppercase block">Laboratorio & Reparación (RMA)</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-3">
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-550 font-bold uppercase block">Etapas de RMA</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {RMA_STEPS.map(step => (
                        <button
                          key={step.value}
                          onClick={() => handleUpdateRMAStatus(step.value)}
                          className={`py-1 px-2 rounded-lg text-[9px] font-bold border transition-all ${
                            selectedDevice.rmaStatus === step.value 
                              ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                              : 'bg-slate-900 border-slate-850 text-slate-500'
                          }`}
                        >
                          {step.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-555 font-bold uppercase block">Diagnóstico del Técnico</label>
                    <textarea
                      rows={3}
                      placeholder="Escribir peritaje..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    />
                    <button
                      onClick={handleSaveDiagnostic}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-[10px] font-bold rounded-xl"
                    >
                      Guardar Diagnóstico
                    </button>
                  </div>
                </div>
              </div>

            </>
          ) : (
            <div className="text-center py-28 text-slate-650 text-xs italic">
              Selecciona un dispositivo para iniciar RMA o validar su garantía oficial.
            </div>
          )}
        </div>

      </div>

      {/* Modal Nueva RMA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">Ingreso de Equipo a RMA</h2>
            <form onSubmit={handleCreateRMA} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Cliente / Solicitante</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Eduardo Galeano"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Modelo del Equipo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: iPhone 15 Pro Max"
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nro de Serie (S/N)</label>
                  <input
                    type="text"
                    required
                    placeholder="SN-..."
                    value={newSn}
                    onChange={e => setNewSn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">IMEI (Celulares)</label>
                  <input
                    type="text"
                    placeholder="Opcional..."
                    value={newImei}
                    onChange={e => setNewImei(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Checklist de accesorios */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Accesorios Entregados</span>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasCharger} onChange={e => setHasCharger(e.target.checked)} />
                    Cargador
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasBox} onChange={e => setHasBox(e.target.checked)} />
                    Caja Original
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasCables} onChange={e => setHasCables(e.target.checked)} />
                    Cables
                  </label>
                </div>
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
                  Generar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impresión */}
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
                  setFeedback({ tone: 'success', message: 'Comprobante oficial enviado a impresión.' });
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

    </div>
  );
}
