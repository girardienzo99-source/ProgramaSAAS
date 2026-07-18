'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Barcode,
  Briefcase,
  Building,
  Calendar,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CreditCard,
  DollarSign,
  FileCheck,
  FileText,
  GraduationCap,
  Grid3X3,
  HardHat,
  Heart,
  Home,
  Key,
  Laptop,
  LayoutDashboard,
  Package,
  RefreshCw,
  Search,
  Scissors,
  Settings,
  ShieldCheck,
  Shield,
  Shirt,
  Sparkles,
  Users,
  Utensils,
  Wrench,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getBusinessNavigation, getBusinessType, type BusinessTypeCode } from '@/config/businessTypes';

const navigationIcons: Record<string, LucideIcon> = {
  Activity,
  Barcode,
  Briefcase,
  Building,
  Calendar,
  CalendarDays,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  GraduationCap,
  Grid: Grid3X3,
  HardHat,
  Heart,
  Home,
  Key,
  Laptop,
  LayoutDashboard,
  Package,
  RefreshCw,
  Scissors,
  Settings,
  Shield,
  Shirt,
  Sparkles,
  Users,
  Utensils,
  Wrench,
};

const isolatedWorkspaceTargets: Partial<Record<BusinessTypeCode, Partial<Record<string, string>>>> = {
  gastronomy: { '/pos': '/rubros/gastronomy#salon', '/products': '/rubros/gastronomy#menu', '/inventory': '/rubros/gastronomy#ingredients', '/appointments': '/rubros/gastronomy#salon' },
  retail_apparel: { '/pos': '/rubros/retail_apparel#catalog', '/products': '/rubros/retail_apparel#catalog', '/inventory': '/rubros/retail_apparel#catalog', '/contacts': '/rubros/retail_apparel#loyalty' },
  supermarket: { '/pos': '/rubros/supermarket#pos', '/products': '/rubros/supermarket#catalog', '/inventory': '/rubros/supermarket#inventory' },
  hardware_store: { '/pos': '/rubros/hardware_store#operation', '/products': '/rubros/hardware_store#catalog', '/inventory': '/rubros/hardware_store#stock', '/contacts': '/rubros/hardware_store#suppliers' },
  automotive: { '/pos': '/rubros/automotive#workshop', '/products': '/rubros/automotive#parts', '/inventory': '/rubros/automotive#parts', '/appointments': '/rubros/automotive#workshop' },
  beauty_salon: { '/pos': '/rubros/beauty_salon#agenda', '/products': '/rubros/beauty_salon#products', '/inventory': '/rubros/beauty_salon#products', '/appointments': '/rubros/beauty_salon#agenda' },
};

function getIsolatedHref(code: BusinessTypeCode | undefined, href: string) {
  if (!code) return href;
  if (href.startsWith('/rubros/')) return href;
  if (href === '/billing') return `${href}?rubro=${code}`;
  if (href === '/dashboard') return `/rubros/${code}`;
  return isolatedWorkspaceTargets[code]?.[href] ?? `/rubros/${code}`;
}

function getPrimaryNavigation(code: BusinessTypeCode | undefined) {
  if (!code) return [];
  const navigation = getBusinessNavigation(code).map((item) => ({
    href: item.path,
    label: item.label,
    icon: navigationIcons[item.icon] ?? LayoutDashboard,
  }));
  return [...navigation, { href: '/billing', label: 'ARCA', icon: CreditCard }];
}

interface AppShellProps {
  children: ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
  status?: string;
  info?: string;
  actions?: ReactNode;
  contentClassName?: string;
  businessTypeCode?: BusinessTypeCode;
}

export default function AppShell({
  children,
  title,
  description,
  eyebrow = 'Plataforma SaaS',
  status = 'Empresa Demo',
  info,
  actions,
  contentClassName = '',
  businessTypeCode,
}: AppShellProps) {
  const pathname = usePathname();
  const businessType = businessTypeCode ? getBusinessType(businessTypeCode) : null;
  const primaryNavigation = getPrimaryNavigation(businessTypeCode);

  return (
    <div className="app-theme min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Ir al inicio">
            <span className="ui-brand-mark flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
              S
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-extrabold text-slate-900">SaaS Gestión</span>
              <span className="block text-[10px] font-medium text-slate-500">ERP multirubro</span>
            </span>
          </Link>

          <nav className="scrollbar-none hidden min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto lg:flex" aria-label="Navegación principal">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={getIsolatedHref(businessTypeCode, item.href)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 md:flex"
              aria-label="Abrir búsqueda rápida"
              title="Buscar"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            >
              <Search className="h-4 w-4" />
            </button>
            <Link
              href="/admin-portal"
              aria-label={`Abrir administración: ${status}`}
              className="flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">{status}</span>
            </Link>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="Ayuda">
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="scrollbar-none flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden" aria-label="Navegación móvil">
          {primaryNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={getIsolatedHref(businessTypeCode, item.href)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>

      <main>
        {businessType && (
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-4 py-2 text-xs sm:px-6">
              <span className="font-medium text-slate-500">Rubro activo</span>
              <Link href={`/rubros/${businessType.code}`} className="font-bold text-blue-700 hover:underline">
                {businessType.name}
              </Link>
            </div>
          </div>
        )}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>{eyebrow}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-blue-700">{title}</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">{description}</p>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </div>

        {info && (
          <div className="border-b border-blue-100 bg-blue-50/70">
            <div className="mx-auto flex max-w-[1500px] items-start gap-2 px-4 py-2.5 text-xs leading-5 text-blue-900 sm:px-6">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span>{info}</span>
            </div>
          </div>
        )}

        <div className={`mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 ${contentClassName}`}>{children}</div>
      </main>
    </div>
  );
}
