"use client";

import React, { useMemo, useState } from "react";
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Search,
  Printer,
  X,
  CreditCard,
} from "lucide-react";

type CourseName = "Desarrollo Full Stack React" | "Diseño UX/UI Avanzado";
type PaymentStatus = "paid" | "pending" | "arrears" | "scholarship";
type CourseFilter = CourseName | "all";
type PaymentStatusFilter = PaymentStatus | "all";
type Feedback = { tone: "success" | "warning" | "error"; message: string };

interface CourseInfo {
  teacher: string;
  classroom: string;
  label: string;
}

interface Student {
  id: string;
  name: string;
  tutorName: string;
  tutorPhone: string;
  course: CourseName;
  teacher: string;
  classroom: string;
  monthlyFee: number;
  paymentStatus: PaymentStatus;
  attendanceRate: number; // e.g. 88%
  grades: string[]; // e.g. ['9', '8', '10']
  observations: string;
  scholarshipPercent: number; // e.g. 50
  paymentHistory: Array<{ date: string; amount: number; invoiceNum: string }>;
}

const COURSE_INFO: Record<CourseName, CourseInfo> = {
  "Desarrollo Full Stack React": {
    teacher: "Prof. Walter",
    classroom: "Aula 102 (Lab Informática)",
    label: "React Full Stack",
  },
  "Diseño UX/UI Avanzado": {
    teacher: "Dra. María Celeste",
    classroom: "Aula 104 (Lab Multimedial)",
    label: "Diseño UX/UI",
  },
};

const COURSES = Object.keys(COURSE_INFO) as CourseName[];
const COURSE_FILTERS: Array<{ label: string; value: CourseFilter }> = [
  { label: "Todas las Comisiones", value: "all" },
  ...COURSES.map((course) => ({
    label: COURSE_INFO[course].label,
    value: course,
  })),
];

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  arrears: "En mora",
  scholarship: "Beca",
};

const PAYMENT_STATUS_FILTERS: Array<{
  label: string;
  value: PaymentStatusFilter;
}> = [
  { label: "Todos los Estados", value: "all" },
  ...Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
    value: value as PaymentStatus,
    label,
  })),
];

const isCourseFilter = (value: string): value is CourseFilter =>
  COURSE_FILTERS.some((option) => option.value === value);

const isCourseName = (value: string): value is CourseName =>
  COURSES.includes(value as CourseName);

const isPaymentStatusFilter = (value: string): value is PaymentStatusFilter =>
  PAYMENT_STATUS_FILTERS.some((option) => option.value === value);

const todayISO = () => new Date().toISOString().split("T")[0];

const INITIAL_STUDENTS: Student[] = [
  {
    id: "s1",
    name: "Horacio Quiroga",
    tutorName: "Self",
    tutorPhone: "11-5841-2532",
    course: "Desarrollo Full Stack React",
    teacher: "Prof. Walter",
    classroom: "Aula 102 (Lab Informática)",
    monthlyFee: 45000,
    paymentStatus: "paid",
    attendanceRate: 94,
    grades: ["9", "10", "9"],
    observations: "Excelente desempeño y participación en proyectos.",
    scholarshipPercent: 0,
    paymentHistory: [
      { date: "2026-07-02", amount: 45000, invoiceNum: "FAC-ED-00912" },
    ],
  },
  {
    id: "s2",
    name: "Clara Vignolo",
    tutorName: "Carlos Vignolo",
    tutorPhone: "11-9988-7733",
    course: "Diseño UX/UI Avanzado",
    teacher: "Dra. María Celeste",
    classroom: "Aula 104 (Lab Multimedial)",
    monthlyFee: 38000,
    paymentStatus: "arrears",
    attendanceRate: 72,
    grades: ["6", "5"],
    observations: "Faltas reiteradas en entregas de portfolios.",
    scholarshipPercent: 20,
    paymentHistory: [],
  },
  {
    id: "s3",
    name: "Marcos Juárez",
    tutorName: "Self",
    tutorPhone: "11-5544-3322",
    course: "Desarrollo Full Stack React",
    teacher: "Prof. Walter",
    classroom: "Aula 102 (Lab Informática)",
    monthlyFee: 45000,
    paymentStatus: "pending",
    attendanceRate: 85,
    grades: ["8", "7"],
    observations: "Participativo, debe reforzar entregas prácticas.",
    scholarshipPercent: 0,
    paymentHistory: [],
  },
];

export default function EducationConsole() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    INITIAL_STUDENTS[0],
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");

  // Form inscripción
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTutor, setNewTutor] = useState("");
  const [newTutorPhone, setNewTutorPhone] = useState("");
  const [newCourse, setNewCourse] = useState<CourseName>(
    "Desarrollo Full Stack React",
  );
  const [newFee, setNewFee] = useState(45000);
  const [newScholarship, setNewScholarship] = useState(0);

  // Form Calificaciones & Observación
  const [newGrade, setNewGrade] = useState("");
  const [obsText, setObsText] = useState(
    INITIAL_STUDENTS[0]?.observations ?? "",
  );

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const monthlyFee = Number(newFee);
    const scholarshipPercent = Number(newScholarship);

    if (
      !name ||
      monthlyFee <= 0 ||
      scholarshipPercent < 0 ||
      scholarshipPercent > 100
    ) {
      setFeedback({
        tone: "error",
        message: "Completá alumno, cuota y beca con valores válidos.",
      });
      return;
    }
    const courseInfo = COURSE_INFO[newCourse];

    const newStudent: Student = {
      id: `s-${Date.now()}`,
      name,
      tutorName: newTutor.trim() || "Self",
      tutorPhone: newTutorPhone.trim() || "N/A",
      course: newCourse,
      teacher: courseInfo.teacher,
      classroom: courseInfo.classroom,
      monthlyFee,
      paymentStatus: "pending",
      attendanceRate: 100,
      grades: [],
      observations: "Alumno matriculado recientemente.",
      scholarshipPercent,
      paymentHistory: [],
    };

    setStudents((prev) => [...prev, newStudent]);
    setSelectedStudent(newStudent);
    setObsText(newStudent.observations);
    setIsAddModalOpen(false);
    setNewName("");
    setNewTutor("");
    setNewTutorPhone("");
    setFeedback({
      tone: "success",
      message: `Alumno ${newStudent.name} matriculado con éxito.`,
    });
  };

  const handleCollectFee = () => {
    if (!selectedStudent) return;

    const finalFee =
      selectedStudent.monthlyFee *
      (1 - selectedStudent.scholarshipPercent / 100);

    const updated: Student = {
      ...selectedStudent,
      paymentStatus: "paid",
      paymentHistory: [
        ...selectedStudent.paymentHistory,
        {
          date: todayISO(),
          amount: finalFee,
          invoiceNum: `FAC-ED-${Math.floor(10000 + Math.random() * 90000)}`,
        },
      ],
    };

    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);

    setFeedback({
      tone: "success",
      message: `Cuota cobrada para ${selectedStudent.name}. Total con beca: $${finalFee.toLocaleString()}.`,
    });
  };

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const grade = newGrade.trim();
    if (!selectedStudent || !grade) {
      setFeedback({
        tone: "error",
        message: "Ingresá una calificación válida.",
      });
      return;
    }

    const updated: Student = {
      ...selectedStudent,
      grades: [...selectedStudent.grades, grade],
    };

    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);

    setNewGrade("");
    setFeedback({
      tone: "success",
      message: "Calificación agregada al boletín.",
    });
  };

  const handleSaveObservations = () => {
    if (!selectedStudent) return;

    const updated: Student = {
      ...selectedStudent,
      observations: obsText.trim(),
    };

    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);

    setFeedback({
      tone: "success",
      message: "Observaciones académicas actualizadas.",
    });
  };

  // FASE 3: Registrar presentismo del día
  const handleToggleAttendance = (isPresent: boolean) => {
    if (!selectedStudent) return;

    const currentRate = selectedStudent.attendanceRate;
    let nextRate = isPresent ? currentRate + 2 : currentRate - 3;
    if (nextRate > 100) nextRate = 100;
    if (nextRate < 0) nextRate = 0;

    const updated: Student = { ...selectedStudent, attendanceRate: nextRate };

    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
    setFeedback({
      tone: isPresent ? "success" : "warning",
      message: `Asistencia de hoy registrada: ${isPresent ? "Presente" : "Ausente"} para ${selectedStudent.name}. Nueva tasa: ${nextRate}%.`,
    });
  };

  // FASE 3: Sugerir Reporte de Progreso y Calificación con IA
  const handleGenerateAIReport = () => {
    if (!selectedStudent) return;

    const gradesNum = selectedStudent.grades
      .map(Number)
      .filter((n) => !isNaN(n));
    const average =
      gradesNum.length > 0
        ? gradesNum.reduce((acc, curr) => acc + curr, 0) / gradesNum.length
        : 0;

    let suggestion = "";
    let gradeSuggest = "";

    if (average >= 8) {
      suggestion = `El alumno ${selectedStudent.name} posee un rendimiento sobresaliente (promedio ${average.toFixed(1)}). Demuestra gran interés, entrega sus trabajos a término y tiene una excelente asistencia del ${selectedStudent.attendanceRate}%. Se sugiere promover con distinción de honor.`;
      gradeSuggest = "9 o 10";
    } else if (average >= 6) {
      suggestion = `El alumno ${selectedStudent.name} posee un desempeño regular y cumple con los objetivos mínimos (promedio ${average.toFixed(1)}). Su asistencia es del ${selectedStudent.attendanceRate}%. Se recomienda reforzar las prácticas individuales semanales.`;
      gradeSuggest = "7 o 8";
    } else {
      suggestion = `El alumno ${selectedStudent.name} requiere acompañamiento docente y tutorías (promedio ${average.toFixed(1)}). Con asistencia del ${selectedStudent.attendanceRate}%, está en riesgo de quedar libre o reprobar. Es prioritario citar a reunión académica.`;
      gradeSuggest = "4 o 5";
    }

    setObsText((prev) =>
      prev
        ? `${prev}\n\n[Informe IA ${todayISO()}]: ${suggestion}`
        : `[Informe IA ${todayISO()}]: ${suggestion}`,
    );
    setFeedback({
      tone: "success",
      message: `✓ Informe de Progreso generado por IA. Nota sugerida para el boletín: ${gradeSuggest}.`,
    });
  };

  const handlePrintAcademicReport = (student: Student) => {
    setPrintModalContent({
      title: `BOLETÍN ACADÉMICO OFICIAL`,
      content: `ACADEMIA SASS ERP - BOLETÍN DE CALIFICACIONES\n\nAlumno: ${student.name}\nCurso: ${student.course}\nDocente: ${student.teacher}\nAula Asignada: ${student.classroom}\n\nRegistro de Notas:\n${student.grades.map((g, i) => `- Evaluación ${i + 1}: Nota ${g}`).join("\n") || "- Sin notas registradas."}\n\nPromedio General: ${(student.grades.reduce((a, b) => a + Number(b), 0) / (student.grades.length || 1)).toFixed(2)}\nTasa de Asistencia: ${student.attendanceRate}%\nObservaciones: ${student.observations}\n\nDirección Académica SASS`,
    });
  };

  const handlePrintPaymentReceipt = (student: Student) => {
    const finalFee =
      student.monthlyFee * (1 - student.scholarshipPercent / 100);
    setPrintModalContent({
      title: `RECIBO DE MATRÍCULA Y CUOTA`,
      content: `RECIBO DE ARANCEL ACADÉMICO\n\nAlumno: ${student.name}\nTutor: ${student.tutorName}\nCurso: ${student.course}\n\nCuota Base: $${student.monthlyFee.toLocaleString()}\nDescuento por Beca: ${student.scholarshipPercent}%\nTotal Percibido: $${finalFee.toLocaleString()}\n\nEl presente comprobante acredita el pago de la cuota mensual académica de la institución.\n\nCaja de Administración SASS`,
    });
  };

  const metrics = useMemo(
    () => ({
      activeStudents: students.length,
      paidFees: students.filter((s) => s.paymentStatus === "paid").length,
      arrearsTotal: students
        .filter((s) => s.paymentStatus === "arrears")
        .reduce((acc, curr) => acc + curr.monthlyFee, 0),
      averageAttendance:
        students.length > 0
          ? students.reduce((acc, curr) => acc + curr.attendanceRate, 0) /
            students.length
          : 0,
      attendanceAlerts: students.filter((s) => s.attendanceRate < 75).length,
    }),
    [students],
  );

  // Filtrado de alumnos
  const filteredStudents = useMemo(
    () =>
      students.filter((s) => {
        const matchSearch =
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.tutorName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCourse = courseFilter === "all" || s.course === courseFilter;
        const matchStatus =
          statusFilter === "all" || s.paymentStatus === statusFilter;

        return matchSearch && matchCourse && matchStatus;
      }),
    [students, searchTerm, courseFilter, statusFilter],
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-violet-400 animate-pulse" />
          <div>
            <h1 className="text-xl font-black text-white">
              Consola Escolar & Matrícula de Alumnos
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Control de cuotas mensuales, boletines de calificaciones y alertas
              de asistencia.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Matricular Alumno
        </button>
      </div>

      {/* Métricas Rápidas */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.tone === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              : feedback.tone === "warning"
                ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                : "bg-rose-500/10 border-rose-500/25 text-rose-300"
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {feedback.message}
          </span>
          <button
            onClick={() => setFeedback(null)}
            className="text-current/70 hover:text-current"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Alumnos Activos
          </span>
          <span className="text-xl font-black text-white mt-1 block">
            {metrics.activeStudents}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Cuotas Cobradas
          </span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            {metrics.paidFees}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Mora Académica
          </span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            ${metrics.arrearsTotal.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Asistencia Promedio
          </span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {metrics.averageAttendance.toFixed(0)}%
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Alerta Inasistencias
          </span>
          <span className="text-xl font-black text-rose-455 mt-1 block">
            {metrics.attendanceAlerts}
          </span>
        </div>
      </div>

      {/* Alertas Escolares */}
      {students.some((s) => s.attendanceRate < 75) && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
            <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>
              Alerta Pedagógica: Existen alumnos con inasistencias acumuladas
              superiores al límite permitido (Libre).
            </span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Buscar Alumno / Tutor
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
            Curso / Comisión
          </label>
          <select
            value={courseFilter}
            onChange={(e) => {
              if (isCourseFilter(e.target.value))
                setCourseFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {COURSE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Estado Cuota
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              if (isPaymentStatusFilter(e.target.value))
                setStatusFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {PAYMENT_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alumnado */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <BookOpen className="h-4.5 w-4.5 text-violet-400" />
            Alumnado Registrado
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredStudents.map((s) => {
              const active = selectedStudent?.id === s.id;
              const alarm = s.attendanceRate < 75;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setObsText(s.observations);
                  }}
                  className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                    active
                      ? "bg-violet-950/10 border-violet-500/40 text-white"
                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-xs text-white">
                      {s.name}
                    </span>
                    {alarm && (
                      <span className="text-[8px] bg-rose-500/10 text-rose-450 px-1.5 py-0.5 rounded font-bold uppercase">
                        Libre/Faltas
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {s.course}
                  </span>

                  <div className="mt-3 flex justify-between items-center border-t border-slate-900 pt-2 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        s.paymentStatus === "paid"
                          ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20"
                          : s.paymentStatus === "arrears"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[s.paymentStatus]}
                    </span>
                    <span className="text-slate-500">
                      Asistencia: {s.attendanceRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ficha Académica & Calificaciones */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedStudent ? (
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">
                    {selectedStudent.name}
                  </h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Curso: {selectedStudent.course} | Tutor:{" "}
                    {selectedStudent.tutorName} (${selectedStudent.tutorPhone})
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintAcademicReport(selectedStudent)}
                    className="p-2 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850"
                  >
                    <Printer className="h-3.5 w-3.5 text-violet-400" />
                  </button>
                  <button
                    onClick={() => handlePrintPaymentReceipt(selectedStudent)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 font-bold rounded-xl text-[10px]"
                  >
                    Recibo Cuota
                  </button>
                  {selectedStudent.paymentStatus !== "paid" ? (
                    <button
                      onClick={handleCollectFee}
                      className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-white font-bold rounded-xl text-xs uppercase"
                    >
                      Cobrar Cuota
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold text-[10px] rounded-xl uppercase">
                      Cuenta al día
                    </span>
                  )}
                </div>
              </div>

              {/* Parámetros de Beca & Aula */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-xs space-y-2">
                <span className="text-[10px] text-slate-550 font-bold uppercase block">
                  Datos de Matriculación e Infraestructura
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span>Docente a Cargo</span>
                    <span className="font-bold text-slate-300 block mt-0.5">
                      {selectedStudent.teacher}
                    </span>
                  </div>
                  <div>
                    <span>Aula Asignada</span>
                    <span className="font-bold text-slate-300 block mt-0.5">
                      {selectedStudent.classroom}
                    </span>
                  </div>
                  <div>
                    <span>Descuento Beca</span>
                    <span className="font-bold text-slate-300 block mt-0.5">
                      {selectedStudent.scholarshipPercent}%
                    </span>
                  </div>
                  <div>
                    <span>Asistencia</span>
                    <span
                      className={`font-bold block mt-0.5 ${selectedStudent.attendanceRate < 75 ? "text-rose-500" : "text-emerald-450"}`}
                    >
                      {selectedStudent.attendanceRate}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      Estado del arancel
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Base con beca: $
                      {(
                        selectedStudent.monthlyFee *
                        (1 - selectedStudent.scholarshipPercent / 100)
                      ).toLocaleString()}{" "}
                      | El recargo requiere vencimiento y política de mora
                      configurados.
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/20 uppercase">
                  {selectedStudent.paymentStatus === "arrears"
                    ? "En mora, sin liquidar"
                    : PAYMENT_STATUS_LABELS[selectedStudent.paymentStatus]}
                </span>
              </div>

              {/* FASE 3: Marcador de Presentismo Diario */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center text-xs">
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] text-slate-550 font-bold uppercase block">
                    Asistencia Diaria (Clase de Hoy)
                  </span>
                  <span className="text-slate-500">
                    Registrar presentismo para recalcular el porcentaje
                    académico.
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleAttendance(false)}
                    className="px-3 py-1.5 bg-rose-950/20 border border-rose-500/25 hover:bg-rose-900/10 text-rose-450 font-bold rounded-xl cursor-pointer text-[10px] uppercase"
                  >
                    Ausente
                  </button>
                  <button
                    onClick={() => handleToggleAttendance(true)}
                    className="px-3 py-1.5 bg-emerald-950/20 border border-emerald-500/25 hover:bg-emerald-900/10 text-emerald-450 font-bold rounded-xl cursor-pointer text-[10px] uppercase"
                  >
                    Presente
                  </button>
                </div>
              </div>

              {/* Boletín de Notas */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-violet-400 uppercase block flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Boletín Oficial de Calificaciones
                </span>

                <div className="flex gap-2 items-center flex-wrap pt-1 border-b border-slate-900 pb-3">
                  {selectedStudent.grades.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">
                      No hay calificaciones cargadas aún.
                    </span>
                  ) : (
                    selectedStudent.grades.map((grade, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-900 border border-slate-800 text-white font-bold text-xs px-3 py-1 rounded-xl"
                      >
                        Nota: {grade}
                      </span>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddGrade} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    required
                    placeholder="Ej: 9"
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 rounded-xl text-xs"
                  >
                    Agregar Calificación
                  </button>
                </form>
              </div>

              {/* Observaciones Académicas */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase block">
                  Observaciones del Pedagogo
                </span>
                <textarea
                  rows={2}
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveObservations}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Guardar Observaciones
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAIReport}
                    className="px-4 py-2 bg-violet-950/20 hover:bg-violet-900/10 border border-violet-500/25 text-violet-400 text-xs font-bold rounded-xl cursor-pointer uppercase"
                  >
                    Generar Reporte IA
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 p-10 rounded-3xl border border-slate-850 text-center text-slate-650 text-xs italic">
              Selecciona un alumno para verificar cuotas y boletín académico.
            </div>
          )}
        </div>
      </div>

      {/* Modal Impresiones */}
      {printModalContent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-900 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                {printModalContent.title}
              </h4>
              <button
                onClick={() => setPrintModalContent(null)}
                className="text-slate-400 hover:text-slate-650"
              >
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
                  setFeedback({
                    tone: "success",
                    message: "Comprobante educativo enviado a impresión.",
                  });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Matricular Alumno */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">
              Matricular Nuevo Alumno
            </h2>
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Horacio Quiroga"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Tutor / Responsable
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Carlos Quiroga"
                    value={newTutor}
                    onChange={(e) => setNewTutor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Celular Tutor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 11-5841-..."
                    value={newTutorPhone}
                    onChange={(e) => setNewTutorPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Beca Otorgada (%)
                  </label>
                  <input
                    type="number"
                    value={newScholarship}
                    onChange={(e) => setNewScholarship(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Valor Cuota ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={newFee}
                    onChange={(e) => setNewFee(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Curso / Comisión
                </label>
                <select
                  value={newCourse}
                  onChange={(e) => {
                    if (isCourseName(e.target.value))
                      setNewCourse(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                >
                  {COURSES.map((course) => (
                    <option key={course} value={course}>
                      {COURSE_INFO[course].label}
                    </option>
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
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs"
                >
                  Matricular Alumno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
