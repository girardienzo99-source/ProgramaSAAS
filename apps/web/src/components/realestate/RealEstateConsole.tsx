'use client';

import React, { useMemo, useState } from 'react';
import {
  Building2, CheckCircle2, Plus, AlertTriangle, Key, Hammer, Search, X
} from 'lucide-react';

type OfferStatus = 'pending' | 'accepted' | 'rejected';
type PropertyType = 'Casa' | 'Departamento' | 'Local' | 'Terreno' | 'Galpón' | 'Oficina';
type PropertyOperation = 'Alquiler' | 'Venta' | 'Administración';
type RentStatus = 'paid' | 'pending' | 'arrears';
type AdjustmentIndex = 'ICL' | 'IPC' | 'Ninguno';
type ContractState = 'draft' | 'active' | 'expired' | 'terminated';
type ClaimStatus = 'pending' | 'scheduled' | 'resolved';
type PropertyTypeFilter = PropertyType | 'all';
type OperationFilter = PropertyOperation | 'all';
type Feedback = { tone: 'success' | 'warning' | 'error'; message: string };

interface PropertyOffer {
  id: string;
  offererName: string;
  offerAmount: number;
  date: string;
  status: OfferStatus;
}

interface PropertyVisit {
  visitorName: string;
  date: string;
  time: string;
}

interface Property {
  id: string;
  address: string;
  type: PropertyType;
  operation: PropertyOperation;
  ownerName: string;
  tenantName: string;
  rentAmount: number;
  adjustmentIndex: AdjustmentIndex;
  expensasAmount: number;
  status: RentStatus;
  contractStart: string;
  contractEnd: string;
  contractState: ContractState;
  surfaceM2: number;
  roomsCount: number;
  bathroomsCount: number;
  offers: PropertyOffer[];
  visits: PropertyVisit[];
}

interface MaintenanceClaim {
  id: string;
  propertyAddress: string;
  description: string;
  status: ClaimStatus;
}

const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada'
};

const RENT_STATUS_LABELS: Record<RentStatus, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  arrears: 'En mora'
};

const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: 'Pendiente',
  scheduled: 'Programado',
  resolved: 'Resuelto'
};

const CONTRACT_STATE_LABELS: Record<ContractState, string> = {
  draft: 'Borrador',
  active: 'Activo',
  expired: 'Vencido',
  terminated: 'Rescindido'
};

const PROPERTY_TYPES: PropertyType[] = ['Departamento', 'Casa', 'Local', 'Oficina', 'Terreno', 'Galpón'];
const PROPERTY_TYPE_FILTERS: Array<{ label: string; value: PropertyTypeFilter }> = [
  { label: 'Todos los Inmuebles', value: 'all' },
  ...PROPERTY_TYPES.map(type => ({ label: type, value: type }))
];

const OPERATIONS: PropertyOperation[] = ['Alquiler', 'Venta', 'Administración'];
const OPERATION_FILTERS: Array<{ label: string; value: OperationFilter }> = [
  { label: 'Todas las Operaciones', value: 'all' },
  ...OPERATIONS.map(operation => ({ label: operation, value: operation }))
];

const OFFER_STATUS_OPTIONS: Array<{ label: string; value: OfferStatus }> = Object.entries(OFFER_STATUS_LABELS)
  .map(([value, label]) => ({ value: value as OfferStatus, label }));

const CLAIM_STATUS_OPTIONS: Array<{ label: string; value: ClaimStatus }> = Object.entries(CLAIM_STATUS_LABELS)
  .map(([value, label]) => ({ value: value as ClaimStatus, label }));

const isPropertyTypeFilter = (value: string): value is PropertyTypeFilter =>
  PROPERTY_TYPE_FILTERS.some(option => option.value === value);

const isPropertyType = (value: string): value is PropertyType =>
  PROPERTY_TYPES.includes(value as PropertyType);

const isOperationFilter = (value: string): value is OperationFilter =>
  OPERATION_FILTERS.some(option => option.value === value);

const isOfferStatus = (value: string): value is OfferStatus =>
  OFFER_STATUS_OPTIONS.some(option => option.value === value);

const isClaimStatus = (value: string): value is ClaimStatus =>
  CLAIM_STATUS_OPTIONS.some(option => option.value === value);

const todayISO = () => new Date().toISOString().split('T')[0];

const addYearsISO = (years: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split('T')[0];
};

const INITIAL_PROPERTIES: Property[] = [
  { 
    id: 'prop-1', 
    address: 'Av. Santa Fe 3400 5°B, CABA', 
    type: 'Departamento', 
    operation: 'Alquiler', 
    ownerName: 'Horacio Quiroga', 
    tenantName: 'Clara Vignolo', 
    rentAmount: 380000, 
    adjustmentIndex: 'ICL', 
    expensasAmount: 45000, 
    status: 'paid', 
    contractStart: '2025-03-01', 
    contractEnd: '2027-02-28',
    contractState: 'active',
    surfaceM2: 55,
    roomsCount: 2,
    bathroomsCount: 1,
    offers: [
      { id: 'o1', offererName: 'Juan Pérez', offerAmount: 360000, date: '2026-06-15', status: 'rejected' },
      { id: 'o2', offererName: 'Clara Vignolo', offerAmount: 380000, date: '2026-06-20', status: 'accepted' }
    ],
    visits: [
      { visitorName: 'María Gomez', date: '2026-06-10', time: '14:30' },
      { visitorName: 'Carlos López', date: '2026-06-12', time: '16:00' }
    ]
  },
  { 
    id: 'prop-2', 
    address: 'Corrientes 1500, Local Bajo', 
    type: 'Local', 
    operation: 'Alquiler', 
    ownerName: 'Marcos Juárez', 
    tenantName: 'Gastronomía Sur', 
    rentAmount: 950000, 
    adjustmentIndex: 'IPC', 
    expensasAmount: 110000, 
    status: 'arrears', 
    contractStart: '2024-06-01', 
    contractEnd: '2026-05-31',
    contractState: 'expired',
    surfaceM2: 120,
    roomsCount: 1,
    bathroomsCount: 2,
    offers: [],
    visits: []
  },
  { 
    id: 'prop-3', 
    address: 'Gorriti 4800, Palermo', 
    type: 'Casa', 
    operation: 'Administración', 
    ownerName: 'Eduardo Galeano', 
    tenantName: 'Sofía Martínez', 
    rentAmount: 650000, 
    adjustmentIndex: 'ICL', 
    expensasAmount: 0, 
    status: 'pending', 
    contractStart: '2026-01-01', 
    contractEnd: '2027-12-31',
    contractState: 'active',
    surfaceM2: 180,
    roomsCount: 4,
    bathroomsCount: 3,
    offers: [
      { id: 'o3', offererName: 'Paula Albarracín', offerAmount: 620000, date: '2026-07-01', status: 'pending' }
    ],
    visits: [
      { visitorName: 'Ramiro Díaz', date: '2026-07-02', time: '11:00' }
    ]
  }
];

const INITIAL_CLAIMS: MaintenanceClaim[] = [
  { id: 'c-101', propertyAddress: 'Av. Santa Fe 3400 5°B, CABA', description: 'Pérdida de agua bajo mesada de cocina.', status: 'pending' },
  { id: 'c-102', propertyAddress: 'Corrientes 1500, Local Bajo', description: 'Falla en persiana metálica motorizada.', status: 'scheduled' }
];

export default function RealEstateConsole() {
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [claims, setClaims] = useState<MaintenanceClaim[]>(INITIAL_CLAIMS);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(INITIAL_PROPERTIES[0]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // FASE 3: Indexación y Gestión de Gremios
  const [indexRatePercent, setIndexRatePercent] = useState(120);
  const [selectedTech, setSelectedTech] = useState('Mario Pereyra (Electricista)');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>('all');
  const [operationFilter, setOperationFilter] = useState<OperationFilter>('all');

  // Form propiedad
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState<Property['type']>('Departamento');
  const [newOp, setNewOp] = useState<Property['operation']>('Alquiler');
  const [newOwner, setNewOwner] = useState('');
  const [newTenant, setNewTenant] = useState('');
  const [newRent, setNewRent] = useState(350000);
  const [newExpensas, setNewExpensas] = useState(35000);
  const [newSurface, setNewSurface] = useState(60);

  // Form oferta
  const [offererName, setOffererName] = useState('');
  const [offerAmount, setOfferAmount] = useState(0);

  // Form reclamo
  const [claimText, setClaimText] = useState('');

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const address = newAddress.trim();
    const ownerName = newOwner.trim();
    const rentAmount = Number(newRent);
    const expensasAmount = Number(newExpensas);
    const surfaceM2 = Number(newSurface);

    if (!address || !ownerName || rentAmount <= 0 || expensasAmount < 0 || surfaceM2 <= 0) {
      setFeedback({ tone: 'error', message: 'Completá dirección, propietario, alquiler y superficie con valores válidos.' });
      return;
    }

    const newProp: Property = {
      id: `prop-${Date.now()}`,
      address,
      type: newType,
      operation: newOp,
      ownerName,
      tenantName: newTenant.trim() || 'Vacío/A buscar',
      rentAmount,
      adjustmentIndex: 'ICL',
      expensasAmount,
      status: 'pending',
      contractStart: todayISO(),
      contractEnd: addYearsISO(2),
      contractState: 'draft',
      surfaceM2,
      roomsCount: 3,
      bathroomsCount: 1,
      offers: [],
      visits: []
    };

    setProperties(prev => [...prev, newProp]);
    setSelectedProperty(newProp);
    setIsAddModalOpen(false);
    setNewAddress('');
    setNewOwner('');
    setNewTenant('');
    setFeedback({ tone: 'success', message: 'Propiedad y contrato cargados exitosamente.' });
  };

  const handlePayRent = () => {
    if (!selectedProperty) return;

    const updated: Property = { ...selectedProperty, status: 'paid' };

    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProperty(updated);

    const commission = selectedProperty.rentAmount * 0.05; // 5% comisión administración
    setFeedback({
      tone: 'success',
      message: `Alquiler cobrado. Liquidación propietario: $${(selectedProperty.rentAmount - commission).toLocaleString()} y comisión $${commission.toLocaleString()}.`
    });
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const offerer = offererName.trim();
    const amount = Number(offerAmount);

    if (!selectedProperty || !offerer || amount <= 0) {
      setFeedback({ tone: 'error', message: 'Completá interesado y monto válido para registrar la oferta.' });
      return;
    }

    const newOffer: PropertyOffer = {
      id: `off-${Date.now()}`,
      offererName: offerer,
      offerAmount: amount,
      date: todayISO(),
      status: 'pending'
    };

    const updated: Property = { ...selectedProperty, offers: [...selectedProperty.offers, newOffer] };

    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProperty(updated);

    setOffererName('');
    setOfferAmount(0);
    setFeedback({ tone: 'success', message: 'Oferta económica registrada.' });
  };

  const handleOfferStatusChange = (offerId: string, status: OfferStatus) => {
    if (!selectedProperty) return;

    const updated: Property = {
      ...selectedProperty,
      offers: selectedProperty.offers.map(o => o.id === offerId ? { ...o, status } : o)
    };

    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProperty(updated);
    setFeedback({ tone: 'success', message: `Oferta marcada como ${OFFER_STATUS_LABELS[status].toLowerCase()}.` });
  };

  const handleContractStateChange = (id: string, state: ContractState) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, contractState: state } : p));
    if (selectedProperty && selectedProperty.id === id) {
      setSelectedProperty(prev => prev ? { ...prev, contractState: state } : null);
    }
    setFeedback({ tone: 'success', message: `Contrato actualizado a ${CONTRACT_STATE_LABELS[state]}.` });
  };

  const handleAddClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const description = claimText.trim();

    if (!selectedProperty || !description) {
      setFeedback({ tone: 'error', message: 'Escribí el detalle del reclamo antes de cargarlo.' });
      return;
    }

    const newClaim: MaintenanceClaim = {
      id: `c-${Date.now()}`,
      propertyAddress: selectedProperty.address,
      description,
      status: 'pending'
    };

    setClaims(prev => [...prev, newClaim]);
    setClaimText('');
    setFeedback({ tone: 'success', message: 'Reclamo de mantenimiento registrado. Se asignará técnico.' });
  };

  const handleUpdateClaimStatus = (id: string, status: ClaimStatus) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    setFeedback({ tone: 'success', message: `Reclamo actualizado a ${CLAIM_STATUS_LABELS[status].toLowerCase()}.` });
  };

  // FASE 3: Aplicar indexación al alquiler
  const handleApplyIndexation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const multiplier = 1 + (indexRatePercent / 100);
    const originalRent = selectedProperty.rentAmount;
    const newRentAmount = Math.round(originalRent * multiplier);

    const updatedProperty = { ...selectedProperty, rentAmount: newRentAmount };
    
    setProperties(prev => prev.map(p => p.id === selectedProperty.id ? updatedProperty : p));
    setSelectedProperty(updatedProperty);
    setFeedback({
      tone: 'success',
      message: `Ajuste de contrato aplicado (+${indexRatePercent}%). Alquiler actualizado de $${originalRent.toLocaleString()} a $${newRentAmount.toLocaleString()}.`
    });
  };

  // FASE 3: Asignar gremio a un reclamo
  const handleAssignTechnician = (claimId: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === claimId) {
        return { ...c, status: 'scheduled' };
      }
      return c;
    }));
    setFeedback({
      tone: 'success',
      message: `Técnico "${selectedTech}" asignado al reclamo ${claimId}. Estado del ticket: Programado.`
    });
  };

  const handlePrintContractDraft = (prop: Property) => {
    setPrintModalContent({
      title: `CONTRATO DE LOCACIÓN - BORRADOR`,
      content: `CONTRATO DE LOCACIÓN COMERCIAL / RESIDENCIAL\n\nLocador: ${prop.ownerName}\nLocatario: ${prop.tenantName}\nInmueble: ${prop.address}\n\nValor locativo acordado: $${prop.rentAmount.toLocaleString()} mensuales\nAjuste semestral por: ${prop.adjustmentIndex}\n\nEl inmueble se entrega en óptimas condiciones de habitabilidad, con ${prop.roomsCount} ambientes y ${prop.bathroomsCount} baños. Se firma borrador el ${new Date().toLocaleDateString()}.\n\nInmobiliaria SASS`
    });
  };

  const handlePrintDepositReceipt = (prop: Property) => {
    setPrintModalContent({
      title: `RECIBO DE SEÑA Y RESERVA`,
      content: `RECIBO OFICIAL DE RESERVA INMOBILIARIA\n\nRecibimos de ${prop.tenantName || 'Interesado'} la suma de pesos equivalente al valor de reserva para la propiedad ubicada en ${prop.address}.\n\nValor Alquiler Estimado: $${prop.rentAmount.toLocaleString()}\nMonto de Reserva: $${(prop.rentAmount * 0.5).toLocaleString()}\n\nEl presente recibo asegura la prioridad de la oferta a referéndum del propietario por 10 días.\n\nSass Inmobiliaria`
    });
  };

  const metrics = useMemo(() => {
    const paidRentTotal = properties
      .filter(p => p.status === 'paid')
      .reduce((acc, curr) => acc + curr.rentAmount, 0);

    return {
      activeProperties: properties.length,
      paidRentCount: properties.filter(p => p.status === 'paid').length,
      arrearsTotal: properties.filter(p => p.status === 'arrears').reduce((acc, curr) => acc + curr.rentAmount, 0),
      generatedCommissions: paidRentTotal * 0.05,
      pendingClaims: claims.filter(c => c.status !== 'resolved').length
    };
  }, [properties, claims]);

  // Filtrado de propiedades
  const filteredProperties = useMemo(() => properties.filter(p => {
    const matchSearch = p.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = propertyTypeFilter === 'all' || p.type === propertyTypeFilter;
    const matchOp = operationFilter === 'all' || p.operation === operationFilter;

    return matchSearch && matchType && matchOp;
  }), [properties, searchTerm, propertyTypeFilter, operationFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-yellow-500 animate-pulse" />
          <div>
            <h1 className="text-xl font-black text-white">Administración de Contratos & Alquileres</h1>
            <p className="text-slate-400 text-xs mt-0.5">Control de expensas, liquidaciones a propietarios y reclamos de mantenimiento.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Cargar Contrato / Propiedad
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
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Propiedades Activas</span>
          <span className="text-xl font-black text-white mt-1 block">{metrics.activeProperties}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Alquileres Cobrados</span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            {metrics.paidRentCount}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Mora Acumulada</span>
          <span className="text-xl font-black text-rose-500 mt-1 block">${metrics.arrearsTotal.toLocaleString()}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Comisiones Generadas</span>
          <span className="text-xl font-black text-cyan-450 mt-1 block">
            ${metrics.generatedCommissions.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Reclamos Pendientes</span>
          <span className="text-xl font-black text-amber-500 mt-1 block">
            {metrics.pendingClaims}
          </span>
        </div>
      </div>

      {/* Alertas Críticas */}
      {properties.some(p => p.contractState === 'expired') && (
        <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-550 animate-pulse" />
            <span>Alerta Inmobiliaria: Existen contratos de alquiler vencidos que requieren renovación o rescisión formal.</span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Inmueble / Dueño / Inquilino</label>
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
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Tipo Propiedad</label>
          <select
            value={propertyTypeFilter}
            onChange={e => {
              if (isPropertyTypeFilter(e.target.value)) setPropertyTypeFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {PROPERTY_TYPE_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Operación Comercial</label>
          <select
            value={operationFilter}
            onChange={e => {
              if (isOperationFilter(e.target.value)) setOperationFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {OPERATION_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cartera de Inmuebles */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Key className="h-4.5 w-4.5 text-yellow-500" />
            Cartera de Inmuebles
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredProperties.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                Sin propiedades cargadas.
              </div>
            ) : (
              filteredProperties.map(p => {
                const active = selectedProperty?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProperty(p)}
                    className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                      active ? 'bg-yellow-950/10 border-yellow-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-white truncate max-w-[160px]">{p.address}</span>
                      <span className="text-[9px] text-slate-500 font-mono">[{p.type}]</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Inquilino: {p.tenantName}</span>

                    <div className="mt-3 flex justify-between items-center border-t border-slate-900 pt-2 text-[10px]">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                        p.status === 'arrears' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      }`}>
                        {RENT_STATUS_LABELS[p.status]}
                      </span>
                      <span className="font-bold text-slate-250">${p.rentAmount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ficha Contratos & Visitas */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedProperty ? (
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">{selectedProperty.address}</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Propietario: {selectedProperty.ownerName} | Inquilino: {selectedProperty.tenantName} | Superficie: {selectedProperty.surfaceM2}m²
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintContractDraft(selectedProperty)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 font-bold rounded-xl text-[10px]"
                  >
                    Borrador Contrato
                  </button>
                  <button
                    onClick={() => handlePrintDepositReceipt(selectedProperty)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 font-bold rounded-xl text-[10px]"
                  >
                    Recibo Reserva
                  </button>
                  {selectedProperty.status !== 'paid' ? (
                    <button
                      onClick={handlePayRent}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs uppercase"
                    >
                      Registrar Cobro
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold text-[10px] rounded-xl uppercase">
                      Al día
                    </span>
                  )}
                </div>
              </div>

              {/* Parámetros del Contrato & Estado */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <span className="text-[10px] text-slate-555 font-bold uppercase block">Parámetros del Contrato & Ubicación</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Inicio Contrato</span>
                    <span className="font-bold text-slate-300">{selectedProperty.contractStart}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Fin Contrato</span>
                    <span className="font-bold text-slate-300">{selectedProperty.contractEnd}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Ajuste Aplicado</span>
                    <span className="font-bold text-slate-300">{selectedProperty.adjustmentIndex}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Expensas</span>
                    <span className="font-bold text-slate-300">${selectedProperty.expensasAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Cambiar estado contrato */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Estado Contrato</span>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-850 text-[10px]">
                    <button onClick={() => handleContractStateChange(selectedProperty.id, 'draft')} className={`px-2 py-0.5 rounded ${selectedProperty.contractState === 'draft' ? 'bg-yellow-600 text-slate-950 font-bold' : 'text-slate-500'}`}>Borrador</button>
                    <button onClick={() => handleContractStateChange(selectedProperty.id, 'active')} className={`px-2 py-0.5 rounded ${selectedProperty.contractState === 'active' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-500'}`}>Activo</button>
                    <button onClick={() => handleContractStateChange(selectedProperty.id, 'expired')} className={`px-2 py-0.5 rounded ${selectedProperty.contractState === 'expired' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-500'}`}>Vencido</button>
                    <button onClick={() => handleContractStateChange(selectedProperty.id, 'terminated')} className={`px-2 py-0.5 rounded ${selectedProperty.contractState === 'terminated' ? 'bg-rose-600 text-slate-950 font-bold' : 'text-slate-500'}`}>Rescindido</button>
                  </div>
                </div>
              </div>

              {/* FASE 3: Calculadora de Indexación de Alquiler */}
              {selectedProperty.contractState === 'active' && (
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-yellow-500 uppercase block">Calcular & Aplicar Indexación (Ajuste Anual)</span>
                  
                  <p className="text-[10px] text-slate-500">
                    Ajustá el importe del alquiler mensual utilizando el índice acumulado ICL/IPC pactado.
                  </p>

                  <form onSubmit={handleApplyIndexation} className="flex flex-col sm:flex-row gap-3 pt-1">
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] text-slate-550 block font-bold uppercase">Índice Acumulado (%)</label>
                        <input
                          type="number"
                          value={indexRatePercent}
                          onChange={e => setIndexRatePercent(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1 shrink-0">
                        <label className="text-[9px] text-slate-550 block font-bold uppercase">Índice Pactado</label>
                        <span className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 block font-bold font-mono">
                          {selectedProperty.adjustmentIndex}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="self-end px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer"
                    >
                      Aplicar Ajuste de Ley
                    </button>
                  </form>
                </div>
              )}

              {/* Registro de Ofertas e Historial */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <span className="text-[10px] text-slate-555 font-bold uppercase block">Historial de Ofertas Económicas</span>
                
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {selectedProperty.offers.length === 0 ? (
                    <span className="text-xs text-slate-600 italic block">No hay ofertas económicas para este inmueble.</span>
                  ) : (
                    selectedProperty.offers.map(o => (
                      <div key={o.id} className="flex justify-between items-center text-xs bg-slate-900/40 p-2 rounded-xl border border-slate-900">
                        <div>
                          <span className="font-bold text-slate-200 block">{o.offererName}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{o.date}</span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <span className="font-bold text-slate-350">${o.offerAmount.toLocaleString()}</span>
                          <select
                            value={o.status}
                            onChange={e => {
                              if (isOfferStatus(e.target.value)) handleOfferStatusChange(o.id, e.target.value);
                            }}
                            className="bg-slate-900 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-350"
                          >
                            {OFFER_STATUS_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form agregar oferta */}
                <form onSubmit={handleCreateOffer} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-900">
                  <input
                    type="text"
                    required
                    placeholder="Interesado..."
                    value={offererName}
                    onChange={e => setOffererName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Monto Oferta ($)..."
                    value={offerAmount === 0 ? '' : offerAmount}
                    onChange={e => setOfferAmount(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <button type="submit" className="py-1.5 bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs">
                    Registrar Oferta
                  </button>
                </form>
              </div>

              {/* Agendar Reclamo Mantenimiento */}
              <form onSubmit={handleAddClaim} className="space-y-3 pt-4 border-t border-slate-900">
                <span className="text-xs font-bold text-yellow-550 uppercase tracking-wider block flex items-center gap-1.5">
                  <Hammer className="h-4.5 w-4.5" />
                  Reportar Reclamo / Mantenimiento
                </span>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pérdida de agua..."
                    value={claimText}
                    onChange={e => setClaimText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button type="submit" className="px-4 bg-slate-950 border border-slate-800 text-slate-350 hover:bg-slate-900 rounded-xl text-xs">
                    Cargar Reclamo
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900/40 p-10 rounded-3xl border border-slate-850 text-center text-slate-600 text-xs italic">
              Selecciona una propiedad para liquidaciones y contratos.
            </div>
          )}

          {/* Listado de Reclamos */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider block">
                Mantenimientos & Reparaciones Activas
              </h3>
              
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[9px] text-slate-500 font-bold uppercase shrink-0">Gremio Asignado:</span>
                <select
                  value={selectedTech}
                  onChange={e => setSelectedTech(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-[10px] rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none"
                >
                  <option value="Mario Pereyra (Electricista)">Mario Pereyra (Electricista)</option>
                  <option value="Juan Gómez (Plomero/Gasista)">Juan Gómez (Plomero/Gasista)</option>
                  <option value="Lucas Altieri (Cerrajero)">Lucas Altieri (Cerrajero)</option>
                  <option value="Roberto Díaz (Pintor/Albañil)">Roberto Díaz (Pintor/Albañil)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {claims.map(c => (
                <div key={c.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-extrabold text-slate-300 block text-[11px]">{c.propertyAddress}</span>
                    <span className="text-[10px] text-slate-550 italic">"{c.description}"</span>
                  </div>
                  <div className="flex gap-2.5 items-center">
                    {c.status === 'pending' && (
                      <button
                        onClick={() => handleAssignTechnician(c.id)}
                        className="px-2.5 py-1 bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-black rounded-lg text-[9px] uppercase cursor-pointer"
                      >
                        Asignar Gremio
                      </button>
                    )}
                    <select
                      value={c.status}
                      onChange={e => {
                        if (isClaimStatus(e.target.value)) handleUpdateClaimStatus(c.id, e.target.value);
                      }}
                      className="bg-slate-900 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-350"
                    >
                      {CLAIM_STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                  setFeedback({ tone: 'success', message: 'Comprobante inmobiliario enviado a impresión.' });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-550 text-slate-950 font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Propiedad Nueva */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">Cargar Nuevo Contrato</h2>
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Dirección del Inmueble</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Av. Santa Fe 3400 5°B, CABA"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tipo Propiedad</label>
                  <select
                    value={newType}
                    onChange={e => {
                      if (isPropertyType(e.target.value)) setNewType(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {PROPERTY_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Propietario (Dueño)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Horacio Quiroga"
                    value={newOwner}
                    onChange={e => setNewOwner(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Inquilino</label>
                  <input
                    type="text"
                    placeholder="Ej: Clara Vignolo"
                    value={newTenant}
                    onChange={e => setNewTenant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Valor Alquiler ($)</label>
                  <input
                    type="number"
                    required
                    value={newRent}
                    onChange={e => setNewRent(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Superficie (M²)</label>
                  <input
                    type="number"
                    required
                    value={newSurface}
                    onChange={e => setNewSurface(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Expensas Mensuales ($)</label>
                  <input
                    type="number"
                    required
                    value={newExpensas}
                    onChange={e => setNewExpensas(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
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
                  className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Guardar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
