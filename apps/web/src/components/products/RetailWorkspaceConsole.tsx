'use client';

import dynamic from 'next/dynamic';
import { Gift, PackageSearch, RotateCcw, Ruler, Tags, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';

type RetailArea = 'catalog' | 'fitting' | 'returns' | 'loyalty' | 'collections';

const areas: Array<{ code: RetailArea; label: string; icon: LucideIcon }> = [
  { code: 'catalog', label: 'Catálogo', icon: PackageSearch },
  { code: 'fitting', label: 'Probador', icon: Ruler },
  { code: 'returns', label: 'Cambios y devoluciones', icon: RotateCcw },
  { code: 'loyalty', label: 'Fidelización', icon: Gift },
  { code: 'collections', label: 'Colecciones', icon: Tags },
];

const loading = () => <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Cargando módulo...</div>;
const areaComponents: Record<RetailArea, ComponentType> = {
  catalog: dynamic(() => import('./ProductCatalog'), { loading }),
  fitting: dynamic(() => import('./FittingRoomConsole'), { loading }),
  returns: dynamic(() => import('./ReturnsConsole'), { loading }),
  loyalty: dynamic(() => import('./LoyaltyConsole'), { loading }),
  collections: dynamic(() => import('./CollectionsConsole'), { loading }),
};

export default function RetailWorkspaceConsole() {
  const [activeArea, setActiveArea] = useState<RetailArea>('catalog');
  const ActiveArea = areaComponents[activeArea];

  useEffect(() => {
    const syncFromHash = () => {
      const area = window.location.hash.slice(1);
      if (areas.some((item) => item.code === area)) setActiveArea(area as RetailArea);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const selectArea = (area: RetailArea) => {
    setActiveArea(area);
    window.history.replaceState(null, '', `#${area}`);
  };

  return (
    <div className="space-y-4">
      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Herramientas de indumentaria">
        {areas.map((area) => {
          const Icon = area.icon;
          const active = activeArea === area.code;
          return (
            <button
              key={area.code}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectArea(area.code)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {area.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        <ActiveArea />
      </div>
    </div>
  );
}
