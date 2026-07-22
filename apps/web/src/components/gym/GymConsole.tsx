"use client";

import React, { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Users,
  Activity,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GraduationCap,
  ListFilter,
  RotateCw,
  Plus,
  Heart,
  UserCheck,
  DollarSign,
} from "lucide-react";

type PlanType = "Mensual" | "Trimestral" | "Anual" | "Pase Diario";
type MemberStatus = "active" | "expired" | "unpaid" | "suspended";
type Feedback = { type: "success" | "error"; message: string } | null;

const MEMBER_STATUSES: MemberStatus[] = [
  "active",
  "expired",
  "unpaid",
  "suspended",
];
const PLAN_TYPES: PlanType[] = [
  "Mensual",
  "Trimestral",
  "Anual",
  "Pase Diario",
];

function isMemberStatus(value: string): value is MemberStatus {
  return MEMBER_STATUSES.includes(value as MemberStatus);
}

function isPlanType(value: string): value is PlanType {
  return PLAN_TYPES.includes(value as PlanType);
}

interface GymMember {
  dni: string;
  name: string;
  planName: string;
  planType: PlanType;
  expirationDate: string;
  status: MemberStatus;
  lastAccess: string;
  hasMedicalCertificate: boolean;
  medicalCertExpiration: string;
  assignedTrainer: string;
  routineNotes: string;
  weeklyFrequencyRate: number; // e.g. 3.2 (veces por semana)
}

interface GymClass {
  id: string;
  name: string;
  time: string;
  spotsMax: number;
  spotsTaken: number;
  trainer: string;
  waitingList: string[]; // List of names waiting
}

const MEMBERS_DATABASE: GymMember[] = [
  {
    dni: "35123456",
    name: "Horacio Quiroga",
    planName: "Pase Libre",
    planType: "Mensual",
    expirationDate: "2026-07-28",
    status: "active",
    lastAccess: "Ayer 18:30 hs",
    hasMedicalCertificate: true,
    medicalCertExpiration: "2026-12-15",
    assignedTrainer: "Prof. Walter",
    routineNotes: "Hipertrofia - Pecho y Bíceps. 4x12.",
    weeklyFrequencyRate: 3.8,
  },
  {
    dni: "40987654",
    name: "Clara Vignolo",
    planName: "Musculación 3x",
    planType: "Trimestral",
    expirationDate: "2026-07-01",
    status: "expired",
    lastAccess: "Hace 4 días",
    hasMedicalCertificate: false,
    medicalCertExpiration: "2026-05-10",
    assignedTrainer: "Prof. Walter",
    routineNotes: "Resistencia cardiovascular y tonificación.",
    weeklyFrequencyRate: 2.1,
  },
  {
    dni: "38111222",
    name: "Marcos Juárez",
    planName: "Crossfit Diarios",
    planType: "Mensual",
    expirationDate: "2026-07-15",
    status: "unpaid",
    lastAccess: "Hace 2 semanas",
    hasMedicalCertificate: true,
    medicalCertExpiration: "2026-08-30",
    assignedTrainer: "Prof. Ana",
    routineNotes: "Fuerza explosiva, WOD de 20 min.",
    weeklyFrequencyRate: 1.5,
  },
];

const INITIAL_CLASSES: GymClass[] = [
  {
    id: "c1",
    name: "Spinning PRO",
    time: "08:00",
    spotsMax: 20,
    spotsTaken: 18,
    trainer: "Prof. Ana",
    waitingList: [],
  },
  {
    id: "c2",
    name: "Yoga Flexibilidad",
    time: "09:30",
    spotsMax: 15,
    spotsTaken: 15,
    trainer: "Prof. Walter",
    waitingList: ["Sofía Martínez"],
  },
  {
    id: "c3",
    name: "Zumba Ritmos",
    time: "19:00",
    spotsMax: 30,
    spotsTaken: 12,
    trainer: "Prof. Brenda",
    waitingList: [],
  },
];

export default function GymConsole() {
  const [members, setMembers] = useState<GymMember[]>(MEMBERS_DATABASE);
  const [gymClasses, setGymClasses] = useState<GymClass[]>(INITIAL_CLASSES);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [planFilter, setPlanFilter] = useState<"all" | PlanType>("all");

  const [searchDni, setSearchDni] = useState("");
  const [scannedMember, setScannedMember] = useState<GymMember | null>(
    MEMBERS_DATABASE[0],
  );
  const [accessLog, setAccessLog] = useState<
    Array<{ name: string; time: string; allowed: boolean; reason?: string }>
  >([{ name: "Horacio Quiroga", time: "18:30 hs", allowed: true }]);

  // FASE 3: Constructor de Rutinas Gym
  const [routineMuscle, setRoutineMuscle] = useState("Pecho");
  const [routineExercise, setRoutineExercise] = useState("Press de Banca");
  const [routineSets, setRoutineSets] = useState(4);
  const [routineReps, setRoutineReps] = useState(12);

  const handleScanAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDni) return;

    const member = members.find((m) => m.dni === searchDni);
    if (member) {
      setScannedMember(member);
      let isAllowed = member.status === "active";
      let reason = "";
      if (!isAllowed) {
        reason =
          member.status === "expired" ? "Cuota Expirada" : "Falta de Pago";
      } else if (!member.hasMedicalCertificate) {
        isAllowed = false;
        reason = "Apto Médico Vencido";
      }

      setAccessLog((prev) => [
        {
          name: member.name,
          time: new Date().toLocaleTimeString().slice(0, 5) + " hs",
          allowed: isAllowed,
          reason,
        },
        ...prev,
      ]);
    } else {
      setScannedMember({
        dni: searchDni,
        name: "Socio Desconocido",
        planName: "Ninguno",
        planType: "Pase Diario",
        expirationDate: "N/A",
        status: "unpaid",
        lastAccess: "Nunca",
        hasMedicalCertificate: false,
        medicalCertExpiration: "N/A",
        assignedTrainer: "Ninguno",
        routineNotes: "",
        weeklyFrequencyRate: 0,
      });
      setAccessLog((prev) => [
        {
          name: `DNI ${searchDni}`,
          time: new Date().toLocaleTimeString().slice(0, 5) + " hs",
          allowed: false,
          reason: "No Registrado",
        },
        ...prev,
      ]);
    }
    setSearchDni("");
  };

  const handleBookClass = (classId: string) => {
    setGymClasses((prev) =>
      prev.map((c) => {
        if (c.id === classId) {
          const isFull = c.spotsTaken >= c.spotsMax;
          if (isFull) {
            setFeedback({
              type: "success",
              message: `Clase completa. Agregado a lista de espera para ${c.name}.`,
            });
            return {
              ...c,
              waitingList: [
                ...c.waitingList,
                scannedMember?.name || "Invitado",
              ],
            };
          } else {
            setFeedback({
              type: "success",
              message: `Reserva confirmada para la clase de ${c.name}.`,
            });
            return { ...c, spotsTaken: c.spotsTaken + 1 };
          }
        }
        return c;
      }),
    );
  };

  const handlePayFee = (memberDni: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.dni === memberDni) {
          const updated: GymMember = {
            ...m,
            status: "active",
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          };
          if (scannedMember && scannedMember.dni === memberDni) {
            setScannedMember(updated);
          }
          return updated;
        }
        return m;
      }),
    );
    setFeedback({
      type: "success",
      message: "Pago de membresía procesado. Plan renovado por 30 días.",
    });
  };

  const handleRenewMedicalCert = (memberDni: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.dni === memberDni) {
          const updated: GymMember = {
            ...m,
            hasMedicalCertificate: true,
            medicalCertExpiration: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .split("T")[0],
          };
          if (scannedMember && scannedMember.dni === memberDni) {
            setScannedMember(updated);
          }
          return updated;
        }
        return m;
      }),
    );
    setFeedback({
      type: "success",
      message: "Apto médico renovado por 1 año.",
    });
  };

  // FASE 3: Asignar rutina personalizada
  const handleAssignRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedMember) return;

    const newRoutineText = `${routineMuscle} - ${routineExercise}. ${routineSets}x${routineReps}.`;

    setMembers((prev) =>
      prev.map((m) => {
        if (m.dni === scannedMember.dni) {
          const updated = { ...m, routineNotes: newRoutineText };
          setScannedMember(updated);
          return updated;
        }
        return m;
      }),
    );

    setFeedback({
      type: "success",
      message: `Rutina de ${routineMuscle} asignada con éxito a ${scannedMember.name}.`,
    });
  };

  // Filtrado de socios
  const filteredMembers = useMemo(
    () =>
      members.filter((m) => {
        const matchSearch =
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.dni.includes(searchTerm);
        const matchStatus = statusFilter === "all" || m.status === statusFilter;
        const matchPlan = planFilter === "all" || m.planType === planFilter;
        return matchSearch && matchStatus && matchPlan;
      }),
    [members, planFilter, searchTerm, statusFilter],
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-rose-500 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">
              Consola de Control de Accesos & Clases
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Validación de molinetes en tiempo real, aptos médicos y listas de
              espera de actividades.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-500/25 bg-emerald-950/20 text-emerald-300"
              : "border-rose-500/25 bg-rose-950/20 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-950 hover:text-white"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Socios Activos
          </span>
          <span className="text-xl font-black text-white mt-1 block">
            {members.filter((m) => m.status === "active").length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Accesos de Hoy
          </span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {accessLog.length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Morosos / Vencidos
          </span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {
              members.filter(
                (m) => m.status === "unpaid" || m.status === "expired",
              ).length
            }
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Faltan Aptos Médicos
          </span>
          <span className="text-xl font-black text-amber-500 mt-1 block">
            {members.filter((m) => !m.hasMedicalCertificate).length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Asistencia Clases
          </span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            {gymClasses.reduce((acc, curr) => acc + curr.spotsTaken, 0)} alumnos
          </span>
        </div>
      </div>

      {/* Alertas Sanitarias (Apto Médico Vencido) */}
      {members.some((m) => !m.hasMedicalCertificate) && (
        <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-350 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-550 animate-pulse" />
            <span>
              Alerta Médica: Existen socios activos sin el apto médico vigente
              presentado en secretaría.
            </span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros de Socios */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Buscar Socio por DNI o Nombre
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none"
            />
            <Search className="h-3.5 w-3.5 text-slate-650 absolute left-2.5 top-3" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Estado Socio
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all" || isMemberStatus(value)) {
                setStatusFilter(value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="expired">Cuota Expirada</option>
            <option value="unpaid">Moroso/Deudor</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Frecuencia / Tipo Plan
          </label>
          <select
            value={planFilter}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all" || isPlanType(value)) {
                setPlanFilter(value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Planes</option>
            <option value="Mensual">Mensual</option>
            <option value="Trimestral">Trimestral</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Molinete & Validación */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col justify-between min-h-[440px]">
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <CreditCard className="h-4.5 w-4.5 text-cyan-400" />
              Simular Molinete Acceso
            </h3>

            <form onSubmit={handleScanAccess} className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">
                Ingresar DNI Socio
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: 35123456"
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Validar
                </button>
              </div>
            </form>

            {/* Visual Gate / Barrier Status Indicator */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex items-center justify-between mt-2">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                Estado del Molinete IoT
              </span>
              {scannedMember &&
              scannedMember.status === "active" &&
              scannedMember.hasMedicalCertificate ? (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[10px] text-emerald-450 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    MOLINETE ABIERTO
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-[10px] text-rose-450 font-bold uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    MOLINETE BLOQUEADO
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Estado de Acceso Visual */}
          {scannedMember ? (
            <div
              className={`p-4 rounded-2xl border text-center space-y-3 mt-4 ${
                scannedMember.status === "active" &&
                scannedMember.hasMedicalCertificate
                  ? "bg-emerald-950/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-950/10 border-rose-500/30 text-rose-455"
              }`}
            >
              <div className="flex justify-center">
                {scannedMember.status === "active" &&
                scannedMember.hasMedicalCertificate ? (
                  <ShieldCheck className="h-12 w-12 text-emerald-400 animate-bounce" />
                ) : (
                  <ShieldAlert className="h-12 w-12 text-rose-500 animate-pulse animate-duration-1000" />
                )}
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-white">
                  {scannedMember.name}
                </h4>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Plan: {scannedMember.planName} ({scannedMember.planType})
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Vto: {scannedMember.expirationDate}
                </span>
                <span className="text-[10px] text-cyan-400 block font-bold mt-1">
                  Frecuencia: {scannedMember.weeklyFrequencyRate} visitas/semana
                </span>

                {!scannedMember.hasMedicalCertificate ? (
                  <span className="text-[9px] text-rose-450 font-bold uppercase block mt-1.5 animate-pulse">
                    ✗ FALTA APTO MÉDICO (Vto:{" "}
                    {scannedMember.medicalCertExpiration})
                  </span>
                ) : (
                  <span className="text-[9px] text-emerald-450 font-bold uppercase block mt-1.5">
                    ✓ Apto Médico Vigente
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {scannedMember.status !== "active" && (
                  <button
                    onClick={() => handlePayFee(scannedMember.dni)}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-[10px] uppercase flex items-center justify-center gap-1"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Pagar Cuota
                  </button>
                )}
                {!scannedMember.hasMedicalCertificate && (
                  <button
                    onClick={() => handleRenewMedicalCert(scannedMember.dni)}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-[10px] uppercase flex items-center justify-center gap-1"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Aprobar Apto
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-10 border border-dashed border-slate-850 rounded-2xl text-center text-xs text-slate-650 italic">
              Esperando lectura de credencial o DNI.
            </div>
          )}
        </div>

        {/* Panel de Clases y Rutinas */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Rutina del Socio Seleccionado */}
          {scannedMember && scannedMember.name !== "Socio Desconocido" && (
            <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-850 space-y-3 animate-fade-in">
              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-2xl flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-400" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      Evaluación antropométrica
                    </span>
                    <span className="text-[10px] text-slate-400">
                      No hay una medición validada para este socio. Registrá
                      fecha, profesional y dispositivo antes de emitir
                      resultados.
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded-lg border border-rose-500/20 uppercase">
                  Sin evaluación
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-xs font-bold text-rose-450 uppercase tracking-wider block flex items-center gap-1.5">
                  <GraduationCap className="h-4.5 w-4.5" />
                  Planificación & Rutina Activa (Entrenador:{" "}
                  {scannedMember.assignedTrainer})
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">
                  Rutina Diaria
                </span>
                <p className="text-xs text-slate-300 italic mt-1">
                  "{scannedMember.routineNotes}"
                </p>
              </div>

              {/* Constructor de Rutinas Integrado */}
              <form
                onSubmit={handleAssignRoutine}
                className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl space-y-3"
              >
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Modificar Rutina de Entrenamiento
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-550 block font-bold uppercase">
                      Grupo Muscular
                    </label>
                    <select
                      value={routineMuscle}
                      onChange={(e) => setRoutineMuscle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white focus:outline-none"
                    >
                      <option value="Pecho">Pecho</option>
                      <option value="Espalda">Espalda</option>
                      <option value="Piernas">Piernas</option>
                      <option value="Hombros">Hombros</option>
                      <option value="Bíceps/Tríceps">Bíceps/Tríceps</option>
                      <option value="Cardio">Cardio / WOD</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-550 block font-bold uppercase">
                      Ejercicio
                    </label>
                    <input
                      type="text"
                      value={routineExercise}
                      onChange={(e) => setRoutineExercise(e.target.value)}
                      placeholder="Ej: Sentadillas"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-550 block font-bold uppercase">
                      Series
                    </label>
                    <input
                      type="number"
                      value={routineSets}
                      onChange={(e) => setRoutineSets(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-550 block font-bold uppercase">
                      Repeticiones
                    </label>
                    <input
                      type="number"
                      value={routineReps}
                      onChange={(e) => setRoutineReps(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Asignar Rutina
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grilla de Clases con Lista de Espera */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <Activity className="h-4.5 w-4.5 text-cyan-400" />
              Grilla de Clases & Reservas Grupales
            </h3>

            <div className="space-y-3">
              {gymClasses.map((c) => {
                const full = c.spotsTaken >= c.spotsMax;
                return (
                  <div
                    key={c.id}
                    className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
                  >
                    <div className="space-y-1">
                      <span className="font-extrabold text-xs text-white block">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-semibold">
                        Horario: {c.time} hs | Instructor: {c.trainer}
                      </span>

                      {c.waitingList.length > 0 && (
                        <span className="text-[9px] text-amber-500 block">
                          Lista de Espera: {c.waitingList.join(", ")}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 items-center w-full md:w-auto border-t md:border-t-0 border-slate-900 pt-3 md:pt-0 justify-between">
                      <div className="text-left md:text-right shrink-0">
                        <span className="text-[9px] text-slate-550 uppercase block font-bold">
                          Cupos
                        </span>
                        <span className="font-black text-cyan-400 text-xs">
                          {c.spotsTaken} / {c.spotsMax}
                        </span>
                      </div>

                      <button
                        onClick={() => handleBookClass(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                          full
                            ? "bg-amber-600 hover:bg-amber-500 text-slate-950 animate-pulse"
                            : "bg-cyan-600 hover:bg-cyan-500 text-slate-950"
                        }`}
                      >
                        {full ? "Lista Espera" : "Reservar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
