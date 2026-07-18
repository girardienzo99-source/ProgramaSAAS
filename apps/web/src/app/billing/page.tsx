import BillingConsole from '@/components/billing/BillingConsole';
import AppShell from '@/components/layout/AppShell';
import { getBusinessType, resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const code = resolveBusinessTypeCode((await searchParams).rubro);
  return (
    <AppShell
      eyebrow={code ? getBusinessType(code).name : 'Fiscal'}
      title="Facturación ARCA"
      description="Prepará comprobantes vinculados a ventas y consultá su trazabilidad fiscal."
      status="Cola fiscal segura"
      info="Los certificados se resuelven exclusivamente en el servidor. Sin respuesta real de ARCA no se genera CAE, QR ni estado autorizado."
      businessTypeCode={code}
    >
      <BillingConsole />
    </AppShell>
  );
}
