'use client';

import React, { useState } from 'react';
import { RefreshCw, Search, CheckCircle, AlertTriangle, FileText, Barcode, ShieldAlert, X } from 'lucide-react';

type ReturnType = 'exchange' | 'refund';
type ReturnStatus = 'Restocked' | 'Quality Check';
type Feedback = { tone: 'success' | 'warning' | 'error'; message: string } | null;

interface TicketItem {
  id: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  qty: number;
}

interface SaleTicket {
  id: string;
  client: string;
  date: string;
  items: TicketItem[];
}

interface ReturnRecord {
  id: string;
  ticket: string;
  client: string;
  item: string;
  reason: string;
  status: ReturnStatus;
  date: string;
}

const MOCK_TICKETS: Record<string, SaleTicket> = {
  'TICKET-005423': {
    id: 't1',
    client: 'Juan Perez',
    date: '2026-07-08',
    items: [
      { id: 'i1', name: 'Remera Algodón Premium', sku: 'REM-ALG-001', size: 'M', color: 'Azul', price: 18500.00, qty: 1 }
    ]
  },
  'TICKET-002130': {
    id: 't2',
    client: 'Maria Gomez',
    date: '2026-07-09',
    items: [
      { id: 'i2', name: 'Pantalón Jean Slim Fit', sku: 'REM-JEA-002', size: '42', color: 'Celeste', price: 29900.00, qty: 1 }
    ]
  }
};

const INITIAL_RETURNS = [
  { id: 'RET-101', ticket: 'TICKET-005421', client: 'Esteban Gomez', item: 'Remera Algodón Premium', reason: 'Cambio de Talle (M a L)', status: 'Restocked', date: '2026-07-10' },
  { 
    id: 'RET-102', 
    ticket: 'TICKET-002128', 
    client: 'Sofia Rossi', 
    item: 'Pantalón Jean Slim Fit', 
    reason: 'Devolución y Nota de Crédito', 
    status: 'Quality Check', 
    date: '2026-07-10',
    creditNoteId: 'NC-0001-49281',
    creditAmount: 29900.00
  }
];

export default function ReturnsConsole() {
  const [ticketSearch, setTicketSearch] = useState('');
  const [foundTicket, setFoundTicket] = useState<SaleTicket | null>(null);
  const [returnsList, setReturnsList] = useState<any[]>(INITIAL_RETURNS);
  const [feedback, setFeedback] = useState<Feedback>(null);
  
  // Formulario de retorno
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [returnType, setReturnType] = useState<ReturnType>('exchange');
  const [newSize, setNewSize] = useState('L');
  const [newColor, setNewColor] = useState('Azul');
  
  // Checklist de Control de Calidad
  const [hasTags, setHasTags] = useState(false);
  const [isUnworn, setIsUnworn] = useState(false);
  const [noDamage, setNoDamage] = useState(false);

  // FASE 3: Nota de Crédito y Modal
  const [selectedCreditNote, setSelectedCreditNote] = useState<any | null>(null);
  const [isNCModalOpen, setIsNCModalOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSearch = ticketSearch.trim().toUpperCase();
    const ticket = MOCK_TICKETS[cleanSearch];
    if (ticket) {
      setFoundTicket(ticket);
      setSelectedItemId(ticket.items[0]?.id ?? '');
      setFeedback({ tone: 'success', message: `Comprobante ${cleanSearch} encontrado.` });
    } else {
      setFeedback({ tone: 'error', message: 'Ticket no encontrado. Probá con TICKET-005423 o TICKET-002130.' });
      setFoundTicket(null);
    }
  };

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundTicket) return;

    if (!hasTags || !isUnworn || !noDamage) {
      setFeedback({ tone: 'warning', message: 'La prenda debe cumplir todos los requisitos del control de calidad.' });
      return;
    }

    const selectedItem = foundTicket.items.find((item) => item.id === selectedItemId);
    if (!selectedItem) {
      setFeedback({ tone: 'error', message: 'Seleccioná una prenda válida del comprobante.' });
      return;
    }
    const returnId = `RET-${Math.floor(Math.random() * 900) + 103}`;
    const ncId = `NC-0001-${Math.floor(Math.random() * 90000) + 10000}`;

    const newReturn: any = {
      id: returnId,
      ticket: ticketSearch.trim().toUpperCase(),
      client: foundTicket.client,
      item: selectedItem.name,
      reason: returnType === 'exchange' ? `Cambio por talle ${newSize} (${newColor})` : 'Devolución y Nota de Crédito',
      status: 'Quality Check',
      date: new Date().toISOString().split('T')[0]
    };

    if (returnType === 'refund') {
      newReturn.creditNoteId = ncId;
      newReturn.creditAmount = selectedItem.price;

      // Autocompletar detalles del modal para mostrárselo al usuario
      setSelectedCreditNote({
        id: ncId,
        client: foundTicket.client,
        originalTicket: ticketSearch.trim().toUpperCase(),
        item: selectedItem.name,
        amount: selectedItem.price,
        cae: `76${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        caeVto: new Date(Date.now() + 10 * 24 * 3600000).toISOString().split('T')[0],
        date: new Date().toISOString().split('T')[0]
      });
      setIsNCModalOpen(true);
    }

    setReturnsList((current) => [newReturn, ...current]);
    setFeedback({
      tone: 'success',
      message: returnType === 'exchange'
        ? `Cambio procesado. Se reservó el talle ${newSize} y se reingresó la prenda.`
        : `Devolución aprobada. Nota de crédito emitida por $${selectedItem.price.toLocaleString('es-AR')}.`,
    });

    // Resetear
    setFoundTicket(null);
    setTicketSearch('');
    setHasTags(false);
    setIsUnworn(false);
    setIsUnworn(false);
    setNoDamage(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl shadow-lg">
              <RefreshCw className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Cambios y Devoluciones (Logística Inversa)
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Control de cambios de prendas, talle o color, verificación de control de calidad e impresión de Notas de Crédito.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs font-semibold ${
          feedback.tone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : feedback.tone === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-red-200 bg-red-50 text-red-800'
        }`} role="status">
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-current opacity-60 hover:opacity-100" aria-label="Cerrar aviso"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Central/Izquierda: Buscar y Procesar */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Buscador de Ticket */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-4">
              Paso 1: Buscar Comprobante Original
            </h3>

            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ej: TICKET-005423 o TICKET-002130"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-xs focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-750"
              >
                Buscar Venta
              </button>
            </form>
          </div>

          {/* Formulario de Cambio */}
          {foundTicket && (
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-4">
                Paso 2: Registrar Prenda y Control de Calidad
              </h3>

              <form onSubmit={handleProcessReturn} className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-2 gap-4 text-xs font-mono text-cyan-400">
                  <div><strong>Cliente:</strong> {foundTicket.client}</div>
                  <div><strong>Fecha Compra:</strong> {foundTicket.date}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Prenda devuelta */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prenda Devuelta</label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                    >
                      {foundTicket.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Talle: {item.size} / Color: {item.color}) - ${item.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Acción */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destino / Acción</label>
                    <select
                      value={returnType}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'exchange' || value === 'refund') setReturnType(value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                    >
                      <option value="exchange">Cambio de Prenda / Talle</option>
                      <option value="refund">Devolución / Nota de Crédito</option>
                    </select>
                  </div>
                </div>

                {/* Si es cambio, seleccionar nuevas características */}
                {returnType === 'exchange' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-850">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nuevo Talle</label>
                      <input
                        type="text"
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nuevo Color</label>
                      <input
                        type="text"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Control de Calidad Checklist */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Checklist de Control de Calidad</label>
                  <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-xs">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasTags}
                        onChange={(e) => setHasTags(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-cyan-500 h-4.5 w-4.5"
                      />
                      <span>Conserva etiqueta y packaging original</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isUnworn}
                        onChange={(e) => setIsUnworn(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-cyan-500 h-4.5 w-4.5"
                      />
                      <span>Prenda sin indicios de uso ni lavado</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noDamage}
                        onChange={(e) => setNoDamage(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-cyan-500 h-4.5 w-4.5"
                      />
                      <span>Sin manchas, roturas ni fallas de uso</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4.5 w-4.5" />
                  Autorizar Movimiento en Stock
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Panel Derecho: Historial y Estadísticas */}
        <div className="space-y-6">
          
          {/* FASE 3: Estadísticas de Devolución */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-cyan-400" />
              Analíticas de Devoluciones
            </h3>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Tasa de Devolución Global:</span>
                <span className="font-bold text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">2.4% (Saludable)</span>
              </div>

              <div className="space-y-2 border-t border-slate-850 pt-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Principales Incidencias</span>
                
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>Talle Incorrecto / Calce</span>
                    <span className="font-mono font-bold text-cyan-400">55%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>Falla de Costura / Hilado</span>
                    <span className="font-mono font-bold text-amber-500">25%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>Disconformidad con Color / Modelo</span>
                    <span className="font-mono font-bold text-indigo-400">20%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Cambios */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850">
              Logística Inversa Reciente
            </h3>

            <div className="space-y-3">
              {returnsList.map(ret => (
                <div key={ret.id} className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 text-xs flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-cyan-400 font-bold">{ret.id}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[8px] uppercase border ${
                      ret.status === 'Restocked' 
                        ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-450 border-amber-500/20'
                    }`}>
                      {ret.status === 'Restocked' ? 'Restockeado' : 'Control Calidad'}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    <strong>Prenda:</strong> {ret.item}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    <strong>Tipo:</strong> {ret.reason}
                  </div>
                  
                  {ret.creditNoteId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCreditNote({
                          id: ret.creditNoteId,
                          client: ret.client,
                          originalTicket: ret.ticket,
                          item: ret.item,
                          amount: ret.creditAmount || 29900.00,
                          cae: `76${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                          caeVto: '2026-07-22',
                          date: ret.date
                        });
                        setIsNCModalOpen(true);
                      }}
                      className="mt-1 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Barcode className="h-3 w-3" />
                      Ver Nota de Crédito
                    </button>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-900">
                    <span>Ticket: {ret.ticket}</span>
                    <span>{ret.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modal Nota de Crédito AFIP */}
      {isNCModalOpen && selectedCreditNote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => { setSelectedCreditNote(null); setIsNCModalOpen(false); }}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-650 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Cabecera del Documento Comercial */}
            <div className="text-center border-b border-slate-200 pb-4 mb-4">
              <div className="inline-block bg-slate-900 text-white font-black text-xl px-4 py-1.5 rounded mb-2">
                A
              </div>
              <h2 className="text-sm font-black tracking-wider uppercase text-slate-850">Nota de Crédito Electrónica</h2>
              <p className="text-[10px] text-slate-500 font-mono">{selectedCreditNote.id}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">Fecha de Emisión: {selectedCreditNote.date}</p>
            </div>

            {/* Datos CUIT */}
            <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-slate-150 pb-3 mb-3 text-slate-600">
              <div>
                <p className="font-bold text-slate-800">Emisor: AURA STUDIO S.A.</p>
                <p>CUIT: 30-70123456-9</p>
                <p>Ingresos Brutos: 30-70123456-9</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">Cliente: {selectedCreditNote.client}</p>
                <p>Condición: Consumidor Final</p>
                <p>Comp. Asociado: {selectedCreditNote.originalTicket}</p>
              </div>
            </div>

            {/* Detalles de la prenda */}
            <div className="space-y-2 border-b border-slate-150 pb-3 mb-3">
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Conceptos</span>
              <div className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">{selectedCreditNote.item}</p>
                  <p className="text-[9px] text-slate-500">Devolución de prenda por disconformidad / talle</p>
                </div>
                <span className="font-mono font-bold">${selectedCreditNote.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Totales y CAE */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900">
                <span>Subtotal Neto:</span>
                <span className="font-mono">${(selectedCreditNote.amount / 1.21).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 border-b border-slate-150 pb-3">
                <span>IVA (21%):</span>
                <span className="font-mono">${(selectedCreditNote.amount - selectedCreditNote.amount / 1.21).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-black text-slate-950">
                <span>TOTAL CRÉDITO:</span>
                <span className="font-mono text-emerald-600">${selectedCreditNote.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Pie con código de barra y CAE */}
              <div className="pt-2 flex justify-between items-end text-[8px] font-mono text-slate-500">
                <div>
                  <p><strong>CAE:</strong> {selectedCreditNote.cae}</p>
                  <p><strong>Vto. CAE:</strong> {selectedCreditNote.caeVto}</p>
                </div>
                {/* Código de barras simulado */}
                <div className="h-6 w-24 bg-slate-900 flex items-center justify-center text-white text-[6px] tracking-[4px]">
                  ||||||||||||||||
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                alert('Imprimiendo comprobante de Nota de Crédito en tickeadora térmica...');
              }}
              className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              Imprimir Nota de Crédito (Fiscal)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
