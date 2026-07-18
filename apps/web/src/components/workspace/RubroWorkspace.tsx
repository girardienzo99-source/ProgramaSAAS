'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  Heart,
  Key,
  Laptop,
  Layers,
  Package,
  Play,
  RefreshCw,
  Scissors,
  Settings,
  ShieldCheck,
  Shirt,
  Sparkles,
  Utensils,
  Wrench,
  Users,
  Building2 as HomeIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import AppShell from '@/components/layout/AppShell';
import { getBusinessModuleCount, getBusinessModules, getBusinessType, type BusinessTypeCode } from '@/config/businessTypes';

const loading = () => <div className="flex min-h-72 items-center justify-center text-sm text-slate-500">Cargando espacio de trabajo...</div>;

const consoles: Record<BusinessTypeCode, ComponentType> = {
  gastronomy: dynamic(() => import('@/components/gastronomy/GastronomyWorkspaceConsole'), { loading }),
  retail_apparel: dynamic(() => import('@/components/products/RetailWorkspaceConsole'), { loading }),
  healthcare: dynamic(() => import('@/components/healthcare/HealthcareConsole'), { loading }),
  supermarket: dynamic(() => import('@/components/supermarket/SupermarketWorkspaceConsole'), { loading }),
  hardware_store: dynamic(() => import('@/components/hardware/HardwareWorkspaceConsole'), { loading }),
  automotive: dynamic(() => import('@/components/automotive/AutomotiveWorkspaceConsole'), { loading }),
  beauty_salon: dynamic(() => import('@/components/beauty/BeautyWorkspaceConsole'), { loading }),
  gym: dynamic(() => import('@/components/gym/GymConsole'), { loading }),
  electronics: dynamic(() => import('@/components/electronics/ElectronicsConsole'), { loading }),
  professional_services: dynamic(() => import('@/components/professional/ProfessionalConsole'), { loading }),
  pet_shop: dynamic(() => import('@/components/pet/PetConsole'), { loading }),
  real_estate: dynamic(() => import('@/components/realestate/RealEstateConsole'), { loading }),
  hotel_hospitality: dynamic(() => import('@/components/hotel/HotelConsole'), { loading }),
  education: dynamic(() => import('@/components/education/EducationConsole'), { loading }),
  laundry_dryclean: dynamic(() => import('@/components/laundry/LaundryConsole'), { loading }),
};

const icons: Record<string, LucideIcon> = {
  Activity, Briefcase, Calendar, Clock, CreditCard, FileCheck, FileText, GraduationCap,
  Heart, HomeIcon, Key, Laptop, Layers, Package, Play, RefreshCw, Scissors, Settings, ShieldCheck, Shirt, Sparkles,
  Utensils, Wrench, Users,
};

function getIcon(name: string) {
  return icons[name] ?? Package;
}

const retailAreasByLegacyPath: Record<string, string> = {
  '/products': 'catalog',
  '/fitting-room': 'fitting',
  '/returns': 'returns',
  '/loyalty': 'loyalty',
  '/collections': 'collections',
};

function getModuleHref(code: BusinessTypeCode, path: string, exclusive = false) {
  if (path.startsWith('/rubros/')) return path;
  if (code === 'retail_apparel' && retailAreasByLegacyPath[path]) {
    return `/rubros/${code}#${retailAreasByLegacyPath[path]}`;
  }
  if (exclusive) return `/rubros/${code}`;
  return `${path}?rubro=${code}`;
}

export default function RubroWorkspace({ code }: { code: BusinessTypeCode }) {
  const businessType = getBusinessType(code);
  const modules = getBusinessModules(code);
  const Console = consoles[code];

  return (
    <AppShell
      eyebrow="Espacio de trabajo"
      title={businessType.name}
      description={businessType.description}
      status={`${getBusinessModuleCount(code)} módulos disponibles`}
      businessTypeCode={code}
      contentClassName="max-w-none"
      actions={(
        <Link href="/" className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
          Todos los rubros
        </Link>
      )}
    >
      <div className="space-y-4" data-testid={`workspace-${code}`}>
        <nav className="scrollbar-none flex gap-2 overflow-x-auto pb-1" aria-label={`Módulos de ${businessType.name}`}>
          {modules.map((module) => {
            const Icon = getIcon(module.icon);
            return (
              <a
                key={`${module.path}-${module.label}`}
                href={getModuleHref(code, module.path, module.badge === 'Exclusivo')}
                className="flex min-w-48 shrink-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm hover:border-blue-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-slate-900">{module.label}</span>
                  <span className="block truncate text-[10px] text-slate-500">{module.desc}</span>
                </span>
              </a>
            );
          })}
        </nav>
        <section aria-label={`Consola operativa de ${businessType.name}`}>
          <Console key={code} />
        </section>
      </div>
    </AppShell>
  );
}
