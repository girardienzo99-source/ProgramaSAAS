import POSConsole from '@/components/pos/POSConsole';
import AppShell from '@/components/layout/AppShell';
import { redirect } from 'next/navigation';
import { getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function POSPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro);
  if (code) redirect(`/rubros/${code}`);
  return (
    <AppShell
      eyebrow={code ? getBusinessType(code).name : 'Operaciones'}
      title="Punto de venta"
      description="Registrá productos, cobros y comprobantes desde una terminal preparada para operación continua."
      status="Caja 01 abierta"
      info="La venta descuenta stock, registra el movimiento de caja y prepara los datos de facturación."
      businessTypeCode={code}
    >
      <POSConsole />
    </AppShell>
  );
}
