'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import type { ComponentType } from 'react';
import { getBusinessType, type BusinessTypeCode } from '@/config/businessTypes';

export type ContextualModule = 'appointments' | 'products' | 'inventory' | 'contacts';

const loading = () => <div className="flex min-h-72 items-center justify-center text-sm text-slate-500">Cargando modulo aislado...</div>;
const Healthcare = dynamic(() => import('@/components/healthcare/HealthcareConsole'), { loading });
const Gastronomy = dynamic(() => import('@/components/gastronomy/GastronomyWorkspaceConsole'), { loading });
const Retail = dynamic(() => import('@/components/products/RetailWorkspaceConsole'), { loading });
const Supermarket = dynamic(() => import('@/components/supermarket/SupermarketWorkspaceConsole'), { loading });
const Hardware = dynamic(() => import('@/components/hardware/HardwareWorkspaceConsole'), { loading });
const Automotive = dynamic(() => import('@/components/automotive/AutomotiveWorkspaceConsole'), { loading });
const Beauty = dynamic(() => import('@/components/beauty/BeautyWorkspaceConsole'), { loading });
const Gym = dynamic(() => import('@/components/gym/GymConsole'), { loading });
const Electronics = dynamic(() => import('@/components/electronics/ElectronicsConsole'), { loading });
const Professional = dynamic(() => import('@/components/professional/ProfessionalConsole'), { loading });
const Pet = dynamic(() => import('@/components/pet/PetConsole'), { loading });
const RealEstate = dynamic(() => import('@/components/realestate/RealEstateConsole'), { loading });
const Hotel = dynamic(() => import('@/components/hotel/HotelConsole'), { loading });
const Education = dynamic(() => import('@/components/education/EducationConsole'), { loading });
const Laundry = dynamic(() => import('@/components/laundry/LaundryConsole'), { loading });

const ownConsole: Record<BusinessTypeCode, ComponentType> = {
  gastronomy: Gastronomy,
  retail_apparel: Retail,
  healthcare: Healthcare,
  supermarket: Supermarket,
  hardware_store: Hardware,
  automotive: Automotive,
  beauty_salon: Beauty,
  gym: Gym,
  electronics: Electronics,
  professional_services: Professional,
  pet_shop: Pet,
  real_estate: RealEstate,
  hotel_hospitality: Hotel,
  education: Education,
  laundry_dryclean: Laundry,
};

const moduleSupport: Record<ContextualModule, BusinessTypeCode[]> = {
  appointments: ['healthcare', 'automotive', 'beauty_salon', 'professional_services', 'pet_shop', 'real_estate', 'hotel_hospitality', 'education'],
  products: ['gastronomy', 'retail_apparel', 'supermarket', 'hardware_store', 'automotive', 'beauty_salon', 'electronics', 'pet_shop', 'real_estate'],
  inventory: ['gastronomy', 'retail_apparel', 'supermarket', 'hardware_store', 'automotive', 'beauty_salon', 'gym', 'electronics', 'pet_shop', 'laundry_dryclean'],
  contacts: ['gastronomy', 'retail_apparel', 'healthcare', 'supermarket', 'hardware_store', 'automotive', 'beauty_salon', 'gym', 'professional_services', 'pet_shop', 'real_estate', 'hotel_hospitality', 'education', 'laundry_dryclean'],
};

function IsolationNotice({ module, businessTypeCode }: { module: ContextualModule; businessTypeCode?: BusinessTypeCode }) {
  const business = businessTypeCode ? getBusinessType(businessTypeCode) : null;
  return <div className="flex min-h-72 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-6 text-center" data-testid="module-isolation-notice">
    <div className="max-w-lg"><ShieldX className="mx-auto h-8 w-8 text-blue-700" /><h2 className="mt-3 font-bold text-slate-900">Datos protegidos por rubro</h2><p className="mt-2 text-sm leading-6 text-slate-600">{business ? `El modulo ${module} no esta habilitado para ${business.name}. No se cargaron datos de otro rubro.` : 'Selecciona primero un rubro para abrir sus datos. Los catalogos y operaciones no se comparten entre actividades.'}</p><Link href={businessTypeCode ? `/rubros/${businessTypeCode}` : '/'} className="mt-4 inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-bold text-white">{business ? `Volver a ${business.name}` : 'Seleccionar rubro'}</Link></div>
  </div>;
}

export default function ContextualModuleConsole({ module, businessTypeCode }: { module: ContextualModule; businessTypeCode?: BusinessTypeCode }) {
  if (!businessTypeCode || !moduleSupport[module].includes(businessTypeCode)) return <IsolationNotice module={module} businessTypeCode={businessTypeCode} />;
  const Console = ownConsole[businessTypeCode];
  return <div data-business-type={businessTypeCode} data-contextual-module={module}><Console key={`${businessTypeCode}:${module}`} /></div>;
}
