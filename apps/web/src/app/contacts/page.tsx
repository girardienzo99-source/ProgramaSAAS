import AppShell from '@/components/layout/AppShell';
import ContextualModuleConsole from '@/components/workspace/ContextualModuleConsole';
import { getBusinessNavigation, getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro);
  const businessType = code ? getBusinessType(code) : null;
  const contextualTitle = code ? getBusinessNavigation(code).find((item) => item.path === '/contacts')?.label : null;
  return (
    <AppShell
      eyebrow={code ? getBusinessType(code).name : 'Comercial'}
      title={contextualTitle ?? 'Clientes y proveedores'}
      description={businessType ? `Gestioná personas, fichas y relaciones vinculadas a ${businessType.name}.` : 'Centralizá datos fiscales, cuentas corrientes, saldos y vías de contacto.'}
      status="Datos aislados"
      info={businessType ? `La ficha y sus acciones se adaptan al flujo de ${businessType.name}.` : 'La información se mantiene separada por empresa y preparada para facturación y seguimiento comercial.'}
      businessTypeCode={code}
    >
      <ContextualModuleConsole module="contacts" businessTypeCode={code} />
    </AppShell>
  );
}
