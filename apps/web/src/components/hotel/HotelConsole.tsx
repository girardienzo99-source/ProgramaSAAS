'use client';

import React, { useMemo, useState } from 'react';
import {
  Key, CheckCircle2, Grid, AlertTriangle, Moon, Search, Printer, X
} from 'lucide-react';

type RoomType = 'Standard' | 'Deluxe' | 'Suite Presidencial';
type RoomStatus = 'free' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked';
type CleaningStatus = 'pending' | 'cleaning' | 'ready' | 'inspection';
type RoomTypeFilter = RoomType | 'all';
type RoomStatusFilter = RoomStatus | 'all';
type Housekeeper = 'Marta Cleaning' | 'Ana Housekeeper';
type Feedback = { tone: 'success' | 'warning' | 'error'; message: string };

interface ExtraItem {
  item: string;
  price: number;
}

interface Room {
  number: string;
  type: RoomType;
  status: RoomStatus;
  guestName?: string;
  guestPassport?: string;
  guestPhone?: string;
  guestCount?: number;
  securityDepositPaid?: boolean;
  checkInDate?: string;
  checkOutDate?: string;
  ratePerNight: number;
  extras: ExtraItem[];
  housekeeperAssigned?: string;
  cleaningStatus?: CleaningStatus;
}

const ROOM_TYPES: RoomType[] = ['Standard', 'Deluxe', 'Suite Presidencial'];
const ROOM_TYPE_FILTERS: Array<{ label: string; value: RoomTypeFilter }> = [
  { label: 'Todas las Categorías', value: 'all' },
  ...ROOM_TYPES.map(type => ({ label: type, value: type }))
];

const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  free: 'Libre',
  reserved: 'Reservada',
  occupied: 'Ocupada',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
  blocked: 'Bloqueada'
};

const ROOM_STATUS_FILTERS: Array<{ label: string; value: RoomStatusFilter }> = [
  { label: 'Todos los Estados', value: 'all' },
  ...Object.entries(ROOM_STATUS_LABELS).map(([value, label]) => ({ value: value as RoomStatus, label }))
];

const HOUSEKEEPERS: Housekeeper[] = ['Marta Cleaning', 'Ana Housekeeper'];

const isRoomTypeFilter = (value: string): value is RoomTypeFilter =>
  ROOM_TYPE_FILTERS.some(option => option.value === value);

const isRoomStatusFilter = (value: string): value is RoomStatusFilter =>
  ROOM_STATUS_FILTERS.some(option => option.value === value);

const isHousekeeper = (value: string): value is Housekeeper =>
  HOUSEKEEPERS.includes(value as Housekeeper);

const todayISO = () => new Date().toISOString().split('T')[0];

const INITIAL_ROOMS: Room[] = [
  { number: '101', type: 'Standard', status: 'occupied', guestName: 'Horacio Quiroga', guestPassport: 'ARG-35123456', guestPhone: '11-5841-2532', guestCount: 2, securityDepositPaid: true, checkInDate: '2026-07-08', checkOutDate: '2026-07-12', ratePerNight: 45000, extras: [{ item: 'Agua Minibar', price: 1500 }], housekeeperAssigned: 'Marta Cleaning', cleaningStatus: 'ready' },
  { number: '102', type: 'Deluxe', status: 'free', ratePerNight: 75000, extras: [], cleaningStatus: 'ready' },
  { number: '201', type: 'Suite Presidencial', status: 'reserved', guestName: 'Clara Vignolo', guestPassport: 'ARG-40987654', guestPhone: '11-9988-7733', guestCount: 1, securityDepositPaid: false, checkInDate: '2026-07-11', checkOutDate: '2026-07-15', ratePerNight: 150000, extras: [] },
  { number: '202', type: 'Standard', status: 'cleaning', ratePerNight: 45000, extras: [], housekeeperAssigned: 'Marta Cleaning', cleaningStatus: 'cleaning' },
  { number: '301', type: 'Deluxe', status: 'maintenance', ratePerNight: 75000, extras: [], cleaningStatus: 'pending' }
];

export default function HotelConsole() {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(INITIAL_ROOMS[0]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // FASE 3: Checklist de Limpieza e Inspección
  const [cleaningChecklist, setCleaningChecklist] = useState({
    sheets: false,
    minibar: false,
    sanitized: false
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomTypeFilter>('all');
  const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatusFilter>('all');

  // Form check-in
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPassport, setGuestPassport] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [securityDeposit, setSecurityDeposit] = useState(true);
  const [checkOutDate, setCheckOutDate] = useState('2026-07-15');

  // Form consumos extras
  const [extraItem, setExtraItem] = useState('Coca Cola Minibar');
  const [extraPrice, setExtraPrice] = useState(1800);

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const guest = guestName.trim();
    if (!selectedRoom || !guest || guestCount <= 0 || !checkOutDate) {
      setFeedback({ tone: 'error', message: 'Completá huésped, cantidad y fecha de salida para hacer check-in.' });
      return;
    }

    const updated: Room = {
      ...selectedRoom,
      status: 'occupied',
      guestName: guest,
      guestPassport: guestPassport.trim(),
      guestPhone: guestPhone.trim(),
      guestCount,
      securityDepositPaid: securityDeposit,
      checkInDate: todayISO(),
      checkOutDate,
      extras: []
    };

    setRooms(prev => prev.map(r => r.number === updated.number ? updated : r));
    setSelectedRoom(updated);

    setIsCheckInOpen(false);
    setGuestName('');
    setFeedback({ tone: 'success', message: `Check-in confirmado en habitación ${selectedRoom.number} para ${guest}.` });
  };

  const handleAddExtra = () => {
    if (!selectedRoom) return;
    const price = Number(extraPrice);
    if (!extraItem.trim() || price <= 0) {
      setFeedback({ tone: 'error', message: 'Seleccioná un consumo con precio válido.' });
      return;
    }

    const updated: Room = {
      ...selectedRoom,
      extras: [...selectedRoom.extras, { item: extraItem, price }]
    };

    setRooms(prev => prev.map(r => r.number === updated.number ? updated : r));
    setSelectedRoom(updated);
    setFeedback({ tone: 'success', message: `Cargo extra agregado: ${extraItem} ($${price.toLocaleString()}).` });
  };

  const handleCheckOut = () => {
    if (!selectedRoom) return;

    const extrasTotal = selectedRoom.extras.reduce((acc, curr) => acc + curr.price, 0);
    const totalToPay = selectedRoom.ratePerNight + extrasTotal;

    const updated: Room = {
      ...selectedRoom,
      status: 'cleaning',
      guestName: undefined,
      guestPassport: undefined,
      guestPhone: undefined,
      guestCount: undefined,
      securityDepositPaid: undefined,
      checkInDate: undefined,
      checkOutDate: undefined,
      extras: [],
      cleaningStatus: 'pending'
    };

    setRooms(prev => prev.map(r => r.number === updated.number ? updated : r));
    setSelectedRoom(updated);

    setFeedback({ tone: 'success', message: `Check-out finalizado para ${selectedRoom.guestName}. Total facturado: $${totalToPay.toLocaleString()}.` });
  };

  const handleCleanRoom = () => {
    if (!selectedRoom) return;
    const updated: Room = { ...selectedRoom, status: 'free', cleaningStatus: 'ready' };

    setRooms(prev => prev.map(r => r.number === updated.number ? updated : r));
    setSelectedRoom(updated);
    setCleaningChecklist({ sheets: false, minibar: false, sanitized: false });
    setFeedback({ tone: 'success', message: `Habitación ${selectedRoom.number} limpia y lista para recibir nuevos huéspedes.` });
  };

  const handleAssignHousekeeper = (hk: Housekeeper) => {
    if (!selectedRoom) return;
    const updated: Room = { ...selectedRoom, housekeeperAssigned: hk, cleaningStatus: 'cleaning' };

    setRooms(prev => prev.map(r => r.number === updated.number ? updated : r));
    setSelectedRoom(updated);
    setFeedback({ tone: 'success', message: `Mucama asignada: ${hk}.` });
  };

  const handlePrintCheckInVoucher = (room: Room) => {
    setPrintModalContent({
      title: `VOUCHER DE INGRESO (CHECK-IN)`,
      content: `HOTEL SASS RESORT & SPA\n\nHabitación: ${room.number}\nTipo: ${room.type}\nHuésped: ${room.guestName}\nDocumento: ${room.guestPassport || 'N/A'}\n\nIngreso: ${room.checkInDate}\nSalida Pactada: ${room.checkOutDate}\nCantidad Huéspedes: ${room.guestCount}\nDepósito Garantía: ${room.securityDepositPaid ? 'Cargado en Tarjeta' : 'Pendiente'}\n\n¡Le deseamos una feliz estadía!`
    });
  };

  const handlePrintFolioInvoice = (room: Room) => {
    const extrasTotal = room.extras.reduce((acc, curr) => acc + curr.price, 0);
    const subtotal = room.ratePerNight;
    const total = subtotal + extrasTotal;
    const extrasText = room.extras.map(e => `- ${e.item}: $${e.price.toLocaleString()}`).join('\n');

    setPrintModalContent({
      title: `FOLIO DE FACTURACIÓN Y CHECK-OUT`,
      content: `FACTURA COBRO DE HABITACIÓN\n\nHuésped: ${room.guestName}\nHabitación: ${room.number}\n\nCargos de Estadía:\n- Noches de Alojamiento: $${subtotal.toLocaleString()}\n\nConsumos Extras & Minibar:\n${extrasText || '- Sin consumos registrados.'}\n\nTotal Neto Facturado: $${total.toLocaleString()}\n\nFirma Huésped: ____________________\nCajero Front Desk: SASS`
    });
  };

  const metrics = useMemo(() => {
    const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
    const extrasTotal = rooms.reduce((acc, curr) => acc + curr.extras.reduce((a, b) => a + b.price, 0), 0);

    return {
      occupiedCount,
      occupancyRate: rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0,
      freeRooms: rooms.filter(r => r.status === 'free').length,
      blockedOrCleaning: rooms.filter(r => r.status === 'cleaning' || r.status === 'maintenance').length,
      extrasTotal
    };
  }, [rooms]);

  // Filtrado de rack
  const filteredRooms = useMemo(() => rooms.filter(r => {
    const matchSearch = r.number.includes(searchTerm) || (r.guestName && r.guestName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchType = roomTypeFilter === 'all' || r.type === roomTypeFilter;
    const matchStatus = roomStatusFilter === 'all' || r.status === roomStatusFilter;

    return matchSearch && matchType && matchStatus;
  }), [rooms, searchTerm, roomTypeFilter, roomStatusFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Moon className="h-6 w-6 text-purple-400 animate-pulse" />
          <div>
            <h1 className="text-xl font-black text-white">Rack de Ocupación & Minibar (Front Desk)</h1>
            <p className="text-slate-400 text-xs mt-0.5">Control de check-in, check-out, cargos extras al folio de habitación y estado de limpieza.</p>
          </div>
        </div>
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
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Porcentaje de Ocupación</span>
          <span className="text-xl font-black text-white mt-1 block">{metrics.occupancyRate.toFixed(0)}%</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Habitaciones Libres</span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            {metrics.freeRooms}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Habitaciones Ocupadas</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">{metrics.occupiedCount}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">En Limpieza / Bloqueadas</span>
          <span className="text-xl font-black text-amber-500 mt-1 block">
            {metrics.blockedOrCleaning}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Cargos Extras Minibar</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">
            ${metrics.extrasTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Alertas Críticas */}
      {rooms.some(r => r.status === 'occupied' && !r.securityDepositPaid) && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
            <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>Alerta de Conserjería: Existen habitaciones ocupadas sin tarjeta de crédito cargada en depósito de garantía.</span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Huésped o Habitación</label>
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
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Tipo Habitación</label>
          <select
            value={roomTypeFilter}
            onChange={e => {
              if (isRoomTypeFilter(e.target.value)) setRoomTypeFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {ROOM_TYPE_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Estado Ocupación</label>
          <select
            value={roomStatusFilter}
            onChange={e => {
              if (isRoomStatusFilter(e.target.value)) setRoomStatusFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {ROOM_STATUS_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rack de Habitaciones */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Grid className="h-4.5 w-4.5 text-purple-400" />
            Rack Habitaciones
          </h3>

          <div className="grid grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredRooms.map(room => {
              const active = selectedRoom?.number === room.number;
              return (
                <div
                  key={room.number}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                    active ? 'bg-purple-950/10 border-purple-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-black text-sm text-white">HAB {room.number}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      room.status === 'free' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                      room.status === 'occupied' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      room.status === 'cleaning' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {ROOM_STATUS_LABELS[room.status]}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-2">{room.type}</span>
                  {room.guestName && (
                    <span className="text-[10px] text-slate-500 block truncate mt-1">G: {room.guestName}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Check-in & Folio */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 flex flex-col justify-between min-h-[480px]">
          {selectedRoom ? (
            <div className="space-y-6">
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">Habitación {selectedRoom.number} - {selectedRoom.type}</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Tarifa Diaria: ${selectedRoom.ratePerNight.toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  {selectedRoom.status === 'occupied' && (
                    <>
                      <button
                        onClick={() => handlePrintCheckInVoucher(selectedRoom)}
                        className="p-2 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850"
                      >
                        <Printer className="h-3.5 w-3.5 text-purple-400" />
                      </button>
                      <button
                        onClick={() => handlePrintFolioInvoice(selectedRoom)}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 font-bold rounded-xl text-[10px]"
                      >
                        Ver Folio
                      </button>
                    </>
                  )}

                  {selectedRoom.status === 'free' && (
                    <button
                      onClick={() => setIsCheckInOpen(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-550 text-white font-bold rounded-xl text-xs uppercase"
                    >
                      Hacer Check-In
                    </button>
                  )}

                  {selectedRoom.status === 'occupied' && (
                    <button
                      onClick={handleCheckOut}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase"
                    >
                      Cerrar Folio / Check-out
                    </button>
                  )}
                </div>
              </div>

              {/* FASE 3: Checklist de Auditoría de Limpieza e Inspección */}
              {selectedRoom.status === 'cleaning' && (
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-xs space-y-3.5">
                  <span className="text-[10px] text-slate-550 font-bold uppercase block">Auditoría e Inspección de Calidad de Limpieza</span>
                  
                  <p className="text-[10px] text-slate-500">
                    Completá los puntos de control de mucamas para habilitar y liberar la habitación.
                  </p>

                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 text-slate-350 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cleaningChecklist.sheets}
                        onChange={e => setCleaningChecklist(prev => ({ ...prev, sheets: e.target.checked }))}
                        className="cursor-pointer"
                      />
                      Sábanas, toallas y ropa de cama cambiadas
                    </label>
                    <label className="flex items-center gap-2.5 text-slate-350 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cleaningChecklist.minibar}
                        onChange={e => setCleaningChecklist(prev => ({ ...prev, minibar: e.target.checked }))}
                        className="cursor-pointer"
                      />
                      Minibar reabastecido y auditado
                    </label>
                    <label className="flex items-center gap-2.5 text-slate-350 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cleaningChecklist.sanitized}
                        onChange={e => setCleaningChecklist(prev => ({ ...prev, sanitized: e.target.checked }))}
                        className="cursor-pointer"
                      />
                      Baño desinfectado y amenities provistos
                    </label>
                  </div>

                  <button
                    onClick={handleCleanRoom}
                    disabled={!(cleaningChecklist.sheets && cleaningChecklist.minibar && cleaningChecklist.sanitized)}
                    className={`w-full py-2.5 font-black rounded-xl text-xs uppercase cursor-pointer transition-all ${
                      (cleaningChecklist.sheets && cleaningChecklist.minibar && cleaningChecklist.sanitized)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 animate-pulse'
                        : 'bg-slate-900 border border-slate-850 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    Habilitar & Liberar Habitación
                  </button>
                </div>
              )}

              {selectedRoom.status === 'occupied' && (
                <>
                  {/* Ficha Huésped */}
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-xs space-y-2">
                    <span className="text-[10px] text-slate-550 font-bold uppercase block">Huésped Activo</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span>Nombre Completo</span>
                        <span className="font-bold text-slate-300 block mt-0.5">{selectedRoom.guestName}</span>
                      </div>
                      <div>
                        <span>Documento/Pasaporte</span>
                        <span className="font-bold text-slate-300 block mt-0.5">{selectedRoom.guestPassport || 'N/A'}</span>
                      </div>
                      <div>
                        <span>Estadía Pactada</span>
                        <span className="font-bold text-slate-300 block mt-0.5">{selectedRoom.checkInDate} / {selectedRoom.checkOutDate}</span>
                      </div>
                      <div>
                        <span>Garantía Tarjeta</span>
                        <span className={`font-bold block mt-0.5 ${selectedRoom.securityDepositPaid ? 'text-emerald-450' : 'text-rose-455'}`}>
                          {selectedRoom.securityDepositPaid ? 'Presentada' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cargos extras / Consumos Minibar */}
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                    <span className="text-xs font-bold text-purple-400 uppercase block">Consumos Minibar & Extras</span>
                    
                    <div className="flex gap-2">
                      <select
                        value={extraItem}
                        onChange={e => {
                          setExtraItem(e.target.value);
                          if (e.target.value === 'Agua Minibar') setExtraPrice(1500);
                          if (e.target.value === 'Papas Minibar') setExtraPrice(2500);
                          if (e.target.value === 'Room Service Lomo') setExtraPrice(9500);
                          if (e.target.value === 'Sesión de Spa') setExtraPrice(25000);
                          if (e.target.value === 'Cena Especial') setExtraPrice(18500);
                          if (e.target.value === 'Traslado Aeropuerto') setExtraPrice(35000);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                      >
                        <option value="Agua Minibar">Agua Minibar ($1.500)</option>
                        <option value="Papas Minibar">Papas Minibar ($2.500)</option>
                        <option value="Room Service Lomo">Room Service Lomo ($9.500)</option>
                        <option value="Sesión de Spa">Sesión de Spa ($25.000)</option>
                        <option value="Cena Especial">Cena Especial ($18.500)</option>
                        <option value="Traslado Aeropuerto">Traslado Aeropuerto ($35.000)</option>
                      </select>
                      <button
                        onClick={handleAddExtra}
                        className="px-4 bg-purple-600 hover:bg-purple-550 text-white font-bold rounded-xl text-xs"
                      >
                        Cargar Cargo
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Detalle de Cargos en Folio</span>
                      {selectedRoom.extras.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span>{item.item}</span>
                          <span className="font-bold">${item.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Módulo de Limpieza / Mucamas */}
              {selectedRoom.status === 'cleaning' && (
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-purple-400 uppercase block">Asignar Mucama de Limpieza</span>
                  <div className="flex gap-2">
                    <select
                      onChange={e => {
                        if (isHousekeeper(e.target.value)) handleAssignHousekeeper(e.target.value);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">Seleccionar Mucama...</option>
                      {HOUSEKEEPERS.map(housekeeper => (
                        <option key={housekeeper} value={housekeeper}>{housekeeper}</option>
                      ))}
                    </select>
                  </div>
                  {selectedRoom.housekeeperAssigned && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Responsable actual: {selectedRoom.housekeeperAssigned} | Estado: {selectedRoom.cleaningStatus}
                    </span>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-28 text-slate-650 text-xs my-auto">
              <Key className="h-10 w-10 mx-auto mb-2 text-slate-800" />
              Selecciona una habitación del rack para check-in o facturar extras.
            </div>
          )}
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
                  setFeedback({ tone: 'success', message: 'Comprobante de hotel enviado a impresión.' });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-550 text-white font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CheckIn */}
      {isCheckInOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">Check-In Habitación {selectedRoom?.number}</h2>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre del Huésped</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Horacio Quiroga"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white animate-pulse-once"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Pasaporte / DNI</label>
                  <input
                    type="text"
                    required
                    placeholder="ARG-..."
                    value={guestPassport}
                    onChange={e => setGuestPassport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Celular / Teléfono</label>
                  <input
                    type="text"
                    placeholder="11-..."
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Huéspedes</label>
                  <input
                    type="number"
                    required
                    value={guestCount}
                    onChange={e => setGuestCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Depósito Garantía</label>
                  <select
                    value={securityDeposit ? 'si' : 'no'}
                    onChange={e => setSecurityDeposit(e.target.value === 'si')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="si">Presentado (Tarjeta)</option>
                    <option value="no">Pendiente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Fecha Check-Out Pactada</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={e => setCheckOutDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-650 hover:bg-purple-600 text-white font-bold rounded-xl text-xs"
                >
                  Confirmar Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
