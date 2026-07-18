import DashboardConsole from '@/components/dashboard/DashboardConsole';
import AppShell from '@/components/layout/AppShell';
import { redirect } from 'next/navigation';
import { getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro);
  if (code) redirect(`/rubros/${code}`);
  return (
    <AppShell
      eyebrow={code ? getBusinessType(code).name : 'Gestión'}
      title="Resumen del negocio"
      description="Indicadores comerciales, evolución de ventas y alertas para tomar decisiones rápidas."
      status="Consola gerencial"
      info="Los indicadores integran facturación, transacciones y proyecciones del período seleccionado."
      businessTypeCode={code}
    >
      <DashboardConsole />
    </AppShell>
  );
}
