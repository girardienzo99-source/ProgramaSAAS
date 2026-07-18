'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User, Heart, Shield, PlusCircle, 
  Check, X, FileText, Activity, AlertTriangle, ShieldCheck, RefreshCw 
} from 'lucide-react';

// Mock de profesionales
const PROFESSIONALS = ['Dra. Julia R. (Pediatra)', 'Dr. Mario V. (Odontólogo)', 'Esteticista Sofía L.'];

// Mock de turnos iniciales
const INITIAL_APPOINTMENTS = [
  { id: 'ap1', time: '09:00', client: 'Carlos Perez', phone: '11-4567-8901', professional: PROFESSIONALS[0], service: 'Consulta Control Anual', status: 'scheduled', recordNotes: 'Paciente sano. Control de peso e inmunización de calendario.' },
  { id: 'ap2', time: '10:30', client: 'Marta Gomez', phone: '11-9876-5432', professional: PROFESSIONALS[1], service: 'Limpieza Dental Completa', status: 'completed', recordNotes: 'Se realiza tartrectomía y profilaxis. Sin presencia de caries activas. Próximo control en 6 meses.' },
  { id: 'ap3', time: '13:00', client: 'Estefanía Solis', phone: '11-3322-1100', professional: PROFESSIONALS[2], service: 'Tratamiento Facial Anti-Age', status: 'scheduled', recordNotes: 'Primera sesión de microdermoabrasión con punta de diamante.' },
  { id: 'ap4', time: '15:30', client: 'Lucas Diaz', phone: '11-7788-9900', professional: PROFESSIONALS[0], service: 'Consulta de Guardia / Fiebre', status: 'cancelled', recordNotes: 'El paciente cancela debido a remisión de síntomas.' }
];

export default function AgendaConsole() {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Formulario nuevo turno
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newProf, setNewProf] = useState(PROFESSIONALS[0]);
  const [newService, setNewService] = useState('Consulta General');
  const [newTime, setNewTime] = useState('09:00');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Agregar turno
  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    const newAppointment = {
      id: `ap-${Date.now()}`,
      time: newTime,
      client: newClient,
      phone: newPhone,
      professional: newProf,
      service: newService,
      status: 'scheduled',
      recordNotes: ''
    };

    setAppointments([...appointments, newAppointment].sort((a, b) => a.time.localeCompare(b.time)));
    setIsAddModalOpen(false);
    
    // Resetear formulario
    setNewClient('');
    setNewPhone('');
  };

  // Completar turno y guardar ficha
  const handleCompleteAppointment = (id: string, notes: string) => {
    setAppointments(prev => prev.map(ap => {
      if (ap.id === id) {
        return { ...ap, status: 'completed', recordNotes: notes };
      }
      return ap;
    }));
    alert('Consulta guardada con éxito en la historia clínica del paciente.');
    setSelectedApp(null);
  };

  // Cancelar turno
  const handleCancelAppointment = (id: string) => {
    setAppointments(prev => prev.map(ap => {
      if (ap.id === id) {
        return { ...ap, status: 'cancelled' };
      }
      return ap;
    }));
    setSelectedApp(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl shadow-lg">
              <CalendarIcon className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Módulo Agenda de Turnos e Historia Clínica
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Planificación médica/estética, agenda por profesionales, fichas de pacientes y registro de anamnesis clínico.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition-all duration-200"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Programar Turno
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agenda Horaria del Día */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850">
            Agenda del Día (Turnos Activos)
          </h3>

          <div className="space-y-3">
            {appointments.map(ap => {
              const isCompleted = ap.status === 'completed';
              const isCancelled = ap.status === 'cancelled';
              return (
                <button
                  key={ap.id}
                  onClick={() => setSelectedApp(ap)}
                  className={`w-full p-4 rounded-xl border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:scale-[1.005] ${
                    isCompleted 
                      ? 'bg-emerald-950/10 border-emerald-900/35 hover:border-emerald-500/50' 
                      : isCancelled 
                      ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-500/30' 
                      : 'bg-slate-950/40 border-slate-800 hover:border-cyan-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center min-w-[64px]">
                      <Clock className="h-3.5 w-3.5 text-cyan-400 mx-auto mb-1" />
                      <span className="font-mono text-xs font-bold text-white">{ap.time} hs</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{ap.client}</h4>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {ap.service} | <strong>{ap.professional}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      isCompleted ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : isCancelled ? 'bg-rose-500/10 text-red-400 border border-rose-500/20' : 'bg-cyan-500/10 text-cyan-450 border border-cyan-500/20'
                    }`}>
                      {ap.status === 'completed' ? 'Completado' : ap.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de Ficha de Historia Clínica */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          {selectedApp ? (
            <div className="flex flex-col justify-between h-full gap-5">
              
              {/* Header Ficha */}
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                  <div>
                    <h3 className="font-extrabold text-base text-white">Historia Clínica / Ficha</h3>
                    <span className="text-[10px] text-slate-550 block mt-0.5">
                      Paciente: <strong>{selectedApp.client}</strong>
                    </span>
                  </div>
                  <button onClick={() => setSelectedApp(null)} className="text-slate-500 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Detalles Turno */}
                <div className="py-4 border-b border-slate-850 space-y-2 text-xs">
                  <p className="text-slate-450"><strong>Servicio:</strong> {selectedApp.service}</p>
                  <p className="text-slate-450"><strong>Profesional a cargo:</strong> {selectedApp.professional}</p>
                  <p className="text-slate-450"><strong>Teléfono:</strong> {selectedApp.phone}</p>
                </div>

                {/* Registro Médico / Notas Historia Clínica */}
                <div className="py-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <FileText className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Notas de Anamnesis / Procedimiento</span>
                  </div>

                  {selectedApp.status === 'completed' ? (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 text-xs text-slate-400 leading-relaxed font-mono">
                      {selectedApp.recordNotes}
                    </div>
                  ) : (
                    <textarea
                      defaultValue={selectedApp.recordNotes}
                      id="clinical-notes-input"
                      placeholder="Escribí los detalles clínicos de la consulta, síntomas, medicamentos recetados o diagnóstico aquí..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                      rows={6}
                    />
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-3">
                {selectedApp.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => {
                        const notes = (document.getElementById('clinical-notes-input') as HTMLTextAreaElement).value;
                        handleCompleteAppointment(selectedApp.id, notes);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Completar y Guardar Ficha
                    </button>
                    <button
                      onClick={() => handleCancelAppointment(selectedApp.id)}
                      className="w-full py-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/20 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancelar Turno
                    </button>
                  </>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-32 text-slate-650 text-xs my-auto">
              <Heart className="h-10 w-10 mx-auto mb-2 text-slate-750" />
              Seleccioná un turno programado de la agenda para revisar el historial del paciente, registrar la consulta o modificar su estado.
            </div>
          )}
        </div>

      </div>

      {/* Modal Programar Turno */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">Programar Nuevo Turno</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del Cliente / Paciente</label>
                <input
                  type="text"
                  required
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Marcelo Araujo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                    placeholder="11-XXXX-XXXX"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hora del Turno</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Profesional</label>
                <select
                  value={newProf}
                  onChange={(e) => setNewProf(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-slate-350 text-xs focus:outline-none"
                >
                  {PROFESSIONALS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tratamiento / Servicio</label>
                <input
                  type="text"
                  required
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Odontopediatría / Facial"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold rounded-xl text-xs"
              >
                Confirmar Turno
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
