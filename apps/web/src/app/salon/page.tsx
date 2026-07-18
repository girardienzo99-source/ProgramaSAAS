import { redirect } from 'next/navigation';
import { resolveBusinessTypeCode } from '@/config/businessTypes';

export default async function SalonPage({ searchParams }: { searchParams: Promise<{ rubro?: string | string[] }> }) {
  const requested = (await searchParams).rubro;
  const code = resolveBusinessTypeCode(requested);
  if (requested && !code) redirect('/');
  redirect(`/rubros/${code ?? 'gastronomy'}${code && code !== 'gastronomy' ? '' : '#salon'}`);
}
