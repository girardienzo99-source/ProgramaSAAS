'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Boxes,
  Camera,
  ChefHat,
  CircleDollarSign,
  Image as ImageIcon,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type { Product } from '@programa-sass/shared-types';
import { apiFetch, uploadCatalogImage } from '@/lib/client/apiFetch';
import SalonConsole from './SalonConsole';
import GastronomyPurchasesConsole from './GastronomyPurchasesConsole';

type Area = 'salon' | 'menu' | 'ingredients' | 'recipes' | 'purchases';
type MenuStatus = 'all' | 'active' | 'paused' | 'low';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  vatRate: number;
  active: boolean;
  imageUrl: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  costPerUnit: number;
  supplier: string;
}

interface RecipeLine {
  ingredientId: string;
  quantity: number;
}

interface Recipe {
  productId: string;
  portions: number;
  lines: RecipeLine[];
}

const INITIAL_MENU: MenuItem[] = [
  { id: 'g1', name: 'Pizza Muzarella Grande', description: 'Masa artesanal, salsa y muzarella.', category: 'Principales', sku: 'GAS-001', price: 12500, cost: 4500, stock: 28, minStock: 8, vatRate: 21, active: true, imageUrl: null },
  { id: 'g2', name: 'Hamburguesa Doble Cheddar', description: 'Doble medallon, cheddar y papas.', category: 'Principales', sku: 'GAS-002', price: 9500, cost: 3800, stock: 16, minStock: 8, vatRate: 21, active: true, imageUrl: null },
  { id: 'g3', name: 'Cerveza Patagonia IPA 500ml', description: 'Botella individual fria.', category: 'Bebidas', sku: 'GAS-003', price: 4200, cost: 1500, stock: 7, minStock: 12, vatRate: 21, active: true, imageUrl: null },
  { id: 'g4', name: 'Gaseosa Cola 350ml', description: 'Lata individual.', category: 'Bebidas', sku: 'GAS-004', price: 2500, cost: 800, stock: 34, minStock: 12, vatRate: 21, active: true, imageUrl: null },
  { id: 'g5', name: 'Flan Casero con Dulce', description: 'Porcion individual con dulce de leche.', category: 'Postres', sku: 'GAS-005', price: 3500, cost: 1000, stock: 9, minStock: 6, vatRate: 10.5, active: true, imageUrl: null },
  { id: 'g6', name: 'Cafe Cortado', description: 'Cafe espresso y leche vaporizada.', category: 'Cafeteria', sku: 'GAS-006', price: 2200, cost: 600, stock: 40, minStock: 10, vatRate: 10.5, active: true, imageUrl: null },
];

const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'i1', name: 'Harina 000', unit: 'kg', stock: 18, minStock: 8, costPerUnit: 1100, supplier: 'Molino Central' },
  { id: 'i2', name: 'Muzarella', unit: 'kg', stock: 6.2, minStock: 5, costPerUnit: 8900, supplier: 'Lacteos Sur' },
  { id: 'i3', name: 'Salsa de tomate', unit: 'kg', stock: 4, minStock: 4.5, costPerUnit: 2600, supplier: 'Mercado Norte' },
  { id: 'i4', name: 'Medallon de carne', unit: 'unidad', stock: 42, minStock: 30, costPerUnit: 1150, supplier: 'Frigorifico Uno' },
  { id: 'i5', name: 'Cheddar', unit: 'feta', stock: 55, minStock: 40, costPerUnit: 260, supplier: 'Lacteos Sur' },
  { id: 'i6', name: 'Papas', unit: 'kg', stock: 9, minStock: 10, costPerUnit: 1400, supplier: 'Mercado Norte' },
  { id: 'i7', name: 'Cafe en grano', unit: 'kg', stock: 2.4, minStock: 1.5, costPerUnit: 18500, supplier: 'Cafe Federal' },
  { id: 'i8', name: 'Leche', unit: 'litro', stock: 11, minStock: 8, costPerUnit: 1600, supplier: 'Lacteos Sur' },
];

const INITIAL_RECIPES: Recipe[] = [
  { productId: 'g1', portions: 1, lines: [{ ingredientId: 'i1', quantity: 0.35 }, { ingredientId: 'i2', quantity: 0.3 }, { ingredientId: 'i3', quantity: 0.18 }] },
  { productId: 'g2', portions: 1, lines: [{ ingredientId: 'i4', quantity: 2 }, { ingredientId: 'i5', quantity: 2 }, { ingredientId: 'i6', quantity: 0.25 }] },
  { productId: 'g6', portions: 1, lines: [{ ingredientId: 'i7', quantity: 0.018 }, { ingredientId: 'i8', quantity: 0.08 }] },
];

const EMPTY_ITEM: MenuItem = { id: '', name: '', description: '', category: 'Principales', sku: '', price: 0, cost: 0, stock: 0, minStock: 0, vatRate: 21, active: true, imageUrl: null };
const EMPTY_INGREDIENT: Ingredient = { id: '', name: '', unit: 'kg', stock: 0, minStock: 0, costPerUnit: 0, supplier: '' };

const money = (value: number) => `$${Math.round(value).toLocaleString('es-AR')}`;
const quantity = (value: number) => Number(value.toFixed(3));

function toProduct(item: MenuItem): Product {
  return {
    id: item.id,
    company_id: 'c-test',
    name: item.name,
    description: item.description,
    sku: item.sku,
    barcode: null,
    price: item.price,
    cost: item.cost,
    vat_rate: item.vatRate,
    is_service: false,
    stock_control: true,
    image_url: item.imageUrl,
    extra_attributes: { rubro: 'gastronomy', category: item.category, stock: item.stock },
    created_at: '',
    updated_at: '',
  };
}

export default function GastronomyWorkspaceConsole() {
  const [area, setArea] = useState<Area>('salon');
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MenuStatus>('all');
  const [category, setCategory] = useState('Todas');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState('g1');
  const [feedback, setFeedback] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const syncArea = () => {
      const hash = window.location.hash.slice(1) as Area;
      if (['salon', 'menu', 'ingredients', 'recipes', 'purchases'].includes(hash)) setArea(hash);
    };
    syncArea();
    window.addEventListener('hashchange', syncArea);
    return () => window.removeEventListener('hashchange', syncArea);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ items: MenuItem[] }>('/api/rubros/gastronomy/catalog'),
      apiFetch<{ items: Ingredient[] }>('/api/rubros/gastronomy/ingredients'),
      apiFetch<{ items: Recipe[] }>('/api/rubros/gastronomy/recipes'),
    ])
      .then(([catalogResponse, ingredientResponse, recipeResponse]) => {
        if (!active) return;
        if (catalogResponse.items.length) {
          setMenu(catalogResponse.items);
          setSelectedRecipeProduct((current) => catalogResponse.items.some((item) => item.id === current)
            ? current
            : catalogResponse.items[0].id);
        }
        setIngredients(ingredientResponse.items);
        setRecipes(recipeResponse.items);
      })
      .catch((error: unknown) => {
        if (active) setFeedback(error instanceof Error ? error.message : 'No se pudieron sincronizar los datos gastronomicos.');
      });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(menu.map((item) => item.category)))], [menu]);
  const visibleMenu = useMemo(() => menu.filter((item) => {
    const matchesSearch = `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'Todas' || item.category === category;
    const matchesStatus = status === 'all' || (status === 'active' && item.active) || (status === 'paused' && !item.active) || (status === 'low' && item.stock <= item.minStock);
    return matchesSearch && matchesCategory && matchesStatus;
  }), [category, menu, search, status]);

  const activeProducts = useMemo(() => menu.filter((item) => item.active && item.stock > 0).map(toProduct), [menu]);
  const lowMenu = menu.filter((item) => item.stock <= item.minStock).length;
  const lowIngredients = ingredients.filter((item) => item.stock <= item.minStock).length;
  const menuValue = menu.reduce((sum, item) => sum + item.stock * item.cost, 0);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3000);
  };

  const navigate = (next: Area) => {
    setArea(next);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
  };

  const saveItem = async () => {
    if (!editingItem?.name.trim()) return;
    const isNew = !editingItem.id;
    const draft = {
      ...editingItem,
      sku: editingItem.sku.trim() || `GAS-${String(menu.length + 1).padStart(3, '0')}`,
    };
    setSyncing(true);
    try {
      const response = await apiFetch<{ item: MenuItem }>('/api/rubros/gastronomy/catalog', {
        method: 'POST',
        body: JSON.stringify({ ...draft, id: draft.id || undefined }),
      });
      const saved = response.item;
      setMenu((current) => isNew ? [saved, ...current] : current.map((item) => item.id === saved.id ? saved : item));
      setEditingItem(null);
      showFeedback(isNew ? 'Producto agregado a la carta.' : 'Producto actualizado.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo guardar el producto.');
    } finally {
      setSyncing(false);
    }
  };

  const persistIngredient = async (draft: Ingredient) => {
    const response = await apiFetch<{ item: Ingredient }>('/api/rubros/gastronomy/ingredients', {
      method: 'POST',
      body: JSON.stringify({ ...draft, id: draft.id || undefined }),
    });
    return response.item;
  };

  const saveIngredient = async () => {
    if (!editingIngredient?.name.trim()) return;
    const isNew = !editingIngredient.id;
    setSyncing(true);
    try {
      const saved = await persistIngredient(editingIngredient);
      setIngredients((current) => isNew ? [saved, ...current] : current.map((item) => item.id === saved.id ? saved : item));
      setEditingIngredient(null);
      showFeedback(isNew ? 'Insumo agregado al inventario.' : 'Insumo actualizado.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo guardar el insumo.');
    } finally {
      setSyncing(false);
    }
  };

  const adjustIngredientStock = async (ingredient: Ingredient, amount: number) => {
    setSyncing(true);
    try {
      const saved = await persistIngredient({ ...ingredient, stock: quantity(Math.max(0, ingredient.stock + amount)) });
      setIngredients((current) => current.map((item) => item.id === saved.id ? saved : item));
      showFeedback(`Stock de ${saved.name} actualizado.`);
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo actualizar el stock.');
    } finally {
      setSyncing(false);
    }
  };

  const refreshIngredients = async () => {
    const response = await apiFetch<{ items: Ingredient[] }>('/api/rubros/gastronomy/ingredients');
    setIngredients(response.items);
  };

  const toggleItem = async (item: MenuItem) => {
    setSyncing(true);
    try {
      const response = await apiFetch<{ item: MenuItem }>('/api/rubros/gastronomy/catalog', {
        method: 'POST',
        body: JSON.stringify({ ...item, active: !item.active }),
      });
      setMenu((current) => current.map((candidate) => candidate.id === item.id ? response.item : candidate));
      showFeedback(response.item.active ? 'Producto habilitado para la venta.' : 'Producto pausado.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo cambiar el estado del producto.');
    } finally {
      setSyncing(false);
    }
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingItem) return;
    setSyncing(true);
    try {
      const imageUrl = await uploadCatalogImage(file, 'menu_items');
      setEditingItem((current) => current ? { ...current, imageUrl } : current);
      showFeedback('Imagen almacenada correctamente.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally {
      setSyncing(false);
    }
  };

  const commitOrder = async (order: { orderNumber: number }) => {
    setSyncing(true);
    try {
      const [catalogResponse, ingredientResponse] = await Promise.all([
        apiFetch<{ items: MenuItem[] }>('/api/rubros/gastronomy/catalog'),
        apiFetch<{ items: Ingredient[] }>('/api/rubros/gastronomy/ingredients'),
      ]);
      setMenu(catalogResponse.items);
      setIngredients(ingredientResponse.items);
      showFeedback(`Comanda #${order.orderNumber} enviada y stock descontado.`);
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'La comanda se envio, pero no se pudo refrescar el inventario.');
    } finally {
      setSyncing(false);
    }
  };

  const activeRecipe = recipes.find((recipe) => recipe.productId === selectedRecipeProduct);
  const recipeProduct = menu.find((item) => item.id === selectedRecipeProduct);
  const recipeCost = (activeRecipe?.lines ?? []).reduce((sum, line) => {
    const ingredient = ingredients.find((item) => item.id === line.ingredientId);
    return sum + (ingredient?.costPerUnit ?? 0) * line.quantity;
  }, 0) / (activeRecipe?.portions || 1);
  const margin = recipeProduct?.price ? ((recipeProduct.price - recipeCost) / recipeProduct.price) * 100 : 0;

  const updateRecipeLine = (ingredientId: string, value: number) => {
    setRecipes((current) => current.map((recipe) => recipe.productId === selectedRecipeProduct
      ? { ...recipe, lines: recipe.lines.map((line) => line.ingredientId === ingredientId ? { ...line, quantity: Math.max(0, value) } : line) }
      : recipe));
  };

  const addRecipeLine = () => {
    const recipe = recipes.find((item) => item.productId === selectedRecipeProduct);
    const available = ingredients.find((ingredient) => !recipe?.lines.some((line) => line.ingredientId === ingredient.id));
    if (!available) return;
    if (!recipe) {
      setRecipes((current) => [...current, { productId: selectedRecipeProduct, portions: 1, lines: [{ ingredientId: available.id, quantity: 0 }] }]);
    } else {
      setRecipes((current) => current.map((item) => item.productId === selectedRecipeProduct ? { ...item, lines: [...item.lines, { ingredientId: available.id, quantity: 0 }] } : item));
    }
  };

  const saveRecipe = async () => {
    const recipe = recipes.find((item) => item.productId === selectedRecipeProduct);
    if (!recipe || !recipe.lines.length || recipe.lines.some((line) => line.quantity <= 0)) {
      showFeedback('La receta necesita al menos un insumo con cantidad mayor a cero.');
      return;
    }
    setSyncing(true);
    try {
      const response = await apiFetch<{ item: Recipe }>('/api/rubros/gastronomy/recipes', {
        method: 'POST',
        body: JSON.stringify(recipe),
      });
      setRecipes((current) => current.map((item) => item.productId === response.item.productId ? response.item : item));
      showFeedback('Receta y consumo por porcion guardados.');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'No se pudo guardar la receta.');
    } finally {
      setSyncing(false);
    }
  };

  const tabs: Array<{ id: Area; label: string; icon: typeof ChefHat }> = [
    { id: 'salon', label: 'Salon y comandas', icon: UtensilsCrossed },
    { id: 'menu', label: 'Carta y precios', icon: ChefHat },
    { id: 'ingredients', label: 'Insumos y stock', icon: Boxes },
    { id: 'recipes', label: 'Recetas y costos', icon: CircleDollarSign },
    { id: 'purchases', label: 'Compras y proveedores', icon: Truck },
  ];

  return (
    <div className="space-y-4" data-testid="gastronomy-workspace">
      {syncing && <div role="status" className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">Sincronizando datos gastronomicos...</div>}
      {feedback && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{feedback}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Productos activos" value={String(menu.filter((item) => item.active).length)} detail={`${menu.length} productos cargados`} />
        <Metric label="Alertas de carta" value={String(lowMenu)} detail="Productos con stock bajo" warning={lowMenu > 0} />
        <Metric label="Alertas de insumos" value={String(lowIngredients)} detail="Requieren reposicion" warning={lowIngredients > 0} />
        <Metric label="Capital en stock" value={money(menuValue)} detail="Valuado a costo" />
      </div>

      <div className="overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Gestion gastronomica">
        <div className="flex min-w-max gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={area === id} onClick={() => navigate(id)} className={`flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${area === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {area === 'salon' && <SalonConsole products={activeProducts} onOrderCommitted={commitOrder} />}

      {area === 'menu' && (
        <section className="space-y-4" aria-label="Carta de productos">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, SKU o categoria" className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
            </label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm">
              {categories.map((value) => <option key={value}>{value}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as MenuStatus)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="all">Todos los estados</option><option value="active">Activos</option><option value="paused">Pausados</option><option value="low">Stock bajo</option>
            </select>
            <button onClick={() => setEditingItem({ ...EMPTY_ITEM })} className="flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Nuevo producto</button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleMenu.map((item) => {
              const low = item.stock <= item.minStock;
              const itemMargin = item.price ? ((item.price - item.cost) / item.price) * 100 : 0;
              return (
                <article key={item.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex h-32 items-center justify-center bg-slate-100">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-9 w-9 text-slate-300" />}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-bold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.category} · {item.sku}</p></div>
                      <button onClick={() => setEditingItem({ ...item })} aria-label={`Editar ${item.name}`} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs"><Value label="Precio" value={money(item.price)} /><Value label="Costo" value={money(item.cost)} /><Value label="Margen" value={`${itemMargin.toFixed(0)}%`} /></div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className={low ? 'font-bold text-amber-700' : 'font-semibold text-slate-700'}>{low && <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />}Stock: {item.stock}</span>
                      <button onClick={() => void toggleItem(item)} className={`rounded-full px-2 py-1 font-bold ${item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{item.active ? 'Activo' : 'Pausado'}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!visibleMenu.length && <EmptyState text="No hay productos que coincidan con los filtros." />}
        </section>
      )}

      {area === 'ingredients' && (
        <section className="space-y-4" aria-label="Inventario de insumos">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Materias primas e insumos</h2><p className="text-sm text-slate-500">Costos, proveedores y puntos de reposicion.</p></div><button onClick={() => setEditingIngredient({ ...EMPTY_INGREDIENT })} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"><PackagePlus className="h-4 w-4" />Nuevo insumo</button></div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Insumo</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Existencia</th><th className="px-4 py-3">Minimo</th><th className="px-4 py-3">Costo unitario</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ingredients.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-900">{item.name}</td><td className="px-4 py-3 text-slate-600">{item.supplier || 'Sin asignar'}</td><td className={`px-4 py-3 font-bold ${item.stock <= item.minStock ? 'text-amber-700' : 'text-slate-900'}`}>{item.stock} {item.unit}</td><td className="px-4 py-3 text-slate-600">{item.minStock} {item.unit}</td><td className="px-4 py-3 text-slate-700">{money(item.costPerUnit)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => void adjustIngredientStock(item, 1)} aria-label={`Sumar stock de ${item.name}`} className="rounded-md border border-slate-200 p-2 text-emerald-700"><Plus className="h-4 w-4" /></button><button onClick={() => setEditingIngredient({ ...item })} aria-label={`Editar ${item.name}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button></div></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {area === 'recipes' && (
        <section className="grid gap-4 xl:grid-cols-[300px_1fr]" aria-label="Recetas y costos">
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="mb-3 font-bold text-slate-900">Productos de la carta</h2><div className="space-y-1">{menu.map((item) => <button key={item.id} onClick={() => setSelectedRecipeProduct(item.id)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedRecipeProduct === item.id ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}><span className="truncate">{item.name}</span><span className="text-xs">{recipes.some((recipe) => recipe.productId === item.id) ? 'Configurada' : 'Sin receta'}</span></button>)}</div></div>
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase text-blue-600">Ficha de costo</p><h2 className="text-lg font-bold text-slate-900">{recipeProduct?.name}</h2></div><div className="grid grid-cols-3 gap-4"><Value label="Precio" value={money(recipeProduct?.price ?? 0)} /><Value label="Costo receta" value={money(recipeCost)} /><Value label="Margen" value={`${margin.toFixed(1)}%`} /></div></div>
            <div className="flex flex-wrap items-end justify-between gap-3 border-y border-slate-100 py-3"><label className="w-36"><FieldLabel text="Porciones base" /><input type="number" min="0.001" step="0.001" value={activeRecipe?.portions ?? 1} onChange={(event) => setRecipes((current) => current.map((recipe) => recipe.productId === selectedRecipeProduct ? { ...recipe, portions: Math.max(0.001, Number(event.target.value)) } : recipe))} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label><button onClick={() => void saveRecipe()} disabled={!activeRecipe?.lines.length || activeRecipe.lines.some((line) => line.quantity <= 0)} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" />Guardar receta</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="border-y border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Insumo</th><th className="px-3 py-2">Cantidad</th><th className="px-3 py-2">Costo</th><th className="px-3 py-2"></th></tr></thead><tbody className="divide-y divide-slate-100">{(activeRecipe?.lines ?? []).map((line) => { const ingredient = ingredients.find((item) => item.id === line.ingredientId); return <tr key={line.ingredientId}><td className="px-3 py-3 font-semibold text-slate-900">{ingredient?.name}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><input type="number" min="0" step="0.001" value={line.quantity} onChange={(event) => updateRecipeLine(line.ingredientId, Number(event.target.value))} className="h-8 w-28 rounded-md border border-slate-300 px-2" /><span className="text-slate-500">{ingredient?.unit}</span></div></td><td className="px-3 py-3 font-semibold">{money((ingredient?.costPerUnit ?? 0) * line.quantity)}</td><td className="px-3 py-3 text-right"><button onClick={() => setRecipes((current) => current.map((recipe) => recipe.productId === selectedRecipeProduct ? { ...recipe, lines: recipe.lines.filter((candidate) => candidate.ingredientId !== line.ingredientId) } : recipe))} aria-label={`Quitar ${ingredient?.name}`} className="p-2 text-rose-600"><Trash2 className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div>
            <button onClick={addRecipeLine} className="flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700"><Plus className="h-4 w-4" />Agregar insumo</button>
          </div>
        </section>
      )}

      {area === 'purchases' && <GastronomyPurchasesConsole ingredients={ingredients} onInventoryChanged={refreshIngredients} />}

      {editingItem && <ItemEditor item={editingItem} setItem={setEditingItem} onSave={saveItem} onImage={uploadImage} onClose={() => setEditingItem(null)} />}
      {editingIngredient && <IngredientEditor item={editingIngredient} setItem={setEditingIngredient} onSave={saveIngredient} onClose={() => setEditingIngredient(null)} />}
    </div>
  );
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${warning ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Value({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-bold text-slate-900">{value}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-500">{text}</div>;
}

function ItemEditor({ item, setItem, onSave, onImage, onClose }: { item: MenuItem; setItem: (item: MenuItem | null) => void; onSave: () => void; onImage: (event: ChangeEvent<HTMLInputElement>) => void; onClose: () => void }) {
  const numberField = (key: 'price' | 'cost' | 'stock' | 'minStock' | 'vatRate', value: string) => setItem({ ...item, [key]: Math.max(0, Number(value)) });
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Editor de producto"><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase text-blue-600">Carta gastronomica</p><h2 className="font-bold text-slate-900">{item.id ? 'Editar producto' : 'Nuevo producto'}</h2></div><button onClick={onClose} aria-label="Cerrar" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="sm:col-span-2"><FieldLabel text="Imagen del producto" /><div className="flex items-center gap-4"><div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">{item.imageUrl ? <img src={item.imageUrl} alt="Vista previa" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-slate-300" />}</div><label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"><Camera className="h-4 w-4" />Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} className="sr-only" /></label></div></label><TextField label="Nombre" value={item.name} onChange={(value) => setItem({ ...item, name: value })} wide /><TextField label="Descripcion" value={item.description} onChange={(value) => setItem({ ...item, description: value })} wide /><TextField label="Categoria" value={item.category} onChange={(value) => setItem({ ...item, category: value })} /><TextField label="SKU" value={item.sku} onChange={(value) => setItem({ ...item, sku: value })} /><NumberField label="Precio de venta" value={item.price} onChange={(value) => numberField('price', value)} /><NumberField label="Costo estimado" value={item.cost} onChange={(value) => numberField('cost', value)} /><NumberField label="Stock disponible" value={item.stock} onChange={(value) => numberField('stock', value)} /><NumberField label="Stock minimo" value={item.minStock} onChange={(value) => numberField('minStock', value)} /><NumberField label="IVA (%)" value={item.vatRate} onChange={(value) => numberField('vatRate', value)} /><label className="flex items-end"><span className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700">Disponible para vender<input type="checkbox" checked={item.active} onChange={(event) => setItem({ ...item, active: event.target.checked })} className="h-4 w-4 accent-blue-600" /></span></label></div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancelar</button><button onClick={onSave} disabled={!item.name.trim()} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar producto</button></div></div></div>;
}

function IngredientEditor({ item, setItem, onSave, onClose }: { item: Ingredient; setItem: (item: Ingredient | null) => void; onSave: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Editor de insumo"><div className="w-full max-w-xl rounded-t-lg bg-white shadow-xl sm:rounded-lg"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">{item.id ? 'Editar insumo' : 'Nuevo insumo'}</h2><button onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><TextField label="Nombre" value={item.name} onChange={(value) => setItem({ ...item, name: value })} wide /><TextField label="Unidad" value={item.unit} onChange={(value) => setItem({ ...item, unit: value })} /><TextField label="Proveedor" value={item.supplier} onChange={(value) => setItem({ ...item, supplier: value })} /><NumberField label="Stock actual" value={item.stock} onChange={(value) => setItem({ ...item, stock: Math.max(0, Number(value)) })} /><NumberField label="Punto de reposicion" value={item.minStock} onChange={(value) => setItem({ ...item, minStock: Math.max(0, Number(value)) })} /><NumberField label="Costo por unidad" value={item.costPerUnit} onChange={(value) => setItem({ ...item, costPerUnit: Math.max(0, Number(value)) })} /></div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold">Cancelar</button><button onClick={onSave} disabled={!item.name.trim()} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40">Guardar insumo</button></div></div></div>;
}

function FieldLabel({ text }: { text: string }) { return <span className="mb-1.5 block text-xs font-bold text-slate-600">{text}</span>; }
function TextField({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><FieldLabel text={label} /><input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) { return <label><FieldLabel text={label} /><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" /></label>; }
