'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  Boxes, LayoutDashboard, PackageSearch, Search, Shield, ShoppingCart, Users, X, Receipt,
  Utensils, ShoppingBag, Stethoscope, Car, Dumbbell, Dog, Shirt, Home, GraduationCap,
  Hotel, Scissors, Briefcase, Cpu, Wrench, Sparkles
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

const commands = [
  { label: 'Ir al resumen BI & Estadísticas', route: '/dashboard', icon: LayoutDashboard },
  { label: 'Punto de Venta POS Universal', route: '/pos', icon: ShoppingCart },
  { label: 'Facturación Electrónica ARCA', route: '/billing', icon: Receipt },
  { label: 'Catálogo de Productos', route: '/products', icon: PackageSearch },
  { label: 'Control de Stock e Inventario', route: '/inventory', icon: Boxes },
  { label: 'Espacio Gastronomía (Salón / KDS)', route: '/rubros/gastronomy', icon: Utensils },
  { label: 'Espacio Supermercados & Góndolas', route: '/rubros/supermarket', icon: ShoppingBag },
  { label: 'Espacio Salud & Historia Clínica', route: '/rubros/healthcare', icon: Stethoscope },
  { label: 'Espacio Taller Mecánico & Mantenimiento', route: '/rubros/automotive', icon: Car },
  { label: 'Espacio Gimnasios & Socios', route: '/rubros/gym', icon: Dumbbell },
  { label: 'Espacio Veterinaria & Pet Shop', route: '/rubros/pet_shop', icon: Dog },
  { label: 'Espacio Lavandería & Tintorería', route: '/rubros/laundry_dryclean', icon: Shirt },
  { label: 'Espacio Inmobiliaria & Alquileres', route: '/rubros/real_estate', icon: Home },
  { label: 'Espacio Educación & Academias', route: '/rubros/education', icon: GraduationCap },
  { label: 'Espacio Hotelería & Reservas', route: '/rubros/hotel_hospitality', icon: Hotel },
  { label: 'Espacio Estética & Peluquerías', route: '/rubros/beauty_salon', icon: Scissors },
  { label: 'Espacio Servicios Profesionales', route: '/rubros/professional_services', icon: Briefcase },
  { label: 'Espacio Reparación de Electrónica', route: '/rubros/electronics', icon: Cpu },
  { label: 'Espacio Ferretería & Corralón', route: '/rubros/hardware_store', icon: Wrench },
  { label: 'Espacio Moda & Probador Virtual', route: '/rubros/retail_apparel', icon: Sparkles },
  { label: 'Control de Plataforma & Auditoría', route: '/admin-portal', icon: Shield },
];

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-AR');
    return term ? commands.filter((command) => command.label.toLocaleLowerCase('es-AR').includes(term)) : commands;
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-20 backdrop-blur-sm" role="presentation">
      <section className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Búsqueda rápida">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="search"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            placeholder="Buscar una sección o acción..."
          />
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length > 0 ? filteredCommands.map((command) => (
            <button
              key={`${command.route}-${command.label}`}
              type="button"
              onClick={() => { onNavigate(command.route); onClose(); }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800"
            >
              <command.icon className="h-4 w-4 text-blue-600" />
              {command.label}
            </button>
          )) : (
            <p className="px-3 py-10 text-center text-sm text-slate-500">No encontramos acciones con ese nombre.</p>
          )}
        </div>
      </section>
    </div>
  );
}
