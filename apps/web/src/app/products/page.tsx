import AppShell from '@/components/layout/AppShell';
import ContextualModuleConsole from '@/components/workspace/ContextualModuleConsole';
import { getBusinessNavigation, getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro);
  const businessType = code ? getBusinessType(code) : null;
  const contextualTitle = code ? getBusinessNavigation(code).find((item) => item.path === '/products')?.label : null;
  return (
    <AppShell
      eyebrow={code ? getBusinessType(code).name : 'Catálogo'}
      title={contextualTitle ?? 'Productos y servicios'}
      description={businessType ? `Administrá el catálogo y los registros comerciales de ${businessType.name}.` : 'Administrá precios, costos, variantes, códigos y disponibilidad comercial.'}
      status="Catálogo activo"
      info={businessType ? `Esta vista utiliza los atributos y flujos propios de ${businessType.name}.` : 'Las variantes y el stock por sucursal se mantienen vinculados para evitar diferencias al vender.'}
      businessTypeCode={code}
    >
      <ContextualModuleConsole module="products" businessTypeCode={code} />
    </AppShell>
  );
}
