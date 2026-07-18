import type { Metadata } from 'next';
import SupplierPortalConsole from '@/components/supermarket/SupplierPortalConsole';

export const metadata: Metadata = {
  title: 'Portal de Proveedores | SaaS Gestion',
  description: 'Ordenes de compra y confirmaciones de entrega.',
};

export default function SupplierPortalPage() {
  return <SupplierPortalConsole />;
}
