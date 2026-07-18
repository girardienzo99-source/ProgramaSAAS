import AppShell from '@/components/layout/AppShell';
import ContextualModuleConsole from '@/components/workspace/ContextualModuleConsole';
import { getBusinessNavigation, getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro);
  const businessType = code ? getBusinessType(code) : null;
  const contextualTitle = code ? getBusinessNavigation(code).find((item) => item.path === '/inventory')?.label : null;
  return (
    <AppShell
      eyebrow={code ? getBusinessType(code).name : 'Operaciones'}
      title={contextualTitle ?? 'Inventario y depósitos'}
      description={businessType ? `Controlá existencias, estados y movimientos operativos de ${businessType.name}.` : 'Controlá existencias, movimientos y mínimos por producto y sucursal.'}
      status="Multi depósito"
      info={businessType ? `La información se filtra y presenta según la operación de ${businessType.name}.` : 'Cada ajuste queda asociado a su sucursal, usuario y motivo para mantener la trazabilidad.'}
      businessTypeCode={code}
    >
      <ContextualModuleConsole module="inventory" businessTypeCode={code} />
    </AppShell>
  );
}
