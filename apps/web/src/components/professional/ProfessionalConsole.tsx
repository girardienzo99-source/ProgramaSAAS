'use client';

import React, { useMemo, useState } from 'react';
import {
  Briefcase, Plus, CheckCircle2, AlertTriangle, Search, Printer, X
} from 'lucide-react';

type ProjectStatus = 'planning' | 'development' | 'testing' | 'delivered' | 'support';
type ProjectOwner = 'Lucas Galarza' | 'Victoria Silveyra';
type OwnerFilter = ProjectOwner | 'all';
type StatusFilter = ProjectStatus | 'all';
type Feedback = { tone: 'success' | 'warning' | 'error'; message: string };

interface ProjectMilestone {
  name: string;
  completed: boolean;
  dueDate: string;
}

interface ProfessionalProject {
  id: string;
  projectName: string;
  clientName: string;
  owner: ProjectOwner;
  hourlyRate: number;
  estimatedHours: number;
  actualHours: number;
  status: ProjectStatus;
  isInvoiced: boolean;
  hoursLoggedToday: number;
  budgetAmount: number;
  milestones: ProjectMilestone[];
}

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planificación',
  development: 'En Desarrollo',
  testing: 'En Pruebas',
  delivered: 'Entregado',
  support: 'Soporte'
};

const PROJECT_STATUS_STEPS: Array<{ label: string; value: ProjectStatus }> = [
  { label: 'Planificación', value: 'planning' },
  { label: 'En Desarrollo', value: 'development' },
  { label: 'En Pruebas', value: 'testing' },
  { label: 'Entregado', value: 'delivered' },
  { label: 'Soporte', value: 'support' }
];

const OWNER_OPTIONS: ProjectOwner[] = ['Lucas Galarza', 'Victoria Silveyra'];
const OWNER_FILTERS: Array<{ label: string; value: OwnerFilter }> = [
  { label: 'Todos los Líderes', value: 'all' },
  ...OWNER_OPTIONS.map(owner => ({ label: owner, value: owner }))
];

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Todos los Estados', value: 'all' },
  ...PROJECT_STATUS_STEPS
];

const isOwnerFilter = (value: string): value is OwnerFilter =>
  OWNER_FILTERS.some(option => option.value === value);

const isProjectOwner = (value: string): value is ProjectOwner =>
  OWNER_OPTIONS.includes(value as ProjectOwner);

const isStatusFilter = (value: string): value is StatusFilter =>
  STATUS_FILTERS.some(option => option.value === value);

const addDaysISO = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const INITIAL_PROJECTS: ProfessionalProject[] = [
  {
    id: 'proj-1',
    projectName: 'E-Commerce Next.js',
    clientName: 'Distribuidora del Sol',
    owner: 'Lucas Galarza',
    hourlyRate: 8500,
    estimatedHours: 80,
    actualHours: 64,
    status: 'development',
    isInvoiced: false,
    hoursLoggedToday: 4,
    budgetAmount: 680000,
    milestones: [
      { name: 'Wireframes & UI Design', completed: true, dueDate: '2026-06-15' },
      { name: 'Integración Pasarela Pagos', completed: false, dueDate: '2026-07-20' },
      { name: 'Deploy a Producción Vercel', completed: false, dueDate: '2026-08-01' }
    ]
  },
  {
    id: 'proj-2',
    projectName: 'Auditoría de Ciberseguridad',
    clientName: 'Banco Metropolitano',
    owner: 'Victoria Silveyra',
    hourlyRate: 15000,
    estimatedHours: 40,
    actualHours: 42,
    status: 'testing',
    isInvoiced: true,
    hoursLoggedToday: 0,
    budgetAmount: 600000,
    milestones: [
      { name: 'Escaneo de Vulnerabilidades', completed: true, dueDate: '2026-06-10' },
      { name: 'Presentación Informe Ejecutivo', completed: true, dueDate: '2026-07-05' }
    ]
  },
  {
    id: 'proj-3',
    projectName: 'Consultoría Estratégica ERP',
    clientName: 'Supermercados SASS',
    owner: 'Lucas Galarza',
    hourlyRate: 12000,
    estimatedHours: 50,
    actualHours: 15,
    status: 'planning',
    isInvoiced: false,
    hoursLoggedToday: 0,
    budgetAmount: 600000,
    milestones: [
      { name: 'Relevamiento de Procesos', completed: false, dueDate: '2026-07-30' }
    ]
  }
];

export default function ProfessionalConsole() {
  const [projects, setProjects] = useState<ProfessionalProject[]>(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<ProfessionalProject | null>(INITIAL_PROJECTS[0]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // FASE 3: Simulador de Horas Proyectadas y Desvío
  const [projectedExtraHours, setProjectedExtraHours] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Form nuevo proyecto
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newOwner, setNewOwner] = useState<ProjectOwner>('Lucas Galarza');
  const [newRate, setNewRate] = useState(8500);
  const [newEstHours, setNewEstHours] = useState(40);

  // Form cargar horas
  const [hoursToAdd, setHoursToAdd] = useState(4);
  const [taskDescription, setTaskDescription] = useState('');

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const projectName = newProjectName.trim();
    const clientName = newClient.trim();
    const hourlyRate = Number(newRate);
    const estimatedHours = Number(newEstHours);

    if (!projectName || !clientName || hourlyRate <= 0 || estimatedHours <= 0) {
      setFeedback({ tone: 'error', message: 'Completá proyecto, cliente, tarifa y horas con valores válidos.' });
      return;
    }

    const newProj: ProfessionalProject = {
      id: `proj-${Date.now()}`,
      projectName,
      clientName,
      owner: newOwner,
      hourlyRate,
      estimatedHours,
      actualHours: 0,
      status: 'planning',
      isInvoiced: false,
      hoursLoggedToday: 0,
      budgetAmount: hourlyRate * estimatedHours,
      milestones: [
        { name: 'Kick-off inicial de proyecto', completed: false, dueDate: addDaysISO(7) }
      ]
    };

    setProjects(prev => [newProj, ...prev]);
    setSelectedProject(newProj);
    setIsAddModalOpen(false);
    setFeedback({ tone: 'success', message: `Proyecto ${newProj.projectName} creado y listo para cargar horas.` });

    // Reset
    setNewProjectName('');
    setNewClient('');
  };

  const handleLogHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || hoursToAdd <= 0) {
      setFeedback({ tone: 'error', message: 'Ingresá una cantidad de horas mayor a cero.' });
      return;
    }

    const updated: ProfessionalProject = {
      ...selectedProject,
      actualHours: selectedProject.actualHours + hoursToAdd,
      hoursLoggedToday: selectedProject.hoursLoggedToday + hoursToAdd
    };

    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);
    setTaskDescription('');
    setFeedback({
      tone: updated.actualHours > updated.estimatedHours ? 'warning' : 'success',
      message: `${hoursToAdd} hs registradas en ${updated.projectName}${taskDescription.trim() ? `: ${taskDescription.trim()}` : '.'}`
    });
  };

  const handleToggleMilestone = (idx: number) => {
    if (!selectedProject) return;

    const milestones = selectedProject.milestones.map((milestone, milestoneIdx) =>
      milestoneIdx === idx ? { ...milestone, completed: !milestone.completed } : milestone
    );
    const updated: ProfessionalProject = { ...selectedProject, milestones };

    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);

    const allCompleted = milestones.every(m => m.completed);
    if (allCompleted) {
      setFeedback({ tone: 'success', message: `¡Excelente! Todos los hitos del proyecto "${selectedProject.projectName}" se han completado con éxito.` });
    } else {
      setFeedback({ tone: 'success', message: `Hito "${milestones[idx].name}" actualizado.` });
    }
  };

  // FASE 3: Postergar vencimiento de hito por 7 días
  const handlePostponeMilestone = (idx: number) => {
    if (!selectedProject) return;

    const milestones = selectedProject.milestones.map((milestone, milestoneIdx) => {
      if (milestoneIdx === idx) {
        const currentDate = new Date(milestone.dueDate);
        currentDate.setDate(currentDate.getDate() + 7);
        return { ...milestone, dueDate: currentDate.toISOString().split('T')[0] };
      }
      return milestone;
    });

    const updated: ProfessionalProject = { ...selectedProject, milestones };

    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);
    setFeedback({ tone: 'warning', message: `Fecha límite de "${selectedProject.milestones[idx].name}" postergada por 7 días.` });
  };

  const handleUpdateStatus = (status: ProjectStatus) => {
    if (!selectedProject) return;

    const updated: ProfessionalProject = { ...selectedProject, status };

    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);
    setFeedback({ tone: 'success', message: `Proyecto actualizado a ${PROJECT_STATUS_LABELS[status]}.` });
  };

  const handleGenerateInvoice = (proj: ProfessionalProject) => {
    const updated: ProfessionalProject = { ...proj, isInvoiced: true };

    setProjects(prev => prev.map(p => {
      return p.id === proj.id ? updated : p;
    }));
    if (selectedProject?.id === proj.id) {
      setSelectedProject(updated);
    }
    setFeedback({ tone: 'success', message: 'Factura electrónica emitida ante AFIP con éxito.' });
  };

  const handlePrintHoursReport = (proj: ProfessionalProject) => {
    setPrintModalContent({
      title: `REPORTE DE HORAS DE CONSULTORÍA`,
      content: `Proyecto: ${proj.projectName}\nCliente: ${proj.clientName}\nResponsable: ${proj.owner}\n\nHoras Estimadas: ${proj.estimatedHours} hs\nHoras Consumidas: ${proj.actualHours} hs\nDesvío/Estado: ${proj.actualHours > proj.estimatedHours ? 'SOBREPASADO' : 'DENTRO DE LÍMITES'}\nTarifa por hora: $${proj.hourlyRate.toLocaleString()}\nTotal Devengado: $${(proj.actualHours * proj.hourlyRate).toLocaleString()}\n\nSass Services S.A.`
    });
  };

  const handlePrintBudget = (proj: ProfessionalProject) => {
    setPrintModalContent({
      title: `PRESUPUESTO FORMAL DE PROYECTO`,
      content: `Cliente: ${proj.clientName}\nProyecto: ${proj.projectName}\n\nTarifa acordada: $${proj.hourlyRate.toLocaleString()} / hora\nEstimación de Horas: ${proj.estimatedHours} hs\nImporte Presupuestado Total: $${proj.budgetAmount.toLocaleString()}\n\nEstado Hitos de Desarrollo:\n${proj.milestones.map(m => `- ${m.name} (${m.completed ? 'Completado' : 'Pendiente'} - ${m.dueDate})`).join('\n')}\n\nAceptado por el cliente: SASS`
    });
  };

  const metrics = useMemo(() => {
    const totalHourlyRate = projects.reduce((acc, curr) => acc + curr.hourlyRate, 0);
    const averageRate = projects.length > 0 ? Math.round(totalHourlyRate / projects.length) : 0;

    return {
      activeProjects: projects.length,
      hoursLoggedToday: projects.reduce((acc, curr) => acc + curr.hoursLoggedToday, 0),
      invoicedIncome: projects.filter(p => p.isInvoiced).reduce((acc, curr) => acc + curr.budgetAmount, 0),
      overBudgetProjects: projects.filter(p => p.actualHours > p.estimatedHours).length,
      averageRate
    };
  }, [projects]);

  // Filtrado de proyectos
  const filteredProjects = useMemo(() => projects.filter(p => {
    const matchSearch = p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchOwner = ownerFilter === 'all' || p.owner === ownerFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchSearch && matchOwner && matchStatus;
  }), [projects, searchTerm, ownerFilter, statusFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-indigo-400 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">Consola de Horas, Hitos & Proyectos</h1>
            <p className="text-slate-400 text-xs mt-0.5">Control de horas de consultores, desvíos presupuestarios e hitos de entrega comercial.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Proyecto
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
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Proyectos Activos</span>
          <span className="text-xl font-black text-white mt-1 block">{metrics.activeProjects}</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Horas Cargadas Hoy</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {metrics.hoursLoggedToday} hs
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Ingresos Facturados</span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            ${metrics.invoicedIncome.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Desvíos Detectados</span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {metrics.overBudgetProjects}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Tarifa Promedio</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">${metrics.averageRate.toLocaleString()}</span>
        </div>
      </div>

      {/* Alertas Operativas (Desvíos de Horas) */}
      {projects.some(p => p.actualHours > p.estimatedHours) && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
            <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>Alerta de Consultoría: Existen proyectos activos que han excedido las horas presupuestadas iniciales.</span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Proyecto o Cliente</label>
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
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Líder Proyecto</label>
          <select
            value={ownerFilter}
            onChange={e => {
              if (isOwnerFilter(e.target.value)) setOwnerFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {OWNER_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Estado Proyecto</label>
          <select
            value={statusFilter}
            onChange={e => {
              if (isStatusFilter(e.target.value)) setStatusFilter(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            {STATUS_FILTERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Listado Proyectos */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Briefcase className="h-4.5 w-4.5 text-indigo-400" />
            Proyectos Activos
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                Sin proyectos con los filtros activos.
              </div>
            ) : (
              filteredProjects.map(proj => {
                const active = selectedProject?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setSelectedProject(proj);
                    }}
                    className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                      active ? 'bg-indigo-950/10 border-indigo-500/40 text-white' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-white">{proj.projectName}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        proj.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {PROJECT_STATUS_LABELS[proj.status]}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 block mt-1">Cliente: {proj.clientName}</span>
                    <span className="text-[10px] text-slate-500 block">Líder: {proj.owner}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detalle Proyecto & Horas */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
          {selectedProject ? (
            <>
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">{selectedProject.projectName}</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Cliente: {selectedProject.clientName} | Responsable: {selectedProject.owner} | Tarifa: ${selectedProject.hourlyRate}/h
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintHoursReport(selectedProject)}
                    className="p-2 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850"
                  >
                    <Printer className="h-3.5 w-3.5 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => handlePrintBudget(selectedProject)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 font-bold rounded-xl text-[10px]"
                  >
                    Presupuesto
                  </button>
                  {!selectedProject.isInvoiced ? (
                    <button
                      onClick={() => handleGenerateInvoice(selectedProject)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-xl text-[10px] uppercase"
                    >
                      Facturar
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold text-[10px] rounded-xl uppercase">
                      Facturado
                    </span>
                  )}
                </div>
              </div>

              {/* Registro de Horas & Desvíos */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-550 font-bold uppercase block">Carga de Horas del Proyecto</span>
                  <span className="text-[10px] text-slate-500">
                    Consumidas: {selectedProject.actualHours} hs / Estimadas: {selectedProject.estimatedHours} hs
                  </span>
                </div>

                {/* Progress bar de horas */}
                <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden border border-slate-850">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selectedProject.actualHours > selectedProject.estimatedHours ? 'bg-rose-600' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, (selectedProject.actualHours / selectedProject.estimatedHours) * 100)}%` }}
                  />
                </div>

                {selectedProject.actualHours > selectedProject.estimatedHours && (
                  <span className="text-[9px] text-rose-500 font-bold uppercase block">
                    ⚠ Desvío detectado: Se excedió el presupuesto original por {(selectedProject.actualHours - selectedProject.estimatedHours)} hs.
                  </span>
                )}

                {/* Form agregar horas */}
                <form onSubmit={handleLogHours} className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-900 pt-3.5">
                  <input
                    type="number"
                    required
                    placeholder="Horas..."
                    value={hoursToAdd === 0 ? '' : hoursToAdd}
                    onChange={e => setHoursToAdd(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Tarea realizada..."
                    value={taskDescription}
                    onChange={e => setTaskDescription(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <button type="submit" className="py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs">
                    Cargar Horas
                  </button>
                </form>
              </div>

              {/* FASE 3: Simulador de Presupuesto & Desvío Proyectado */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-550 font-bold uppercase block">Simulador de Margen y Desvío Financiero</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    (selectedProject.actualHours * selectedProject.hourlyRate) > selectedProject.budgetAmount
                      ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-455 border border-emerald-500/20'
                  }`}>
                    {(selectedProject.actualHours * selectedProject.hourlyRate) > selectedProject.budgetAmount ? 'Desvío Crítico' : 'Presupuesto Saludable'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase">Presupuesto Inicial</span>
                    <span className="font-mono font-black text-slate-200 mt-1 block">${selectedProject.budgetAmount.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase">Costo Real Actual</span>
                    <span className="font-mono font-black text-slate-200 mt-1 block">${(selectedProject.actualHours * selectedProject.hourlyRate).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase">Margen Restante Proyectado</span>
                    <span className={`font-mono font-black mt-1 block ${
                      (selectedProject.budgetAmount - (selectedProject.actualHours + projectedExtraHours) * selectedProject.hourlyRate) < 0 
                        ? 'text-rose-500' 
                        : 'text-emerald-455'
                    }`}>
                      ${(selectedProject.budgetAmount - (selectedProject.actualHours + projectedExtraHours) * selectedProject.hourlyRate).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-900">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Simular Horas Adicionales Requeridas:</span>
                    <strong className="text-indigo-400 font-mono font-bold">+{projectedExtraHours} horas</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={projectedExtraHours}
                    onChange={e => setProjectedExtraHours(Number(e.target.value))}
                    className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[9px] text-slate-500">
                    Arrastrá el control para prever si futuras horas extras causarán desvío en el presupuesto contractual.
                  </p>
                </div>
              </div>

              {/* Hitos de Entrega del Proyecto */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-[10px] text-slate-550 font-bold uppercase block">Hitos de Entrega del Proyecto</span>
                <div className="space-y-2">
                  {selectedProject.milestones.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/40 rounded-xl border border-slate-900">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={m.completed}
                          onChange={() => handleToggleMilestone(idx)}
                          className="cursor-pointer"
                        />
                        <span className={`font-semibold ${m.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {m.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-slate-500 font-mono">Límite: {m.dueDate}</span>
                        {!m.completed && (
                          <button
                            type="button"
                            onClick={() => handlePostponeMilestone(idx)}
                            className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 text-[8px] uppercase font-bold rounded-lg cursor-pointer"
                          >
                            +7 Días
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado Proyecto */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-[10px] text-slate-555 font-bold uppercase block">Cambiar Etapa del Proyecto</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PROJECT_STATUS_STEPS.map(step => (
                    <button
                      key={step.value}
                      onClick={() => handleUpdateStatus(step.value)}
                      className={`py-1 px-2 rounded-lg text-[9px] font-bold border transition-all ${
                        selectedProject.status === step.value 
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' 
                          : 'bg-slate-900 border-slate-850 text-slate-500'
                      }`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

            </>
          ) : (
            <div className="text-center py-28 text-slate-650 text-xs italic">
              Selecciona un proyecto para cargar horas de consultores y gestionar hitos.
            </div>
          )}
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
                  setFeedback({ tone: 'success', message: 'Reporte comercial enviado a impresión.' });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-slate-950 font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Proyecto */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">Nuevo Proyecto de Consultoría</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Implementación SAP / ERP"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banco Metropolitano"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tarifa por Hora ($)</label>
                  <input
                    type="number"
                    required
                    value={newRate}
                    onChange={e => setNewRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Horas Presupuestadas</label>
                  <input
                    type="number"
                    required
                    value={newEstHours}
                    onChange={e => setNewEstHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Responsable Asignado</label>
                <select
                  value={newOwner}
                  onChange={e => {
                    if (isProjectOwner(e.target.value)) setNewOwner(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                >
                  {OWNER_OPTIONS.map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                >
                  Guardar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
