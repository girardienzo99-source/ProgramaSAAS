import SalonConsole from '@/components/gastronomy/SalonConsole';
import AppShell from '@/components/layout/AppShell';
import { getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function SalonPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro) ?? 'gastronomy';
  return (
    <AppShell
      eyebrow={getBusinessType(code).name}
      title="Salón y comandas"
      description="Gestioná mesas, mozos, pedidos, cocina y cuentas desde una sola vista operativa."
      status="Salón activo"
      info="Los pedidos se agrupan por mesa y mantienen su estado sincronizado entre salón, caja y cocina."
      businessTypeCode={code}
    >
      <SalonConsole />
    </AppShell>
  );
}
