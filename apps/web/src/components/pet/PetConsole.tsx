'use client';

import React, { useMemo, useState } from 'react';
import {
  Heart, Search, Plus, CheckCircle2, X, Printer, AlertTriangle, User, Flame
} from 'lucide-react';

type VaccineStatus = 'applied' | 'pending';
type PetSpecies = 'perro' | 'gato' | 'exotico';
type SpeciesFilter = PetSpecies | 'all';
type VetName = 'Dra. Sofía Martínez' | 'Dr. Claudio Barber';
type VetFilter = VetName | 'all';
type Feedback = { tone: 'success' | 'warning' | 'error'; message: string };

interface VaccineRecord {
  vaccineName: string;
  status: VaccineStatus;
  dueDate: string;
}

interface WeightRecord {
  date: string;
  weightKg: number;
}

interface PetProfile {
  id: string;
  petName: string;
  species: PetSpecies;
  breed: string;
  ageMonths: number;
  ownerName: string;
  ownerPhone: string;
  regularFood: string;
  weightHistory: WeightRecord[];
  vaccinationHistory: VaccineRecord[];
  visitsFrequencyRate: number; // e.g. 1.2 veces por mes
  assignedVet: VetName;
  diagnosticNotes: string;
}

interface GroomingSlot {
  id: string;
  time: string;
  spotsMax: number;
  spotsTaken: number;
  groomer: string;
  waitingList: string[]; // List of pet names waiting
}

const SPECIES_LABELS: Record<PetSpecies, string> = {
  perro: 'Perro',
  gato: 'Gato',
  exotico: 'Exótico'
};

const VACCINE_STATUS_LABELS: Record<VaccineStatus, string> = {
  applied: 'Aplicada',
  pending: 'Pendiente'
};

const SPECIES_FILTERS: Array<{ label: string; value: SpeciesFilter }> = [
  { label: 'Todas las Especies', value: 'all' },
  { label: 'Perro', value: 'perro' },
  { label: 'Gato', value: 'gato' },
  { label: 'Exótico', value: 'exotico' }
];

const VET_OPTIONS: VetName[] = ['Dra. Sofía Martínez', 'Dr. Claudio Barber'];
const VET_FILTERS: Array<{ label: string; value: VetFilter }> = [
  { label: 'Todos los Profesionales', value: 'all' },
  ...VET_OPTIONS.map(vet => ({ label: vet, value: vet }))
];

const isSpeciesFilter = (value: string): value is SpeciesFilter =>
  SPECIES_FILTERS.some(option => option.value === value);

const isPetSpecies = (value: string): value is PetSpecies =>
  value === 'perro' || value === 'gato' || value === 'exotico';

const isVetFilter = (value: string): value is VetFilter =>
  VET_FILTERS.some(option => option.value === value);

const todayISO = () => new Date().toISOString().split('T')[0];

const INITIAL_PETS: PetProfile[] = [
  {
    id: 'pet-1',
    petName: 'Roco',
    species: 'perro',
    breed: 'Bulldog Francés',
    ageMonths: 24,
    ownerName: 'Eduardo Galeano',
    ownerPhone: '11-5841-2532',
    regularFood: 'Royal Canin Bulldog Junior 3kg',
    weightHistory: [
      { date: '2026-05-10', weightKg: 11.2 },
      { date: '2026-06-15', weightKg: 12.5 },
      { date: '2026-07-01', weightKg: 12.8 }
    ],
    vaccinationHistory: [
      { vaccineName: 'Antirrábica', status: 'applied', dueDate: '2026-06-10' },
      { vaccineName: 'Séxtuple Anual', status: 'pending', dueDate: '2026-07-28' }
    ],
    visitsFrequencyRate: 1.5,
    assignedVet: 'Dra. Sofía Martínez',
    diagnosticNotes: 'Chequeo general. Roco presenta un leve sobrepeso para su contextura. Controlar alimento.'
  },
  {
    id: 'pet-2',
    petName: 'Mimi',
    species: 'gato',
    breed: 'Siamés',
    ageMonths: 18,
    ownerName: 'Paula Albarracín',
    ownerPhone: '11-9988-7733',
    regularFood: 'Pro Plan Cat Urinary 2kg',
    weightHistory: [
      { date: '2026-06-10', weightKg: 4.1 },
      { date: '2026-07-02', weightKg: 3.9 }
    ],
    vaccinationHistory: [
      { vaccineName: 'Triple Felina', status: 'applied', dueDate: '2026-04-15' }
    ],
    visitsFrequencyRate: 0.8,
    assignedVet: 'Dr. Claudio Barber',
    diagnosticNotes: 'Gato sano. Comportamiento y pelaje en óptimo estado.'
  }
];

const INITIAL_GROOMING: GroomingSlot[] = [
  { id: 'g1', time: '10:00', spotsMax: 4, spotsTaken: 4, groomer: 'Marta Estilista', waitingList: ['Coco (Caniche)'] },
  { id: 'g2', time: '11:30', spotsMax: 4, spotsTaken: 2, groomer: 'Marta Estilista', waitingList: [] },
  { id: 'g3', time: '16:00', spotsMax: 4, spotsTaken: 1, groomer: 'Carlos Peluquero', waitingList: [] }
];

export default function PetConsole() {
  const [pets, setPets] = useState<PetProfile[]>(INITIAL_PETS);
  const [groomingSlots, setGroomingSlots] = useState<GroomingSlot[]>(INITIAL_GROOMING);
  const [selectedPet, setSelectedPet] = useState<PetProfile | null>(INITIAL_PETS[0]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // FASE 3: Inventario y Venta de Alimentos/Accesorios Pet Shop
  const [petShopProducts, setPetShopProducts] = useState([
    { id: 'prod1', name: 'Alimento Royal Canin Perro 3kg', price: 18500, stock: 12, category: 'Alimento' },
    { id: 'prod2', name: 'Alimento Pro Plan Gato Urinary 2kg', price: 14000, stock: 4, category: 'Alimento' },
    { id: 'prod3', name: 'Collar Antiparasitario Scalibor', price: 9500, stock: 20, category: 'Accesorios' },
    { id: 'prod4', name: 'Piedras Sanitarias Gato 4kg', price: 3500, stock: 15, category: 'Higiene' }
  ]);
  const [cashBalance, setCashBalance] = useState(250000);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all');
  const [vetFilter, setVetFilter] = useState<VetFilter>('all');

  // Form nuevo paciente
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpecies, setNewSpecies] = useState<PetSpecies>('perro');
  const [newBreed, setNewBreed] = useState('');
  const [newAge, setNewAge] = useState(12);
  const [newOwner, setNewOwner] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFood, setNewFood] = useState('');

  // Form diagnóstico
  const [diagNotes, setDiagNotes] = useState(INITIAL_PETS[0]?.diagnosticNotes ?? '');
  const [newWeight, setNewWeight] = useState(0);

  // Modales Impresiones
  const [printModalContent, setPrintModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleCreatePet = (e: React.FormEvent) => {
    e.preventDefault();
    const petName = newName.trim();
    const ownerName = newOwner.trim();
    const ageMonths = Number(newAge);

    if (!petName || !ownerName || ageMonths <= 0) {
      setFeedback({ tone: 'error', message: 'Completá mascota, dueño y edad con valores válidos.' });
      return;
    }

    const newPet: PetProfile = {
      id: `pet-${Date.now()}`,
      petName,
      species: newSpecies,
      breed: newBreed.trim(),
      ageMonths,
      ownerName,
      ownerPhone: newPhone.trim(),
      regularFood: newFood.trim(),
      weightHistory: [{ date: todayISO(), weightKg: 5.0 }],
      vaccinationHistory: [
        { vaccineName: 'Antirrábica Obligatoria', status: 'pending', dueDate: todayISO() }
      ],
      visitsFrequencyRate: 1.0,
      assignedVet: 'Dra. Sofía Martínez',
      diagnosticNotes: ''
    };

    setPets(prev => [newPet, ...prev]);
    setSelectedPet(newPet);
    setDiagNotes('');
    setIsAddModalOpen(false);
    setFeedback({ tone: 'success', message: `Ficha clínica creada para ${newPet.petName}.` });

    // Reset
    setNewName('');
    setNewBreed('');
    setNewOwner('');
    setNewPhone('');
    setNewFood('');
  };

  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || newWeight <= 0) {
      setFeedback({ tone: 'error', message: 'Ingresá un peso válido mayor a cero.' });
      return;
    }

    const updated: PetProfile = {
      ...selectedPet,
      weightHistory: [
        ...selectedPet.weightHistory,
        { date: todayISO(), weightKg: Number(newWeight) }
      ]
    };

    setPets(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedPet(updated);
    setNewWeight(0);
    setFeedback({ tone: 'success', message: `Peso registrado para ${updated.petName}.` });
  };

  const handleSaveDiagnosis = () => {
    if (!selectedPet) return;

    const updated: PetProfile = { ...selectedPet, diagnosticNotes: diagNotes.trim() };

    setPets(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedPet(updated);
    setFeedback({ tone: 'success', message: 'Historia clínica y diagnóstico del veterinario guardados.' });
  };

  const handleToggleVaccine = (vaccineIdx: number) => {
    if (!selectedPet) return;

    const vaccinationHistory = selectedPet.vaccinationHistory.map((vaccine, idx) => {
      const nextStatus: VaccineStatus = vaccine.status === 'applied' ? 'pending' : 'applied';
      return idx === vaccineIdx ? { ...vaccine, status: nextStatus } : vaccine;
    });
    const updated: PetProfile = { ...selectedPet, vaccinationHistory };

    setPets(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedPet(updated);
  };

  const handleBookGrooming = (slotId: string) => {
    if (!selectedPet) {
      setFeedback({ tone: 'warning', message: 'Seleccioná una mascota antes de reservar peluquería.' });
      return;
    }

    setGroomingSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        const isFull = s.spotsTaken >= s.spotsMax;
        if (isFull) {
          setFeedback({ tone: 'warning', message: `Peluquería completa: ${selectedPet.petName} fue agregada a lista de espera.` });
          return { ...s, waitingList: [...s.waitingList, `${selectedPet.petName} (Espera)`] };
        } else {
          setFeedback({ tone: 'success', message: `Turno de peluquería agendado para ${selectedPet.petName} a las ${s.time} hs.` });
          return { ...s, spotsTaken: s.spotsTaken + 1 };
        }
      }
      return s;
    }));
  };

  const handlePrintPrescription = (pet: PetProfile) => {
    setPrintModalContent({
      title: `RECETA VETERINARIA DIGITAL`,
      content: `Paciente: ${pet.petName} (${pet.breed})\nDueño: ${pet.ownerName}\n\nPrescripción Médica:\n- Alimento Recomendado: ${pet.regularFood || 'Dieta habitual'}\n- Indicación Clínica: ${pet.diagnosticNotes || 'Chequeo general sin indicaciones farmacéuticas.'}\n\nFirma Veterinaria Oficial\nMatrícula Profesional Nro: VET-9988`
    });
  };

  const handlePrintRecord = (pet: PetProfile) => {
    const weights = pet.weightHistory.map(w => `- ${w.date}: ${w.weightKg} kg`).join('\n');
    const vaccines = pet.vaccinationHistory.map(v => `- ${v.vaccineName}: ${VACCINE_STATUS_LABELS[v.status]} (${v.dueDate})`).join('\n');

    setPrintModalContent({
      title: `HISTORIAL CLÍNICO COMPLETO`,
      content: `Mascota: ${pet.petName}\nEspecie: ${SPECIES_LABELS[pet.species]}\nRaza: ${pet.breed}\nEdad: ${pet.ageMonths} meses\nResponsable: ${pet.ownerName} (${pet.ownerPhone})\nFrecuencia visitas: ${pet.visitsFrequencyRate} veces/mes\n\nRegistro Histórico de Pesajes:\n${weights}\n\nPlan de Vacunación:\n${vaccines}\n\nDiagnóstico de Cabecera:\n${pet.diagnosticNotes || 'Sin observaciones.'}`
    });
  };

  // FASE 3: Vender producto de Pet Shop
  const handleSellProduct = (productId: string, productName: string, price: number) => {
    let success = false;
    setPetShopProducts(prev => prev.map(p => {
      if (p.id === productId) {
        if (p.stock > 0) {
          success = true;
          return { ...p, stock: p.stock - 1 };
        }
      }
      return p;
    }));

    if (success) {
      setCashBalance(c => c + price);
      setFeedback({ tone: 'success', message: `Venta realizada: 1x ${productName} ($${price.toLocaleString()}) registrada en caja.` });
    } else {
      setFeedback({ tone: 'error', message: `Sin stock disponible para ${productName}. Por favor reabastecer.` });
    }
  };

  // FASE 3: Reabastecer producto de Pet Shop
  const handleReplenishProduct = (productId: string, productName: string, cost: number) => {
    if (cashBalance < cost) {
      setFeedback({ tone: 'error', message: `Saldo insuficiente en caja para reabastecer ${productName}.` });
      return;
    }

    setPetShopProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, stock: p.stock + 10 };
      }
      return p;
    }));
    setCashBalance(c => c - cost);
    setFeedback({ tone: 'success', message: `Reabastecimiento completado: +10 unidades de ${productName}. Costo debitado de caja.` });
  };

  // FASE 3: Enviar recordatorio de vacuna por SMS/WhatsApp
  const handleSendVaccineReminder = (petName: string, vaccineName: string, ownerPhone: string) => {
    setFeedback({
      tone: 'success',
      message: `✓ Recordatorio SMS despachado a ${selectedPet?.ownerName} (${ownerPhone}): "Tu mascota ${petName} tiene pendiente la vacuna: ${vaccineName}. Reservá tu turno en el ERP."`
    });
  };

  const metrics = useMemo(() => {
    const pendingVaccines = pets.reduce(
      (acc, curr) => acc + curr.vaccinationHistory.filter(v => v.status === 'pending').length,
      0
    );
    const averageVisitRate = pets.length > 0
      ? pets.reduce((acc, curr) => acc + curr.visitsFrequencyRate, 0) / pets.length
      : 0;

    return {
      activePatients: pets.length,
      groomingTurns: groomingSlots.reduce((acc, curr) => acc + curr.spotsTaken, 0),
      pendingVaccines,
      averageVisitRate
    };
  }, [pets, groomingSlots]);

  // Filtrar
  const filteredPets = useMemo(() => pets.filter(p => {
    const matchSearch = p.petName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSpecies = speciesFilter === 'all' || p.species === speciesFilter;
    const matchVet = vetFilter === 'all' || p.assignedVet === vetFilter;

    return matchSearch && matchSpecies && matchVet;
  }), [pets, searchTerm, speciesFilter, vetFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-red-500 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">Consola de Pacientes Veterinarios & Peluquería</h1>
            <p className="text-slate-400 text-xs mt-0.5">Fichas clínicas de mascotas, planes de vacunación, recetas digitales e historial de pesos.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Ingresar Paciente
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
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Pacientes Activos</span>
          <span className="text-xl font-black text-white mt-1 block">{metrics.activePatients}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Peluquería Hoy</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {metrics.groomingTurns} turnos
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Vacunas Pendientes</span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {metrics.pendingVaccines}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Frecuencia Visitas</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">{metrics.averageVisitRate.toFixed(1)} /mes</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Caja Pet Shop</span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">${cashBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Alertas Críticas (Vacunas Vencidas) */}
      {pets.some(p => p.vaccinationHistory.some(v => v.status === 'pending')) && (
        <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-550 animate-pulse" />
            <span>Alerta Veterinaria: Existen mascotas con vacunas obligatorias pendientes de aplicación.</span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Mascota o Dueño</label>
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
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Filtrar por Especie</label>
          <select
            value={speciesFilter}
            onChange={e => {
              if (isSpeciesFilter(e.target.value)) setSpeciesFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {SPECIES_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Veterinario Asignado</label>
          <select
            value={vetFilter}
            onChange={e => {
              if (isVetFilter(e.target.value)) setVetFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {VET_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Listado de Mascotas */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <User className="h-4.5 w-4.5 text-rose-500" />
            Pacientes
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredPets.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                Sin resultados de mascotas registradas.
              </div>
            ) : (
              filteredPets.map(p => {
                const active = selectedPet?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPet(p);
                      setDiagNotes(p.diagnosticNotes);
                    }}
                    className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                      active ? 'bg-rose-950/10 border-rose-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-white">{p.petName}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        p.species === 'perro' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        p.species === 'gato' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-450 border border-amber-500/25'
                      }`}>
                        {SPECIES_LABELS[p.species]}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 block mt-1">Dueño: {p.ownerName} | Raza: {p.breed}</span>
                    <span className="text-[10px] text-slate-500 block">Frecuencia: {p.visitsFrequencyRate} visitas/mes</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ficha Médica y Peluquería */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedPet ? (
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">{selectedPet.petName} ({selectedPet.breed})</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Dueño: {selectedPet.ownerName} ({selectedPet.ownerPhone}) | Alimento: {selectedPet.regularFood}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintPrescription(selectedPet)}
                    className="p-2 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850"
                  >
                    <Printer className="h-3.5 w-3.5 text-rose-500" />
                  </button>
                  <button
                    onClick={() => handlePrintRecord(selectedPet)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 font-bold rounded-xl text-[10px]"
                  >
                    Historial Clínico
                  </button>
                  <button
                    onClick={() => handlePrintPrescription(selectedPet)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-[10px]"
                  >
                    Receta
                  </button>
                </div>
              </div>

              {/* Registro de vacunas */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-[10px] text-slate-550 font-bold uppercase block">Calendario de Vacunación Oficial</span>
                <div className="space-y-2">
                  {selectedPet.vaccinationHistory.map((v, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/40 rounded-xl border border-slate-900">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={v.status === 'applied'}
                          onChange={() => handleToggleVaccine(idx)}
                          className="cursor-pointer"
                        />
                        <span className={`font-semibold ${v.status === 'applied' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {v.vaccineName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-slate-500 font-mono">Vto: {v.dueDate}</span>
                        {v.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleSendVaccineReminder(selectedPet.petName, v.vaccineName, selectedPet.ownerPhone)}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[8px] uppercase font-bold cursor-pointer"
                          >
                            SMS Alerta
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balanza histórica */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-555 font-bold uppercase block">Control Balanza Histórica de Peso</span>
                  <span className="text-[10px] text-slate-500">
                    Último Peso: {selectedPet.weightHistory[selectedPet.weightHistory.length - 1]?.weightKg} KG
                  </span>
                </div>

                {/* Visual Weight Progress Chart */}
                <div className="space-y-2 pt-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Evolución de Peso</span>
                  <div className="space-y-1.5 bg-slate-900/30 p-2.5 rounded-xl border border-slate-900">
                    {selectedPet.weightHistory.map((w, i) => {
                      const maxWeight = Math.max(...selectedPet.weightHistory.map(wh => wh.weightKg), 1);
                      const pct = (w.weightKg / maxWeight) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3 text-[10px]">
                          <span className="w-16 text-slate-550 font-mono shrink-0">{w.date}</span>
                          <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              style={{ width: `${pct}%` }} 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            ></div>
                          </div>
                          <span className="w-10 text-right text-slate-350 font-bold font-mono">{w.weightKg} kg</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleLogWeight} className="flex gap-2 pt-1">
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="Ej: 12.8 kg"
                    value={newWeight === 0 ? '' : newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-750 focus:outline-none"
                  />
                  <button type="submit" className="px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold rounded-xl cursor-pointer">
                    Registrar Peso
                  </button>
                </form>
              </div>

              {/* Consulta veterinaria / Diagnóstico */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-rose-450 uppercase block">Diagnóstico de Consulta Médica</span>
                <textarea
                  rows={3}
                  value={diagNotes}
                  onChange={e => setDiagNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 resize-none focus:outline-none"
                />
                <button
                  onClick={handleSaveDiagnosis}
                  className="px-4 py-2 bg-rose-650 hover:bg-rose-600 text-white font-bold rounded-xl text-xs"
                >
                  Guardar Historia Clínica
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/40 p-10 rounded-3xl border border-slate-850 text-center text-slate-650 text-xs italic">
              Selecciona una mascota para ver su ficha clínica veterinaria.
            </div>
          )}

          {/* Grilla Peluquería Canina */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <Flame className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
              Turnos Peluquería Canina & Baño
            </h3>

            <div className="space-y-3">
              {groomingSlots.map(s => {
                const full = s.spotsTaken >= s.spotsMax;
                return (
                  <div key={s.id} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div className="space-y-1">
                      <span className="font-extrabold text-xs text-white block">Peluquero: {s.groomer}</span>
                      <span className="text-[10px] text-slate-500 block font-semibold">Horario: {s.time} hs</span>
                      {s.waitingList.length > 0 && (
                        <span className="text-[9px] text-amber-500 block">
                          Lista de Espera: {s.waitingList.join(', ')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 items-center w-full md:w-auto border-t md:border-t-0 border-slate-900 pt-3 md:pt-0 justify-between">
                      <div className="text-left md:text-right shrink-0">
                        <span className="text-[9px] text-slate-555 uppercase block font-bold">Cupos</span>
                        <span className="font-black text-rose-450 text-xs">{s.spotsTaken} / {s.spotsMax}</span>
                      </div>

                      <button
                        onClick={() => handleBookGrooming(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                          full ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 animate-pulse' : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                      >
                        {full ? 'Lista Espera' : 'Reservar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FASE 3: POS de Alimentos & Accesorios (Pet Shop Integrado) */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4 mt-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="h-4.5 w-4.5 text-cyan-400" />
                Venta de Alimentos, Fármacos & Accesorios (Mini POS)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Caja Disponible: <strong className="text-emerald-450">${cashBalance.toLocaleString()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {petShopProducts.map(p => {
                const lowStock = p.stock < 5;
                const outOfStock = p.stock === 0;
                return (
                  <div key={p.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{p.name}</span>
                        <span className="text-[8px] bg-slate-900 text-cyan-400 px-1 py-0.5 rounded font-mono uppercase">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-slate-500">
                        <span>Precio: <strong className="text-slate-350">${p.price.toLocaleString()}</strong></span>
                        <span className={`font-mono ${lowStock ? 'text-amber-500 font-bold' : ''}`}>
                          Stock: {p.stock} uds {lowStock ? '(Bajo)' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReplenishProduct(p.id, p.name, p.price * 0.5 * 10)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-350 font-bold rounded-lg text-[9px] uppercase cursor-pointer"
                        title="Comprar lote de 10 unidades al proveedor (-50% costo)"
                      >
                        Reponer (+10)
                      </button>
                      <button
                        onClick={() => handleSellProduct(p.id, p.name, p.price)}
                        disabled={outOfStock}
                        className={`px-3 py-1.5 font-bold rounded-lg text-[9px] uppercase cursor-pointer ${
                          outOfStock 
                            ? 'bg-slate-900 text-slate-650 border border-slate-850 cursor-not-allowed' 
                            : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950'
                        }`}
                      >
                        Vender
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

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
                  setFeedback({ tone: 'success', message: 'Documento veterinario enviado a impresión.' });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-550 text-white font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Paciente */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">Ingreso de Mascota</h2>
            <form onSubmit={handleCreatePet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre Mascota</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Roco"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Especie</label>
                  <select
                    value={newSpecies}
                    onChange={e => {
                      if (isPetSpecies(e.target.value)) setNewSpecies(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {SPECIES_FILTERS.filter(option => option.value !== 'all').map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Raza</label>
                  <input
                    type="text"
                    placeholder="Ej: Bulldog"
                    value={newBreed}
                    onChange={e => setNewBreed(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Edad (Meses)</label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={e => setNewAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Dueño / Responsable</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Eduardo"
                    value={newOwner}
                    onChange={e => setNewOwner(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 11-5841-..."
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Alimento Habitual</label>
                <input
                  type="text"
                  placeholder="Ej: Royal Canin 3kg..."
                  value={newFood}
                  onChange={e => setNewFood(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs"
                >
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
