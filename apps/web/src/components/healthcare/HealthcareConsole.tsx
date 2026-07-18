'use client';

import React, { useMemo, useState } from 'react';
import { 
  Calendar, Clock, User, Heart, FileText, CheckCircle2, AlertCircle, Plus, Search, 
  ChevronRight, Check, Activity, FileSpreadsheet, Paperclip, AlertOctagon, UserPlus,
  Filter, Award, Printer, ShieldCheck, Download, Trash2, ArrowUpRight, TrendingUp, X
} from 'lucide-react';

type VisitType = 'first_time' | 'control' | 'urgency' | 'teleconsultation';
type Priority = 'normal' | 'control' | 'urgent' | 'high_risk';
type PrescriptionStatus = 'pending' | 'emitted' | 'delivered';
type AppointmentStatus = 'pending' | 'confirmed' | 'waiting' | 'in_consultation' | 'completed' | 'absent' | 'cancelled';
type Specialty = 'Cardiología' | 'Pediatría' | 'Clínica General' | 'Traumatología';
type AgendaTab = 'day' | 'week' | 'month';
type Feedback = { type: 'success' | 'error'; message: string } | null;

const APPOINTMENT_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'waiting', 'in_consultation', 'completed', 'absent', 'cancelled'];
const VISIT_TYPES: VisitType[] = ['first_time', 'control', 'urgency', 'teleconsultation'];
const PRIORITIES: Priority[] = ['normal', 'control', 'urgent', 'high_risk'];
const PRESCRIPTION_STATUSES: PrescriptionStatus[] = ['pending', 'emitted', 'delivered'];
const SPECIALTIES: Specialty[] = ['Cardiología', 'Pediatría', 'Clínica General', 'Traumatología'];

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUSES.includes(value as AppointmentStatus);
}

function isVisitType(value: string): value is VisitType {
  return VISIT_TYPES.includes(value as VisitType);
}

function isPriority(value: string): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

function isPrescriptionStatus(value: string): value is PrescriptionStatus {
  return PRESCRIPTION_STATUSES.includes(value as PrescriptionStatus);
}

function isSpecialty(value: string): value is Specialty {
  return SPECIALTIES.includes(value as Specialty);
}

interface Patient {
  id: string;
  name: string;
  age: number;
  bloodType: string;
  allergies: string;
  personalHistory: string;
  familyHistory: string;
  currentMeds: string;
  isHighRisk: boolean;
  priority: Priority;
  attachments: Array<{ type: 'Laboratorio' | 'Radiografía' | 'ECG' | 'Ecografía'; date: string; url: string }>;
  history: Array<{ 
    date: string; 
    diagnosis: string; 
    doctor: string; 
    indications: string; 
    prescriptions: string; 
    prescriptionStatus: PrescriptionStatus;
    studiesRequested: string;
    type: VisitType;
  }>;
}

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: Specialty;
  time: string;
  date: string;
  status: AppointmentStatus;
  reason: string;
  patientId: string;
  type: VisitType;
  priority: Priority;
  copayAmount: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'Horacio Quiroga',
    age: 45,
    bloodType: 'O+',
    allergies: 'Penicilina, Aspirina',
    personalHistory: 'Hipertensión arterial diagnosticada en 2022. Ex fumador.',
    familyHistory: 'Padre con antecedentes de infarto agudo de miocardio.',
    currentMeds: 'Enalapril 10mg/día, Aspirina 100mg/día (suspendida)',
    isHighRisk: true,
    priority: 'high_risk',
    attachments: [
      { type: 'Laboratorio', date: '2026-06-15', url: 'Hemograma_Completo_Quiroga.pdf' },
      { type: 'ECG', date: '2026-05-10', url: 'ECG_Esfuerzo_Quiroga.pdf' }
    ],
    history: [
      { 
        date: '2026-06-15', 
        diagnosis: 'Hipertensión Leve controlada', 
        doctor: 'Dr. Carlos Gómez', 
        indications: 'Continuar Enalapril 10mg cada 24hs.', 
        prescriptions: 'Enalapril 10mg x 30 comp', 
        prescriptionStatus: 'delivered',
        studiesRequested: 'Rutina de Laboratorio + Perfil Lipídico',
        type: 'control'
      }
    ]
  },
  {
    id: 'p2',
    name: 'Clara Vignolo',
    age: 28,
    bloodType: 'A-',
    allergies: 'Ninguna',
    personalHistory: 'Ninguno de relevancia.',
    familyHistory: 'Madre con hipotiroidismo.',
    currentMeds: 'Ninguna',
    isHighRisk: false,
    priority: 'normal',
    attachments: [
      { type: 'Ecografía', date: '2026-07-01', url: 'Eco_Tiroides_Vignolo.jpg' }
    ],
    history: [
      { 
        date: '2026-07-01', 
        diagnosis: 'Faringitis Aguda bacteriana', 
        doctor: 'Dra. Lucía Fernández', 
        indications: 'Amoxicilina 500mg cada 8hs por 7 días.', 
        prescriptions: 'Amoxicilina 500mg x 21 comp', 
        prescriptionStatus: 'emitted',
        studiesRequested: 'Ninguno',
        type: 'first_time'
      }
    ]
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'a1', patientName: 'Horacio Quiroga', doctorName: 'Dr. Carlos Gómez', specialty: 'Cardiología', time: '09:00', date: '2026-07-10', status: 'waiting', reason: 'Control de Presión Arterial', patientId: 'p1', type: 'control', priority: 'high_risk', copayAmount: 2500 },
  { id: 'a2', patientName: 'Clara Vignolo', doctorName: 'Dra. Lucía Fernández', specialty: 'Clínica General', time: '09:30', date: '2026-07-10', status: 'in_consultation', reason: 'Dolor de Garganta / Fiebre', patientId: 'p2', type: 'first_time', priority: 'normal', copayAmount: 1800 },
  { id: 'a3', patientName: 'Marcos Juárez', doctorName: 'Dr. Carlos Gómez', specialty: 'Cardiología', time: '10:00', date: '2026-07-10', status: 'confirmed', reason: 'Chequeo de Rutina y Dolor Torácico Leve', patientId: 'p1', type: 'urgency', priority: 'urgent', copayAmount: 4000 },
  { id: 'a4', patientName: 'Sofía Martínez', doctorName: 'Dra. Lucía Fernández', specialty: 'Clínica General', time: '10:30', date: '2026-07-10', status: 'completed', reason: 'Entrega de Análisis Clínicos', patientId: 'p2', type: 'control', priority: 'control', copayAmount: 0 }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', timestamp: '12:05:14', user: 'Recepcionista Juan', action: 'Ingreso Sala de Espera', details: 'Paciente Horacio Quiroga pasó a sala de espera.' },
  { id: 'log-2', timestamp: '12:10:45', user: 'Dra. Lucía Fernández', action: 'Firma Receta Digital', details: 'Se firmó digitalmente receta de Amoxicilina para Clara Vignolo.' }
];

export default function HealthcareConsole() {
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(INITIAL_APPOINTMENTS[0]);
  const [agendaTab, setAgendaTab] = useState<AgendaTab>('day');
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Filtros Avanzados
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<'all' | Specialty>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Form de Evolución Médica
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newIndications, setNewIndications] = useState('');
  const [newPrescription, setNewPrescription] = useState('');
  const [newStudies, setNewStudies] = useState('');
  const [newType, setNewType] = useState<VisitType>('control');
  const [nextControl, setNextControl] = useState('30 días');

  // FASE 3: Constantes Vitales IoT Simuladas
  const [vitalsHr, setVitalsHr] = useState(72);
  const [vitalsBp, setVitalsBp] = useState('120/80');
  const [vitalsO2, setVitalsO2] = useState(98);
  const [vitalsTemp, setVitalsTemp] = useState(36.6);
  const [isMeasuringVitals, setIsMeasuringVitals] = useState(false);

  // FASE 3: Sugerencias del Vademecum Clínico
  const VADEMECUM = [
    { drug: 'Ibuprofeno 600mg', category: 'Analgésico/Antiinflamatorio', indications: 'Tomar 1 comprimido cada 8 horas con las comidas por 5 días.' },
    { drug: 'Amoxicilina 500mg', category: 'Antibiótico', indications: 'Tomar 1 comprimido cada 8 horas por 7 días completos.' },
    { drug: 'Losartán 50mg', category: 'Antihipertensivo', indications: 'Tomar 1 comprimido por la mañana en ayunas de forma diaria.' },
    { drug: 'Clonazepam 0.5mg', category: 'Ansiolítico', indications: 'Tomar 1/2 comprimido por la noche antes de dormir.' },
    { drug: 'Paracetamol 500mg', category: 'Analgésico/Antipirético', indications: 'Tomar 1 comprimido cada 6 u 8 horas en caso de dolor o fiebre.' },
    { drug: 'Metformina 850mg', category: 'Hipoglucemiante', indications: 'Tomar 1 comprimido con el almuerzo.' },
  ];
  const [drugSuggestions, setDrugSuggestions] = useState<Array<{ drug: string; category: string; indications: string }>>([]);

  // Registrar nuevo paciente
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState(30);
  const [patientBlood, setPatientBlood] = useState('O+');
  const [patientAllergies, setPatientAllergies] = useState('Ninguna');
  const [patientPriority, setPatientPriority] = useState<Priority>('normal');

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{ title: string; content: string } | null>(null);

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString().slice(0, 8),
        ...log
      },
      ...prev
    ]);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName) return;

    const newPat: Patient = {
      id: `p-${Date.now()}`,
      name: patientName,
      age: Number(patientAge),
      bloodType: patientBlood,
      allergies: patientAllergies,
      personalHistory: 'Ninguno informado.',
      familyHistory: 'Ninguno informado.',
      currentMeds: 'Ninguna.',
      isHighRisk: patientPriority === 'high_risk' || patientPriority === 'urgent',
      priority: patientPriority,
      attachments: [],
      history: []
    };

    setPatients(prev => [...prev, newPat]);
    
    // Registrar Auditoría
    addAuditLog({
      user: 'Recepcionista Juan',
      action: 'Registrar Paciente',
      details: `Paciente ${patientName} registrado con prioridad: ${patientPriority}.`
    });

    setIsAddPatientOpen(false);
    setPatientName('');
    setFeedback({ type: 'success', message: `Paciente ${patientName} registrado con éxito.` });
  };

  const handleStatusChange = (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    
    const appt = appointments.find(a => a.id === id);
    if (appt) {
      addAuditLog({
        user: 'Dr. Carlos Gómez',
        action: 'Cambio Estado Turno',
        details: `Turno de ${appt.patientName} cambiado a estado: ${status}.`
      });
    }

    if (selectedAppt && selectedAppt.id === id) {
      setSelectedAppt(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleSaveEvolucion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt || !newDiagnosis) return;

    setPatients(prev => prev.map(p => {
      if (p.id === selectedAppt.patientId) {
        return {
          ...p,
          history: [
            {
              date: new Date().toISOString().split('T')[0],
              diagnosis: newDiagnosis,
              doctor: selectedAppt.doctorName,
              indications: `${newIndications} (Próximo control: ${nextControl})`,
              prescriptions: newPrescription,
              prescriptionStatus: newPrescription ? 'emitted' : 'pending',
              studiesRequested: newStudies,
              type: newType
            },
            ...p.history
          ]
        };
      }
      return p;
    }));

    // Registrar Auditoría de Evolución
    addAuditLog({
      user: selectedAppt.doctorName,
      action: 'Evolución Médica',
      details: `Se grabó evolución clínica y diagnóstico "${newDiagnosis}" para ${selectedAppt.patientName}.`
    });

    handleStatusChange(selectedAppt.id, 'completed');
    setNewDiagnosis('');
    setNewIndications('');
    setNewPrescription('');
    setNewStudies('');
    setFeedback({ type: 'success', message: 'Ficha médica guardada y consulta finalizada con éxito.' });
  };

  const handleUpdatePrescriptionStatus = (patientId: string, historyIndex: number, newStatus: PrescriptionStatus) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const updatedHistory = [...p.history];
        updatedHistory[historyIndex].prescriptionStatus = newStatus;
        return { ...p, history: updatedHistory };
      }
      return p;
    }));

    const targetPatient = patients.find(p => p.id === patientId);
    if (targetPatient) {
      addAuditLog({
        user: 'Farmacia / Recepción',
        action: 'Despacho Receta',
        details: `Receta de ${targetPatient.name} marcada como: ${newStatus}.`
      });
    }
  };

  const handlePrintReceta = (patName: string, doctor: string, rec: string) => {
    setPrintModalContent({
      title: 'RECETA MÉDICA DIGITAL - MINISTERIO DE SALUD',
      content: `Paciente: ${patName}\n\nPrescripción: ${rec}\n\nFirma Digital: ${doctor}\nMatrícula Nacional: M.N. 125.431\nFecha Emisión: ${new Date().toLocaleDateString()}`
    });
  };

  const handlePrintResumenHC = (pat: Patient) => {
    const historyText = pat.history.map(h => 
      `Fecha: ${h.date} - Tipo: ${h.type}\nDoctor: ${h.doctor}\nDiag: ${h.diagnosis}\nInd: ${h.indications}\nEstudios: ${h.studiesRequested}`
    ).join('\n\n');

    setPrintModalContent({
      title: `RESUMEN HISTORIA CLÍNICA - ${pat.name.toUpperCase()}`,
      content: `Paciente: ${pat.name} (Edad: ${pat.age})\nGrupo Sanguíneo: ${pat.bloodType}\nAlergias: ${pat.allergies}\n\nAntecedentes Personales:\n${pat.personalHistory}\n\nEvoluciones Clínicas:\n${historyText || 'Sin evoluciones registradas.'}`
    });
  };

  // FASE 3: Captura simulada de constantes vitales IoT
  const handleMeasureVitals = () => {
    setIsMeasuringVitals(true);
    setTimeout(() => {
      const nextHr = Math.floor(65 + Math.random() * 30);
      const syst = Math.floor(115 + Math.random() * 20);
      const diast = Math.floor(75 + Math.random() * 12);
      const nextO2 = Math.floor(96 + Math.random() * 4);
      const nextTemp = Number((36.2 + Math.random() * 0.9).toFixed(1));
      
      setVitalsHr(nextHr);
      setVitalsBp(`${syst}/${diast}`);
      setVitalsO2(nextO2);
      setVitalsTemp(nextTemp);
      setIsMeasuringVitals(false);
      
      addAuditLog({
        user: selectedAppt?.doctorName || 'Médico Central',
        action: 'Capturar Constantes Vitales',
        details: `Monitoreo IoT completado. FC: ${nextHr}lpm, PA: ${syst}/${diast}mmHg, SatO2: ${nextO2}%, Temp: ${nextTemp}°C.`
      });
    }, 1200);
  };

  const handleExportReport = () => {
    const reportText = appointments.map(a => 
      `${a.time}hs - Paciente: ${a.patientName} | Dr: ${a.doctorName} | Copago: $${a.copayAmount}`
    ).join('\n');
    
    setPrintModalContent({
      title: 'REPORTE DIARIO DE PACIENTES ATENDIDOS',
      content: reportText
    });
    setFeedback({ type: 'success', message: 'Reporte diario generado correctamente.' });
  };

  const activePatient = patients.find(p => p.id === selectedAppt?.patientId);

  // Filtrado de Turnos
  const filteredAppointments = useMemo(() => appointments.filter(appt => {
    const matchSearch = appt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        appt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        appt.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || appt.status === statusFilter;
    const matchDoctor = doctorFilter === 'all' || appt.doctorName === doctorFilter;
    const matchSpecialty = specialtyFilter === 'all' || appt.specialty === specialtyFilter;
    const matchDate = !dateFilter || appt.date === dateFilter;

    return matchSearch && matchStatus && matchDoctor && matchSpecialty && matchDate;
  }), [appointments, dateFilter, doctorFilter, searchTerm, specialtyFilter, statusFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-rose-500 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">Consola de Salud e Historia Clínica Electrónica</h1>
            <p className="text-slate-400 text-xs mt-0.5">SaaS ERP de Gestión de Guardia, Sala de Espera y Evolución Clínica.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button
            onClick={handleExportReport}
            className="flex-1 lg:flex-none px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Reporte Diario
          </button>
          <button
            onClick={() => setIsAddPatientOpen(true)}
            className="flex-1 lg:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Ingresar Paciente
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-semibold ${
          feedback.type === 'success'
            ? 'border-emerald-500/25 bg-emerald-950/20 text-emerald-300'
            : 'border-rose-500/25 bg-rose-950/20 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-950 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Métricas Rápidas & Indicadores de Productividad */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Pacientes del Día</span>
          <span className="text-xl font-black text-white mt-1 block">{appointments.length}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Sala de Espera</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block flex items-center gap-1.5">
            {appointments.filter(a => a.status === 'waiting').length}
            <span className="text-[10px] text-slate-500 font-normal">(18m demora)</span>
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Recetas Despachadas</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">
            {patients.reduce((acc, curr) => acc + curr.history.filter(h => h.prescriptionStatus === 'delivered').length, 0)}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Copagos del Día</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">
            ${appointments.reduce((acc, curr) => acc + curr.copayAmount, 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Urgencias / Riesgo</span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {appointments.filter(a => a.priority === 'high_risk' || a.priority === 'urgent').length}
          </span>
        </div>
      </div>

      {/* Alertas Críticas (Alergias) */}
      {patients.some(p => p.allergies !== 'Ninguna' && p.allergies !== '') && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
            <AlertOctagon className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>Alerta de Alergias del Paciente Activo: <strong>{activePatient?.allergies || 'Ninguna'}</strong></span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros Avanzados */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Paciente / Falla</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
            />
            <Search className="h-3.5 w-3.5 text-slate-600 absolute left-2.5 top-3" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Estado del Turno</label>
          <select
            value={statusFilter}
            onChange={e => {
              const value = e.target.value;
              if (value === 'all' || isAppointmentStatus(value)) {
                setStatusFilter(value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="waiting">Sala de Espera</option>
            <option value="in_consultation">En Consulta</option>
            <option value="completed">Atendido</option>
            <option value="absent">Ausente</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Médico Tratante</label>
          <select
            value={doctorFilter}
            onChange={e => setDoctorFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Médicos</option>
            <option value="Dr. Carlos Gómez">Dr. Carlos Gómez</option>
            <option value="Dra. Lucía Fernández">Dra. Lucía Fernández</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Especialidad</label>
          <select
            value={specialtyFilter}
            onChange={e => {
              const value = e.target.value;
              if (value === 'all' || isSpecialty(value)) {
                setSpecialtyFilter(value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todas las especialidades</option>
            <option value="Cardiología">Cardiología</option>
            <option value="Clínica General">Clínica General</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Fecha de Guardia</label>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agenda de Turnos */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-rose-500" />
              Turneros Clínicos
            </h3>
            
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850 text-[10px]">
              <button onClick={() => setAgendaTab('day')} className={`px-2 py-1 rounded ${agendaTab === 'day' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}>Hoy</button>
              <button onClick={() => setAgendaTab('week')} className={`px-2 py-1 rounded ${agendaTab === 'week' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}>Semana</button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                No se encontraron turnos con los filtros activos.
              </div>
            ) : (
              filteredAppointments.map(appt => {
                const active = selectedAppt?.id === appt.id;
                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                      active ? 'bg-rose-950/10 border-rose-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-white">{appt.patientName}</span>
                      <span className="text-[10px] font-mono text-slate-550 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {appt.time} hs
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-400">{appt.doctorName} ({appt.specialty})</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        appt.priority === 'high_risk' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' :
                        appt.priority === 'urgent' ? 'bg-amber-500/10 text-amber-450 border border-amber-500/25' :
                        'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}>
                        {appt.priority}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between items-center border-t border-slate-900/60 pt-2.5">
                      <select
                        value={appt.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          if (isAppointmentStatus(e.target.value)) {
                            handleStatusChange(appt.id, e.target.value);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-350 focus:outline-none"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="waiting">Sala de Espera</option>
                        <option value="in_consultation">En Consulta</option>
                        <option value="completed">Atendido</option>
                        <option value="absent">Ausente</option>
                        <option value="cancelled">Cancelado</option>
                      </select>

                      <span className="text-[10px] text-slate-500 font-bold capitalize">{appt.type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel de Historia Clínica Electrónica */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {selectedAppt && activePatient ? (
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-950 border border-rose-500/25 rounded-2xl text-rose-400">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white">{activePatient.name}</h4>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Edad: {activePatient.age} años | Grupo Sanguíneo: {activePatient.bloodType} | Especialidad: {selectedAppt.specialty}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintResumenHC(activePatient)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 font-bold rounded-xl text-[10px] flex items-center gap-1"
                  >
                    <Printer className="h-3.5 w-3.5 text-cyan-400" />
                    Resumen H.C.
                  </button>
                </div>
              </div>

              {/* FASE 3: Constantes Vitales IoT */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                    Monitor de Constantes Vitales (Captura IoT)
                  </span>
                  
                  <button
                    type="button"
                    disabled={isMeasuringVitals}
                    onClick={handleMeasureVitals}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isMeasuringVitals ? 'Midiendo...' : 'Capturar Constantes'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Frec. Cardíaca</span>
                    <span className={`text-lg font-black mt-1 block font-mono ${vitalsHr > 90 || vitalsHr < 60 ? 'text-rose-500' : 'text-slate-200'}`}>
                      {vitalsHr} <span className="text-[10px] font-normal text-slate-500">lpm</span>
                    </span>
                  </div>
                  
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Presión Art.</span>
                    <span className="text-lg font-black text-slate-200 mt-1 block font-mono">
                      {vitalsBp} <span className="text-[10px] font-normal text-slate-500">mmHg</span>
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Saturación O2</span>
                    <span className={`text-lg font-black mt-1 block font-mono ${vitalsO2 < 95 ? 'text-amber-500' : 'text-slate-200'}`}>
                      {vitalsO2}%
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Temperatura</span>
                    <span className={`text-lg font-black mt-1 block font-mono ${vitalsTemp > 37.2 ? 'text-rose-500' : 'text-slate-200'}`}>
                      {vitalsTemp} <span className="text-[10px] font-normal text-slate-500">°C</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Antecedentes Clínicos del Expediente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900">
                  <span className="font-bold text-slate-500 block mb-1">Antecedentes Clínicos / Quirúrgicos</span>
                  <p className="text-slate-350">{activePatient.personalHistory}</p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900">
                  <span className="font-bold text-slate-500 block mb-1">Medicación de Rutina</span>
                  <p className="text-slate-350">{activePatient.currentMeds}</p>
                </div>
              </div>

              {/* Registro de Consulta - Evolución Clínica */}
              {selectedAppt.status === 'in_consultation' ? (
                <form onSubmit={handleSaveEvolucion} className="space-y-4 pt-3 border-t border-slate-900/60">
                  <span className="text-xs font-black text-rose-400 uppercase tracking-wider block">Registrar Evolución de Consulta</span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase block">Diagnóstico Principal</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Cardiopatía isquémica leve"
                        value={newDiagnosis}
                        onChange={e => setNewDiagnosis(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 relative">
                      <label className="text-[9px] text-slate-500 font-bold uppercase block">Receta Médica Digital</label>
                      <input
                        type="text"
                        placeholder="Ej: Losartán 50mg x 30 comp"
                        value={newPrescription}
                        onChange={e => {
                          const val = e.target.value;
                          setNewPrescription(val);
                          if (val.trim().length > 1) {
                            const filtered = VADEMECUM.filter(item => 
                              item.drug.toLowerCase().includes(val.toLowerCase())
                            );
                            setDrugSuggestions(filtered);
                          } else {
                            setDrugSuggestions([]);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none"
                      />
                      
                      {drugSuggestions.length > 0 && (
                        <div className="absolute z-20 bg-slate-950 border border-slate-800 rounded-xl mt-1 w-full max-h-40 overflow-y-auto p-1.5 space-y-1 shadow-2xl">
                          {drugSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setNewPrescription(item.drug);
                                setNewIndications(item.indications);
                                setDrugSuggestions([]);
                              }}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-350 hover:bg-slate-900 rounded-lg flex justify-between items-center cursor-pointer"
                            >
                              <span>{item.drug}</span>
                              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{item.category.slice(0, 12)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase block">Indicaciones al Paciente</label>
                      <input
                        type="text"
                        placeholder="Ej: Tomar 1 por la mañana en ayunas"
                        value={newIndications}
                        onChange={e => setNewIndications(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase block">Estudios Solicitados</label>
                      <input
                        type="text"
                        placeholder="Ej: Ecocardiograma doppler color"
                        value={newStudies}
                        onChange={e => setNewStudies(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <div className="flex-1 flex gap-2">
                      <select
                        value={newType}
                        onChange={e => {
                          if (isVisitType(e.target.value)) {
                            setNewType(e.target.value);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                      >
                        <option value="control">Tipo: Control Clínico</option>
                        <option value="first_time">Tipo: Primera Consulta</option>
                        <option value="urgency">Tipo: Urgencia</option>
                        <option value="teleconsultation">Tipo: Teleconsulta</option>
                      </select>

                      <select
                        value={nextControl}
                        onChange={e => setNextControl(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                      >
                        <option value="15 días">Control: 15 días</option>
                        <option value="30 días">Control: 30 días</option>
                        <option value="90 días">Control: 90 días</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Registrar Evolución & Finalizar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5 bg-slate-955/30 border border-slate-850 rounded-2xl text-center py-6">
                  <Activity className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    Cambie el estado del paciente a <strong className="text-amber-400">"En Consulta"</strong> en el turnero para iniciar la carga de evolución médica y recetas digitales.
                  </p>
                </div>
              )}

              {/* Timeline de Evolución Histórica */}
              <div className="space-y-4 pt-4 border-t border-slate-900/60">
                <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Timeline de Evoluciones Clínicas</span>
                
                <div className="space-y-3.5">
                  {activePatient.history.length === 0 ? (
                    <span className="text-xs text-slate-550 block italic">Sin evoluciones previas registradas.</span>
                  ) : (
                    activePatient.history.map((hist, i) => (
                      <div key={i} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-900 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-white">{hist.diagnosis}</span>
                          <span className="text-[10px] text-slate-550">{hist.date} | {hist.doctor}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">"Ind: {hist.indications}"</p>
                        
                        {hist.prescriptions && (
                          <div className="flex items-center justify-between border-t border-slate-900/80 pt-2 mt-1.5">
                            <span className="text-[10px] text-cyan-400 font-semibold">RP: {hist.prescriptions}</span>
                            <div className="flex gap-2">
                              <select
                                value={hist.prescriptionStatus}
                                onChange={e => {
                                  if (isPrescriptionStatus(e.target.value)) {
                                    handleUpdatePrescriptionStatus(activePatient.id, i, e.target.value);
                                  }
                                }}
                                className="bg-slate-900 border border-slate-850 text-[9px] rounded px-1.5 py-0.5 text-slate-400"
                              >
                                <option value="pending">Pendiente</option>
                                <option value="emitted">Emitida</option>
                                <option value="delivered">Entregada</option>
                              </select>
                              <button
                                onClick={() => handlePrintReceta(activePatient.name, hist.doctor, hist.prescriptions)}
                                className="p-1 bg-slate-900 hover:bg-slate-850 rounded border border-slate-850 text-slate-400"
                              >
                                <Printer className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/40 p-10 rounded-3xl border border-slate-850 text-center text-slate-600 text-xs italic my-auto">
              Selecciona un paciente o consulta activa de la agenda de guardia para iniciar.
            </div>
          )}

          {/* Actividad Reciente & Auditoría de Operaciones */}
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-850 space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider block border-b border-slate-900 pb-3">
              Auditoría & Bitácora de Operaciones (Firma Médica)
            </h3>
            
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {auditLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-900 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[11px] font-black text-slate-350 block">{log.action}</span>
                    <span className="text-[10px] text-slate-500">{log.details}</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono shrink-0">{log.timestamp} | {log.user}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Modal Visualizador/Impresión */}
      {printModalContent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-900 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">{printModalContent.title}</h4>
              <button onClick={() => setPrintModalContent(null)} className="text-slate-400 hover:text-slate-600">
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
                  setFeedback({ type: 'success', message: 'Comprobante médico enviado a impresión.' });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1"
              >
                <Printer className="h-4 w-4" />
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Paciente */}
      {isAddPatientOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black mb-4 text-white">Ingresar Nuevo Paciente</h2>
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre Completo del Paciente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clara Vignolo"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Edad</label>
                  <input
                    type="number"
                    required
                    value={patientAge}
                    onChange={e => setPatientAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Grupo Sanguíneo</label>
                  <select
                    value={patientBlood}
                    onChange={e => setPatientBlood(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Prioridad Clínica</label>
                  <select
                    value={patientPriority}
                    onChange={e => {
                      if (isPriority(e.target.value)) {
                        setPatientPriority(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="control">Control de rutina</option>
                    <option value="urgent">Urgente</option>
                    <option value="high_risk">Riesgo Alto</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Alergias Críticas</label>
                  <input
                    type="text"
                    placeholder="Ej: Penicilina"
                    value={patientAllergies}
                    onChange={e => setPatientAllergies(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPatientOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs"
                >
                  Registrar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
