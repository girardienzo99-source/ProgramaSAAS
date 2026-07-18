'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, ShieldCheck, Settings, Layers, Users, Database, 
  Terminal, AlertTriangle, Play, RefreshCw, PlusCircle, Check, X, Search,
  Globe, Key, Link2, History
} from 'lucide-react';
import { Company, AuditLog, SystemErrorLog } from '@programa-sass/shared-types';

// Mock de empresas iniciales
const INITIAL_COMPANIES = [
  { id: 'c1', name: 'Pizzería La Mamma', businessType: 'gastronomy', plan: 'Plan Básico', status: 'active', modules: ['pos', 'inventory', 'contacts', 'gastronomy_tables'] },
  { id: 'c2', name: 'Tienda Moda Urbana', businessType: 'retail_apparel', plan: 'Plan Profesional', status: 'active', modules: ['pos', 'inventory', 'contacts', 'retail_variants', 'billing_arca'] },
  { id: 'c3', name: 'Clínica Dental Sanitas', businessType: 'healthcare', plan: 'Plan Premium / Multirubro', status: 'active', modules: ['pos', 'inventory', 'contacts', 'appointments', 'medical_records', 'billing_arca'] },
  { id: 'c4', name: 'Ferretería El Tornillo', businessType: 'industrial_materials', plan: 'Plan Básico', status: 'suspended', modules: ['pos', 'inventory'] }
];

// Mock de auditoría
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'a1', company_id: 'c1', user_id: 'u1', action: 'UPDATE', target_table: 'products', target_id: 'p1', old_values: { price: 18500 }, new_values: { price: 21000 }, ip_address: '192.168.1.50', created_at: new Date().toISOString() },
  { id: 'a2', company_id: 'c2', user_id: 'u2', action: 'INSERT', target_table: 'invoices', target_id: 'inv1', old_values: null, new_values: { total: 37500, cae: '76248901827300' }, ip_address: '200.45.112.8', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a3', company_id: 'c3', user_id: 'u3', action: 'DELETE', target_table: 'appointments', target_id: 'app9', old_values: { date: '2026-07-10', client: 'Esteban Gomez' }, new_values: null, ip_address: '190.16.88.2', created_at: new Date(Date.now() - 7200000).toISOString() }
];

// Mock de errores
const INITIAL_ERROR_LOGS: SystemErrorLog[] = [
  { id: 'e1', company_id: 'c2', user_id: 'u2', error_message: 'SOAP Fault: Error interno de conexión con AFIP (WSFEV1)', error_stack: 'ARCAClient.solicitarCAE (index.ts:120)\nAPIInvoiceHandler (route.ts:25)', endpoint: '/api/billing/emit-invoice', payload: { invoiceType: 'FA', total: 35000 }, created_at: new Date().toISOString() },
  { id: 'e2', company_id: 'c1', user_id: 'u1', error_message: 'Barcode scanner input timeout. Lectura incompleta del hardware.', error_stack: 'useBarcodeScanner (useBarcodeScanner.ts:33)', endpoint: 'ClientSideHook', payload: { rawCode: '779123' }, created_at: new Date(Date.now() - 1800000).toISOString() }
];

// Mock de API Keys y Webhooks para el nuevo bloque
const INITIAL_API_KEYS = [
  { id: 'k1', companyName: 'Pizzería La Mamma', token: 'ps_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', active: true, created: '2026-07-01' },
  { id: 'k2', companyName: 'Tienda Moda Urbana', token: 'ps_live_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4', active: true, created: '2026-07-05' }
];

const INITIAL_WEBHOOKS = [
  { id: 'w1', companyName: 'Pizzería La Mamma', url: 'https://ecommerce.lamamma.com/webhooks/sales', events: ['sale.created', 'stock.changed'], active: true },
  { id: 'w2', companyName: 'Tienda Moda Urbana', url: 'https://moda-urbana-api.com/webhooks/arca', events: ['invoice.emitted'], active: true }
];

const INITIAL_WEBHOOK_LOGS = [
  { id: 'wl1', companyName: 'Pizzería La Mamma', url: 'https://ecommerce.lamamma.com/webhooks/sales', event: 'sale.created', status: 200, attempt: 1, created: new Date().toISOString() },
  { id: 'wl2', companyName: 'Tienda Moda Urbana', url: 'https://moda-urbana-api.com/webhooks/arca', event: 'invoice.emitted', status: 500, attempt: 3, created: new Date(Date.now() - 1200000).toISOString() }
];

export default function AdminPortalConsole() {
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [errorLogs, setErrorLogs] = useState<SystemErrorLog[]>(INITIAL_ERROR_LOGS);

  // Estados de API y Webhooks
  const [apiKeys, setApiKeys] = useState(INITIAL_API_KEYS);
  const [webhooks, setWebhooks] = useState(INITIAL_WEBHOOKS);
  const [webhookLogs, setWebhookLogs] = useState(INITIAL_WEBHOOK_LOGS);

  // FASE 3: Tareas Programadas (Cron Jobs) tipo Open SaaS
  const [cronTasks, setCronTasks] = useState([
    { id: 'cron1', name: 'Respaldo Base de Datos', cronExpr: '0 3 * * *', status: 'success', lastRun: 'Hoy 03:00 hs', nextRun: 'Mañana 03:00 hs', duration: '2.4s' },
    { id: 'cron2', name: 'Sincronizador CUIT (ARCA)', cronExpr: '*/30 * * * *', status: 'success', lastRun: 'Hace 22 min', nextRun: 'En 8 min', duration: '1.1s' },
    { id: 'cron3', name: 'Recordatorios de Facturas Expiradas', cronExpr: '0 9 * * *', status: 'success', lastRun: 'Hoy 09:00 hs', nextRun: 'Mañana 09:00 hs', duration: '0.8s' },
    { id: 'cron4', name: 'Purga de Cupones Vencidos', cronExpr: '0 0 * * *', status: 'success', lastRun: 'Hoy 00:00 hs', nextRun: 'Mañana 00:00 hs', duration: '0.5s' }
  ]);
  const [cronLogs, setCronLogs] = useState([
    { id: 'cl1', name: 'Sincronizador CUIT (ARCA)', trigger: 'Cron', status: 'success', duration: '1.2s', date: 'Hace 22 min' },
    { id: 'cl2', name: 'Respaldo Base de Datos', trigger: 'Manual', status: 'success', duration: '2.4s', date: 'Hoy 03:00 hs' }
  ]);
  const [isExecutingCron, setIsExecutingCron] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'companies' | 'audit' | 'errors' | 'onboarding' | 'api_webhooks' | 'diagnostics_governance' | 'cron_tasks'>('companies');

  // Onboarding Form State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newBusinessTypeCode, setNewBusinessTypeCode] = useState('gastronomy');
  const [newPlanId, setNewPlanId] = useState('22222222-2222-2222-2222-222222222222');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [dbSubdomain, setDbSubdomain] = useState('');
  const [tenantCuit, setTenantCuit] = useState('30-11223344-9');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  
  const [onboardingStatus, setOnboardingStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [onboardingData, setOnboardingData] = useState<any>(null);

  // Formulario nueva API Key
  const [keyCompany, setKeyCompany] = useState('Pizzería La Mamma');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Formulario nuevo Webhook
  const [whCompany, setWhCompany] = useState('Pizzería La Mamma');
  const [whUrl, setWhUrl] = useState('');
  const [whEvent, setWhEvent] = useState('sale.created');
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);

  // Modal para editar módulos
  const [editingCompany, setEditingCompany] = useState<any | null>(null);

  // Visor de Auditoría
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Generar API Key
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const token = `ps_live_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
    const newKey = {
      id: `k-${Date.now()}`,
      companyName: keyCompany,
      token,
      active: true,
      created: new Date().toISOString().split('T')[0]
    };
    setApiKeys([newKey, ...apiKeys]);
    setIsKeyModalOpen(false);
    alert(`API Key Generada con éxito: ${token}\n(Guardala en un lugar seguro, no volverá a mostrarse).`);
  };

  // Generar Webhook
  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const newWh = {
      id: `w-${Date.now()}`,
      companyName: whCompany,
      url: whUrl,
      events: [whEvent],
      active: true
    };
    setWebhooks([newWh, ...webhooks]);
    setWhUrl('');
    setIsWhModalOpen(false);
    alert('Webhook registrado con firma HMAC SHA-256 activa.');
  };

  // Reintentar despacho de Webhook (Simulación backoff)
  const handleRetryWebhook = (logId: string) => {
    setWebhookLogs(prev => prev.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          status: 200,
          attempt: log.attempt + 1,
          created: new Date().toISOString()
        };
      }
      return log;
    }));
    alert('Reintento despachado con firma HMAC. Estado del receptor: 200 OK.');
  };

  // FASE 3: Simular ejecución de tarea cron
  const handleTriggerCronTask = (taskId: string, taskName: string) => {
    setIsExecutingCron(taskId);
    setTimeout(() => {
      setCronTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            lastRun: 'Justo ahora',
            duration: `${(0.4 + Math.random() * 2).toFixed(1)}s`
          };
        }
        return t;
      }));
      setCronLogs(prev => [
        {
          id: `cl-${Date.now()}`,
          name: taskName,
          trigger: 'Manual',
          status: 'success',
          duration: `${(0.4 + Math.random() * 2).toFixed(1)}s`,
          date: 'Justo ahora'
        },
        ...prev
      ]);
      setIsExecutingCron(null);
    }, 1000);
  };

  // Simular Falla del Sistema
  const handleSimulateError = (type: 'afip' | 'database' | 'payment') => {
    let newErr: SystemErrorLog;
    if (type === 'afip') {
      newErr = {
        id: `e-${Date.now()}`,
        company_id: 'c2',
        user_id: 'u2',
        error_message: 'SOAP Connection Failed: Error interno de conexión con AFIP (WSFEV1)',
        error_stack: 'ARCAClient.solicitarCAE (index.ts:120)\nAPIInvoiceHandler (route.ts:25)',
        endpoint: '/api/billing/emit-invoice',
        payload: { invoiceType: 'FA', total: 35000 },
        created_at: new Date().toISOString()
      };
    } else if (type === 'database') {
      newErr = {
        id: `e-${Date.now()}`,
        company_id: 'c1',
        user_id: 'u1',
        error_message: 'Database Connection Timeout: Azure PostgreSQL failed to acquire transaction lock after 5000ms.',
        error_stack: 'TenantPoolConnection.acquire (connection-pool.ts:43)\nSupabaseClient (supabase.ts:12)',
        endpoint: 'DatabaseConnectionPool',
        payload: { activeConnections: 1420, maxConnections: 1500 },
        created_at: new Date().toISOString()
      };
    } else {
      newErr = {
        id: `e-${Date.now()}`,
        company_id: 'c3',
        user_id: 'u3',
        error_message: 'Mercado Pago Point Response Timeout. Dispositivo offline o sin conexión a internet.',
        error_stack: 'PointIntegratorClient.getPaymentStatus (point.ts:88)\nPOST /api/sales/checkout (route.ts:54)',
        endpoint: '/api/sales/checkout',
        payload: { deviceId: 'mp-point-01', amount: 15400 },
        created_at: new Date().toISOString()
      };
    }

    setErrorLogs([newErr, ...errorLogs]);
    
    // Registrar también la falla en el audit log como alerta
    const failAudit: AuditLog = {
      id: `a-${Date.now()}`,
      company_id: newErr.company_id,
      user_id: 'system',
      action: 'DELETE', // Simboliza alerta/falla
      target_table: 'system_alarms',
      target_id: newErr.id as any,
      old_values: null,
      new_values: { message: newErr.error_message, type: 'critical_system_error' },
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [failAudit, ...prev]);

    alert(`Falla de tipo ${type.toUpperCase()} inyectada con éxito. Revisa la pestaña de Fallas.`);
  };

  // Ejecutar onboarding automático
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingStatus('loading');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: newCompanyName,
          businessTypeCode: newBusinessTypeCode,
          planId: newPlanId,
          adminEmail: newAdminEmail,
          dbSubdomain: dbSubdomain || newCompanyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          tenantCuit: tenantCuit,
          timezone: timezone
        })
      });
      const data = await res.json();
      
      setOnboardingStatus('success');
      setOnboardingData({
        ...data,
        dbSubdomain: dbSubdomain || newCompanyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        tenantCuit: tenantCuit,
        timezone: timezone
      });

      const createdCompany = {
        id: data.company.id,
        name: data.company.name,
        businessType: data.company.businessTypeCode,
        plan: data.company.planId === '11111111-1111-1111-1111-111111111111' ? 'Plan Básico' : data.company.planId === '22222222-2222-2222-2222-222222222222' ? 'Plan Profesional' : 'Plan Premium',
        status: data.company.status,
        modules: data.activatedModules
      };
      setCompanies([createdCompany, ...companies]);

      const newAudit: AuditLog = {
        id: `a-${Date.now()}`,
        company_id: data.company.id,
        user_id: 'u-superadmin',
        action: 'INSERT',
        target_table: 'companies',
        target_id: data.company.id,
        old_values: null,
        new_values: { name: newCompanyName, plan: newPlanId, cuit: tenantCuit, subdomain: dbSubdomain || newCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '') },
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString()
      };
      setAuditLogs([newAudit, ...auditLogs]);

      setNewCompanyName('');
      setNewAdminEmail('');
      setDbSubdomain('');
    } catch (error) {
      alert('Error en onboarding.');
      setOnboardingStatus('idle');
    }
  };

  // Toggle módulo en empresa
  const handleToggleModule = (companyId: string, moduleCode: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const hasModule = c.modules.includes(moduleCode);
        const updatedModules = hasModule
          ? c.modules.filter(m => m !== moduleCode)
          : [...c.modules, moduleCode];
        
        const auditRecord: AuditLog = {
          id: `a-${Date.now()}`,
          company_id: companyId,
          user_id: 'u-superadmin',
          action: 'UPDATE',
          target_table: 'company_modules',
          target_id: companyId as any,
          old_values: { modules: c.modules },
          new_values: { modules: updatedModules },
          ip_address: '127.0.0.1',
          created_at: new Date().toISOString()
        };
        setAuditLogs(prevLogs => [auditRecord, ...prevLogs]);

        return { ...c, modules: updatedModules };
      }
      return c;
    }));
  };

  // Cambiar estado de empresa
  const handleToggleCompanyStatus = (companyId: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const nextStatus = c.status === 'active' ? 'suspended' : 'active';
        
        const auditRecord: AuditLog = {
          id: `a-${Date.now()}`,
          company_id: companyId,
          user_id: 'u-superadmin',
          action: 'UPDATE',
          target_table: 'companies',
          target_id: companyId as any,
          old_values: { status: c.status },
          new_values: { status: nextStatus },
          ip_address: '127.0.0.1',
          created_at: new Date().toISOString()
        };
        setAuditLogs(prevLogs => [auditRecord, ...prevLogs]);

        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-rose-500 to-amber-600 rounded-xl shadow-lg">
              <ShieldAlert className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Portal del Superadministrador (Control Global)
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Auditoría centralizada del SaaS, automatización de onboarding de tenants, licencias de módulos, APIs y logs de error.
          </p>
        </div>

        {/* Tabs de Navegación del Portal */}
        <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-850 self-start md:self-center gap-1">
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'companies' ? 'bg-slate-850 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Empresas
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'onboarding' ? 'bg-slate-850 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Onboarding
          </button>
          <button
            onClick={() => setActiveTab('api_webhooks')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'api_webhooks' ? 'bg-slate-850 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            API & Webhooks
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'audit' ? 'bg-slate-850 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Auditoría
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'errors' ? 'bg-slate-850 text-rose-455 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Fallas
          </button>
          <button
            onClick={() => setActiveTab('diagnostics_governance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'diagnostics_governance' ? 'bg-slate-850 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Diagnóstico y Flags
          </button>
          <button
            onClick={() => setActiveTab('cron_tasks')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'cron_tasks' ? 'bg-slate-850 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Tareas Programadas (Cron)
          </button>
        </div>
      </div>

      {/* Grid de Métricas del SaaS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Clientes Registrados</span>
          <span className="text-2xl font-black text-white mt-1.5 block">{companies.length} Tenants</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Recaudación Mensual (MRR)</span>
          <span className="text-2xl font-black text-emerald-455 mt-1.5 block">$154,000 ARS</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">API Keys Activas</span>
          <span className="text-2xl font-black text-cyan-400 mt-1.5 block">{apiKeys.length} Tokens</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Webhooks Configurados</span>
          <span className="text-2xl font-black text-indigo-400 mt-1.5 block">{webhooks.length} URLs</span>
        </div>
      </div>

      {/* 1. Empresas y Control de Módulos */}
      {activeTab === 'companies' && (
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850">
            Control de Licencias y Módulos
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Empresa / Tenant</th>
                  <th className="p-4">Rubro Comercial</th>
                  <th className="p-4">Plan Actual</th>
                  <th className="p-4">Módulos Habilitados</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {companies.map(comp => (
                  <tr key={comp.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-bold text-white">{comp.name}</td>
                    <td className="p-4 font-mono text-slate-455 uppercase">{comp.businessType}</td>
                    <td className="p-4 text-slate-300 font-semibold">{comp.plan}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {comp.modules.map(mod => (
                          <span key={mod} className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                            {mod}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded font-bold text-[9px] uppercase border ${
                        comp.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {comp.status === 'active' ? 'ACTIVO' : 'SUSPENDIDO'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setEditingCompany(comp)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white rounded border border-slate-800 font-bold"
                        >
                          Módulos
                        </button>
                        <button
                          onClick={() => handleToggleCompanyStatus(comp.id)}
                          className={`px-2.5 py-1 rounded border font-bold ${
                            comp.status === 'active' 
                              ? 'bg-red-950/20 text-red-400 border-red-900/20 hover:bg-red-950/40' 
                              : 'bg-emerald-950/20 text-emerald-455 border-emerald-900/20 hover:bg-emerald-950/40'
                          }`}
                        >
                          {comp.status === 'active' ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Onboarding Automático */}
      {activeTab === 'onboarding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 mb-5">
              Simulador de Venta & Alta Comercial
            </h3>

            <form onSubmit={handleOnboarding} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de la Empresa</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Zapatería CalzaBien"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Correo del Administrador</label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rubro Comercial</label>
                  <select
                    value={newBusinessTypeCode}
                    onChange={(e) => setNewBusinessTypeCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-slate-355 text-xs focus:outline-none"
                  >
                    <option value="gastronomy">Restaurantes / Cafeterías</option>
                    <option value="retail_apparel">Tienda de Ropa / Indumentaria</option>
                    <option value="healthcare">Consultorio Médico / Salud</option>
                    <option value="general_retail">Comercio General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plan Contratado</label>
                  <select
                    value={newPlanId}
                    onChange={(e) => setNewPlanId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-slate-355 text-xs focus:outline-none"
                  >
                    <option value="11111111-1111-1111-1111-111111111111">Plan Básico</option>
                    <option value="22222222-2222-2222-2222-222222222222">Plan Profesional</option>
                    <option value="33333333-3333-3333-3333-333333333333">Plan Premium / Multirubro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subdominio DB / Esquema</label>
                  <input
                    type="text"
                    value={dbSubdomain}
                    onChange={(e) => setDbSubdomain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none font-mono"
                    placeholder="ej: modaurbana"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CUIT Tributario</label>
                  <input
                    type="text"
                    value={tenantCuit}
                    onChange={(e) => setTenantCuit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none font-mono"
                    placeholder="30-11223344-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Configuración Regional (Timezone)</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-300 text-xs focus:outline-none"
                >
                  <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (GMT-3)</option>
                  <option value="America/Santiago">America/Santiago (GMT-4)</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={onboardingStatus === 'loading'}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                {onboardingStatus === 'loading' ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    Ejecutando Onboarding Dinámico...
                  </>
                ) : (
                  'Crear Empresa y Onboard Automatizado'
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-355 pb-2 border-b border-slate-850 mb-4">
                Resultado de Aprovisionamiento SaaS
              </h3>

              {onboardingStatus === 'success' && onboardingData ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 text-xs font-mono text-cyan-400 overflow-x-auto max-h-[350px]">
                  <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    ¡Alta de Empresa Completada en SQL!
                  </p>
                  <div>
                    <strong>Empresa Creada:</strong> {onboardingData.company.id}
                  </div>
                  <div>
                    <strong>Subdominio SQL:</strong> {onboardingData.dbSubdomain}.postgres.database.azure.com
                  </div>
                  <div>
                    <strong>CUIT Tributario:</strong> {onboardingData.tenantCuit}
                  </div>
                  <div>
                    <strong>Zona Horaria:</strong> {onboardingData.timezone}
                  </div>
                  <div>
                    <strong>Sucursal Matriz:</strong> {onboardingData.branch.id} (Pto Venta: {onboardingData.branch.arcaPuntoVenta})
                  </div>
                  <div>
                    <strong>Suscripción Creada:</strong> Vence el {new Date(onboardingData.subscription.endDate).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Módulos Aprovisionados:</strong>
                    <ul className="list-disc pl-5 mt-1 text-slate-400">
                      {onboardingData.activatedModules.map((m: string) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-650 text-xs">
                  <Terminal className="h-10 w-10 mx-auto mb-2 text-slate-750" />
                  Los logs de aprovisionamiento de Supabase aparecerán aquí luego de gatillar el Onboarding.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. API & Webhooks */}
      {activeTab === 'api_webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-cyan-400" />
                  Tokens API Públicos (`ps_live_...`)
                </h4>
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="p-1 text-xs bg-slate-950 hover:bg-slate-800 text-cyan-400 font-bold border border-slate-800 rounded flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Generar
                </button>
              </div>

              <div className="space-y-3">
                {apiKeys.map(k => (
                  <div key={k.id} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white block">{k.companyName}</span>
                      <span className="text-[10px] font-mono text-slate-550 block mt-1">{k.token.substr(0, 15)}...</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      LIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-indigo-400" />
                  Webhooks Registrados
                </h4>
                <button
                  onClick={() => setIsWhModalOpen(true)}
                  className="p-1 text-xs bg-slate-950 hover:bg-slate-800 text-indigo-400 font-bold border border-slate-800 rounded flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Registrar
                </button>
              </div>

              <div className="space-y-3">
                {webhooks.map(w => (
                  <div key={w.id} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-bold text-white">{w.companyName}</span>
                      <span className="text-[9px] font-bold text-indigo-400 font-mono">HMAC SHA-256</span>
                    </div>
                    <div className="text-[10px] text-slate-550 truncate font-mono">{w.url}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {w.events.map(ev => (
                        <span key={ev} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <h4 className="font-bold text-sm text-slate-300 pb-2 border-b border-slate-850 flex items-center gap-1.5">
              <History className="h-4 w-4 text-slate-450" />
              Historial de Envíos y Reintentos (Backoff)
            </h4>

            <div className="space-y-3">
              {webhookLogs.map(log => {
                const isSuccess = log.status === 200;
                return (
                  <div key={log.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-2.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-350">{log.companyName}</span>
                        <span className="text-[9px] text-slate-550 font-mono block mt-0.5">Evento: {log.event}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        isSuccess ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        HTTP {log.status} {isSuccess ? 'OK' : 'ERROR'}
                      </span>
                    </div>

                    <div className="text-[9px] text-slate-550 font-mono truncate">{log.url}</div>

                    <div className="text-[9px] text-slate-500 font-mono bg-slate-950 p-2 rounded border border-slate-850/80">
                      <span className="text-[7.5px] text-slate-550 block uppercase font-bold tracking-wider">X-Sass-Signature (HMAC-SHA256)</span>
                      <span className="text-[8.5px] text-cyan-500">sha256={log.id}b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a7b8c9d0e1f2g3h4</span>
                      {!isSuccess && (
                        <span className="block text-[7.5px] text-amber-500 mt-1 uppercase font-bold">
                          Backoff Activo: Reintento {log.attempt + 1} programado en +{Math.pow(2, log.attempt)}s
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-850">
                      <span>Intento Nro: <strong>{log.attempt}</strong></span>
                      {!isSuccess && (
                        <button
                          onClick={() => handleRetryWebhook(log.id)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-rose-455 hover:text-white rounded border border-slate-800 font-bold text-[9px] flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          Reintentar Con Backoff
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Auditoría Crítica de Acciones */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-850">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350">
              Registro de Auditoría de Acciones Críticas (Audit Trail)
            </h3>
            
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtrar Operación:</label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  // Guardamos el filtro temporalmente en un atributo de datos o local si no queremos re-declarar en estado del archivo principal
                  (window as any)._auditFilter = val;
                  // Forzar actualización de pantalla gatillando un refresh de estado local del componente
                  setAuditLogs([...auditLogs]);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-slate-300 text-xs focus:outline-none"
              >
                <option value="ALL">Todas las operaciones</option>
                <option value="INSERT">INSERT (Altas)</option>
                <option value="UPDATE">UPDATE (Modificaciones)</option>
                <option value="DELETE">DELETE (Bajas)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Empresa</th>
                  <th className="p-4">Operación</th>
                  <th className="p-4">Tabla Destino</th>
                  <th className="p-4">Valores Modificados</th>
                  <th className="p-4">IP Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {auditLogs
                  .filter(log => {
                    const filter = (window as any)._auditFilter || 'ALL';
                    return filter === 'ALL' || log.action === filter;
                  })
                  .map(log => (
                    <tr 
                      key={log.id} 
                      onClick={() => { setSelectedAuditLog(log); setIsAuditModalOpen(true); }}
                      className="hover:bg-slate-900/20 transition-colors cursor-pointer"
                    >
                      <td className="p-4 text-slate-500 font-mono">{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td className="p-4 font-semibold text-slate-300">Tenant {log.company_id}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[9px] ${
                          log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-455' : log.action === 'UPDATE' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-400">{log.target_table}</td>
                      <td className="p-4 max-w-xs truncate font-mono text-[10px] text-slate-405">
                        {JSON.stringify(log.new_values || log.old_values)}
                      </td>
                      <td className="p-4 font-mono text-slate-500">{log.ip_address}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-slate-500">
            * Haz clic sobre cualquier fila para inspeccionar el diff comparativo detallado de valores anteriores y nuevos.
          </div>
        </div>
      )}

      {/* 5. Logs de Error del Sistema */}
      {activeTab === 'errors' && (
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-850">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350">
              Registro de Errores e Integraciones Fallidas (Monitoreo)
            </h3>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleSimulateError('afip')}
                className="px-2.5 py-1 bg-red-950/30 hover:bg-red-950/60 text-rose-455 rounded-lg border border-red-900/30 text-[10px] font-bold"
              >
                Simular Error AFIP SOAP
              </button>
              <button
                onClick={() => handleSimulateError('database')}
                className="px-2.5 py-1 bg-red-950/30 hover:bg-red-950/60 text-rose-455 rounded-lg border border-red-900/30 text-[10px] font-bold"
              >
                Simular Caída DB SQL
              </button>
              <button
                onClick={() => handleSimulateError('payment')}
                className="px-2.5 py-1 bg-red-950/30 hover:bg-red-950/60 text-rose-455 rounded-lg border border-red-900/30 text-[10px] font-bold"
              >
                Simular Timeout MP Point
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {errorLogs.map(err => (
              <div key={err.id} className="bg-slate-950 p-4 rounded-xl border border-rose-900/20 flex gap-4">
                <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 shrink-0 h-fit">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-rose-455">{err.error_message}</h4>
                      <span className="text-[10px] text-slate-550 block font-mono mt-1">
                        Endpoint: <strong>{err.endpoint}</strong> | Tenant: {err.company_id}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(err.created_at).toLocaleTimeString()}</span>
                  </div>

                  {err.error_stack && (
                    <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 text-[9px] font-mono text-slate-400 overflow-x-auto">
                      {err.error_stack}
                    </pre>
                  )}

                  {err.payload && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Payload: {JSON.stringify(err.payload)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Diagnóstico y feature flags de Gobernanza */}
      {activeTab === 'diagnostics_governance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Columna Izquierda: Feature Flags */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-indigo-400" />
              Feature Flags de la Plataforma (Gobernanza)
            </h3>
            <p className="text-xs text-slate-500">
              Habilitá funciones de forma gradual (roll-out) o activá canales experimentales a nivel global.
            </p>

            <div className="space-y-3">
              {[
                { name: 'enable-ai-copilot', desc: 'Habilitar el Asistente AI Copilot en el dashboard de clientes.' },
                { name: 'enable-public-api', desc: 'Permite a los tenants emitir tokens de API e integraciones externas.' },
                { name: 'enable-point-terminal', desc: 'Canal beta de integración física con Mercado Pago Point.' }
              ].map(f => (
                <div key={f.name} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-white font-mono block">{f.name}</span>
                    <span className="text-[10px] text-slate-550 block mt-0.5">{f.desc}</span>
                  </div>
                  <button
                    onClick={() => alert(`Feature Flag "${f.name}" actualizado en base de datos.`)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 font-bold border border-slate-800 rounded-lg"
                  >
                    Activo
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Diagnóstico de Conexiones */}
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 pb-2 border-b border-slate-850 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-cyan-400" />
              Salud e Infraestructura de Red
            </h3>
            <p className="text-xs text-slate-500">
              Chequeo en tiempo real de conexiones a base de datos y latencias de servicios externos (AFIP).
            </p>

            <div className="space-y-3">
              {[
                { name: 'Base de Datos PostgreSQL (Supabase)', status: 'connected', latency: '12ms' },
                { name: 'Caché Distribuida (Redis)', status: 'connected', latency: '2ms' },
                { name: 'AFIP WSAA (Homologación)', status: 'connected', latency: '142ms' },
                { name: 'AFIP WSFEV1 (Factura Electrónica)', status: 'connected', latency: '198ms' }
              ].map(s => (
                <div key={s.name} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">{s.latency}</span>
                    <span className="inline-flex px-2 py-0.5 rounded font-bold text-[8px] uppercase bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                      OK
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FASE 3: Configuración SAML SSO & SCIM Sync (BoxyHQ Enterprise Security) */}
          <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-350 flex items-center gap-2">
                <Key className="h-4.5 w-4.5 text-cyan-400" />
                Configuración SAML SSO & Directorio Activo (BoxyHQ Enterprise Suite)
              </h3>
              <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[9px] font-bold uppercase">
                Seguridad Enterprise
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Permite a tus clientes corporativos (Tenants) conectarse usando Okta, Azure AD o OneLogin mediante SAML Single Sign-On y sincronizar usuarios vía SCIM.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('✓ Configuración SSO SAML y SCIM guardada y aplicada para el dominio del Tenant.');
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2"
            >
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase block">Proveedor SAML (IDP)</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white">
                  <option value="okta">Okta Identity Cloud</option>
                  <option value="azure">Microsoft Entra ID (Azure AD)</option>
                  <option value="onelogin">OneLogin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase block">Endpoint Metadata XML</label>
                <input
                  type="url"
                  placeholder="https://idp.okta.com/app/exk..."
                  defaultValue="https://idp.okta.com/app/exk12345/sso/saml/metadata"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase block">Token Secreto SCIM</label>
                <input
                  type="password"
                  placeholder="scim_secret_..."
                  defaultValue="scim_secret_token_1293810293"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-700 font-mono"
                />
              </div>

              <div className="md:col-span-3 flex justify-between items-center bg-slate-955/20 p-3.5 rounded-xl border border-slate-850">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-slate-400 font-semibold cursor-pointer">
                    <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-cyan-500" />
                    Habilitar SSO SAML
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-400 font-semibold cursor-pointer">
                    <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-cyan-500" />
                    Habilitar SCIM Directory Sync
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => alert('✓ Conexión SAML SSO exitosa. Proveedor Okta respondió firma válida.')}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-cyan-400 border border-slate-800 rounded-xl font-bold cursor-pointer"
                  >
                    Testear Conexión
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-550 text-slate-950 font-black rounded-xl cursor-pointer"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* 7. Tareas Programadas (Cron Jobs) */}
      {activeTab === 'cron_tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Listado de Cron Jobs */}
          <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <History className="h-5 w-5 text-amber-500" />
                Planificador de Tareas del Sistema (Cron Scheduler)
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Monitoreo y ejecución manual de procesos batch automatizados en la infraestructura de la plataforma.
              </p>
            </div>

            <div className="space-y-3">
              {cronTasks.map(task => {
                const isExecuting = isExecutingCron === task.id;
                return (
                  <div key={task.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 flex justify-between items-center text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-200 block text-sm">{task.name}</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono">
                        <span>Expresión: <strong className="text-indigo-400">{task.cronExpr}</strong></span>
                        <span>Última Corrida: {task.lastRun}</span>
                        <span>Duración Promedio: {task.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex px-2 py-0.5 rounded font-bold text-[8px] uppercase bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                        {task.nextRun}
                      </span>
                      <button
                        onClick={() => handleTriggerCronTask(task.id, task.name)}
                        disabled={isExecuting}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-[10px] uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isExecuting ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Ejecutando...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            Correr
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historial de Logs de Ejecución */}
          <div className="lg:col-span-1 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider block border-b border-slate-900 pb-3">
              Logs de Ejecución Recientes
            </h3>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {cronLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-350">{log.name}</span>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-450 px-1 py-0.5 rounded uppercase font-bold">
                      {log.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 mt-2">
                    <span>Disparador: {log.trigger} ({log.duration})</span>
                    <span>{log.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Modal Editar Módulos Marketplace de Empresa */}
      {editingCompany && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setEditingCompany(null)}
              className="absolute right-5 top-5 p-1 rounded-full hover:bg-slate-800 text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">Módulos del Marketplace</h3>
            <p className="text-slate-400 text-xs mb-5">
              Habilitá o deshabilitá módulos a nivel de base de datos para {editingCompany.name}.
            </p>

            <div className="space-y-3">
              {[
                { code: 'pos', name: 'Punto de Venta (POS)' },
                { code: 'inventory', name: 'Control de Stock' },
                { code: 'contacts', name: 'Clientes y Proveedores' },
                { code: 'billing_arca', name: 'Facturación Electrónica ARCA' },
                { code: 'gastronomy_tables', name: 'Gastronomía (Mesas y Comandas)' },
                { code: 'retail_variants', name: 'Venta Minorista (Talles y Colores)' }
              ].map(m => {
                const isActive = editingCompany.modules.includes(m.code);
                return (
                  <div key={m.code} className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{m.name}</span>
                      <span className="text-[9px] font-mono text-slate-550 uppercase">{m.code}</span>
                    </div>
                    
                    <button
                      onClick={() => handleToggleModule(editingCompany.id, m.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isActive 
                          ? 'bg-emerald-500/10 text-emerald-455 border-emerald-500/20 hover:bg-emerald-500/20' 
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {isActive ? 'Habilitado' : 'Deshabilitado'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Generar API Key */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2">Generar API Token Público</h3>
            <p className="text-slate-400 text-xs mb-5">
              Generá un token seguro para autorizar llamadas externas al catálogo y POS de tu empresa.
            </p>

            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Asignar a Empresa</label>
                <select
                  value={keyCompany}
                  onChange={(e) => setKeyCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-355 text-xs focus:outline-none"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Generar API Key
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Webhook */}
      {isWhModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2">Registrar Suscripción Webhook</h3>
            <p className="text-slate-400 text-xs mb-5">
              Suscribite a eventos comerciales ingresando una URL receptora (se firmará con HMAC SHA-256).
            </p>

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Asignar a Empresa</label>
                <select
                  value={whCompany}
                  onChange={(e) => setWhCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-355 text-xs focus:outline-none"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payload URL (Destinatario)</label>
                <input
                  type="url"
                  required
                  value={whUrl}
                  onChange={(e) => setWhUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="https://tu-api.com/webhooks"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Evento Suscripto</label>
                <select
                  value={whEvent}
                  onChange={(e) => setWhEvent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-355 text-xs focus:outline-none"
                >
                  <option value="sale.created">sale.created (Nueva Venta)</option>
                  <option value="client.created">client.created (Ficha Cliente)</option>
                  <option value="stock.changed">stock.changed (Cambio Stock)</option>
                  <option value="invoice.emitted">invoice.emitted (Factura CAE)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Registrar Webhook
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal Visor de Auditoría / Diff Explorer */}
      {isAuditModalOpen && selectedAuditLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative">
            <button 
              onClick={() => { setSelectedAuditLog(null); setIsAuditModalOpen(false); }}
              className="absolute right-5 top-5 p-1 rounded-full hover:bg-slate-800 text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-cyan-400" />
              Comparador de Valores SQL (Audit Diff)
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Visualizá los cambios en la tabla <strong className="font-mono text-white">{selectedAuditLog.target_table}</strong> para la fila con ID <strong className="font-mono text-white">{String(selectedAuditLog.target_id)}</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mb-1">
                  Valores Anteriores (OLD VALUES)
                </span>
                <pre className="bg-slate-950 p-4 rounded-xl border border-red-900/10 text-[10px] font-mono text-red-300 overflow-x-auto max-h-[300px]">
                  {selectedAuditLog.old_values 
                    ? JSON.stringify(selectedAuditLog.old_values, null, 2) 
                    : '-- Registro Nuevo (Null) --'}
                </pre>
              </div>

              <div>
                <span className="text-[10px] text-emerald-450 font-bold uppercase tracking-wider block mb-1">
                  Valores Nuevos (NEW VALUES)
                </span>
                <pre className="bg-slate-950 p-4 rounded-xl border border-emerald-900/10 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-[300px]">
                  {selectedAuditLog.new_values 
                    ? JSON.stringify(selectedAuditLog.new_values, null, 2) 
                    : '-- Registro Eliminado (Null) --'}
                </pre>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">IP: {selectedAuditLog.ip_address}</span>
              <span className="text-slate-500 font-mono">Operado por: {selectedAuditLog.user_id}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
