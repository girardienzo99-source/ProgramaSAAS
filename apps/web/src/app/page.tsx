'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Briefcase,
  Calendar,
  Clock,
  GraduationCap,
  Heart,
  Key,
  Laptop,
  Package,
  Scissors,
  Search,
  Settings,
  Shirt,
  Sparkles,
  Utensils,
  Wrench,
  Building2 as HomeIcon,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { BUSINESS_TYPES } from '@/config/businessTypes';

const icons: Record<string, LucideIcon> = {
  Activity, Briefcase, Calendar, Clock, GraduationCap, Heart, HomeIcon, Key,
  Laptop, Package, Scissors, Settings, Shirt, Utensils, Wrench,
};

function getIcon(name: string) {
  return icons[name] ?? Package;
}

export default function Home() {
  const [search, setSearch] = useState('');
  const filteredBusinessTypes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-AR');
    if (!term) return BUSINESS_TYPES;
    return BUSINESS_TYPES.filter((businessType) =>
      `${businessType.name} ${businessType.fullName} ${businessType.description}`.toLocaleLowerCase('es-AR').includes(term),
    );
  }, [search]);

  return (
    <AppShell
      eyebrow="Inicio"
      title="Espacios de trabajo"
      description="Elegí el rubro de tu empresa para abrir una consola con navegación, procesos y módulos propios."
      status="Entorno seguro"
    >
      <section aria-labelledby="business-types-title" data-testid="business-type-selector">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h2 id="business-types-title">Seleccioná un rubro</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">15 configuraciones operativas con acceso directo y módulos específicos.</p>
          </div>
          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Buscar rubro</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por actividad..."
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {filteredBusinessTypes.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBusinessTypes.map((businessType) => {
              const Icon = getIcon(businessType.icon);
              return (
                <Link
                  key={businessType.code}
                  href={`/rubros/${businessType.code}`}
                  className="group flex min-h-40 flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                  data-testid={`business-type-${businessType.code}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-slate-50 ${businessType.color}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        {businessType.activatedModules.length} módulos
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-extrabold text-slate-900 group-hover:text-blue-700">{businessType.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">{businessType.description}</p>
                  </div>
                  <span className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-700">
                    Abrir espacio <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border-y border-slate-200 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No encontramos ese rubro.</p>
            <button type="button" onClick={() => setSearch('')} className="mt-2 text-xs font-bold text-blue-700 hover:underline">
              Ver todos los espacios
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
