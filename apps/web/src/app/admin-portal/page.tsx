import AdminPortalConsole from '@/components/admin/AdminPortalConsole';
import AppShell from '@/components/layout/AppShell';

export default function AdminPortalPage() {
  return (
    <AppShell
      eyebrow="Administración"
      title="Control de plataforma"
      description="Empresas, licencias, integraciones, auditoría y diagnóstico general del servicio."
      status="Superadmin"
      info="Este espacio concentra operaciones de plataforma. Los cambios deben quedar registrados en auditoría."
    >
      <AdminPortalConsole />
    </AppShell>
  );
}
