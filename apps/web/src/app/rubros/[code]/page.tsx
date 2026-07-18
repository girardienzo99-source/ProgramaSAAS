import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RubroWorkspace from '@/components/workspace/RubroWorkspace';
import { BUSINESS_TYPES, getBusinessType, isBusinessTypeCode } from '@/config/businessTypes';

interface RubroPageProps {
  params: Promise<{ code: string }>;
}

export function generateStaticParams() {
  return BUSINESS_TYPES.map(({ code }) => ({ code }));
}

export async function generateMetadata({ params }: RubroPageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isBusinessTypeCode(code)) return {};
  const businessType = getBusinessType(code);
  return {
    title: `${businessType.name} | SaaS Gestión`,
    description: businessType.description,
  };
}

export default async function RubroPage({ params }: RubroPageProps) {
  const { code } = await params;
  if (!isBusinessTypeCode(code)) notFound();
  return <RubroWorkspace code={code} />;
}
