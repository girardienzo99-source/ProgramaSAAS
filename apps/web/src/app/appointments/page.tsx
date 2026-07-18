import AppShell from '@/components/layout/AppShell';
import ContextualModuleConsole from '@/components/workspace/ContextualModuleConsole';
import { getBusinessNavigation, getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro);
  const businessType = code ? getBusinessType(code) : null;
  const contextualTitle = code ? getBusinessNavigation(code).find((item) => item.path === '/appointments')?.label : null;
  return (
    <AppShell
      eyebrow={code ? getBusinessType(code).name : 'Consultorio / Salud'}
      title={contextualTitle ?? 'Agenda e historia clínica'}
      description={businessType ? `Gestioná la operación y los registros de ${businessType.name} desde una vista especializada.` : 'Organizá turnos, sala de espera, recetas y evoluciones por profesional.'}
      status="HCE activa"
      info={businessType ? `Los estados, formularios y acciones corresponden al flujo operativo de ${businessType.name}.` : 'La información clínica se presenta dentro del contexto aislado de la empresa y del profesional.'}
      businessTypeCode={code}
    >
      <ContextualModuleConsole module="appointments" businessTypeCode={code} />
    </AppShell>
  );
}
