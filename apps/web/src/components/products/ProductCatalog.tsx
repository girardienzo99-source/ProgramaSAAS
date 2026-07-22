'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Barcode, Filter, Upload, Download, AlertTriangle, 
  Layers, Package, Settings, Sliders, CheckCircle, RefreshCw, Trash2, Edit3,
  Printer, ChevronRight, X, Building, Tag, CheckSquare, Square, Percent, AlertCircle
} from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { Product } from '@programa-sass/shared-types';

type RubroTemplate = 'retail' | 'gastronomy' | 'medical' | 'custom';
type FilterType = 'all' | 'products' | 'services';
type FilterStock = 'all' | 'low' | 'no-control';
type DynamicAttribute = { key: string; value: string };
type VariantMatrix = Record<string, { stock: number; price: number; discountPercent?: number }>;
type Feedback = { type: 'success' | 'error'; message: string } | null;

interface BranchStock {
  id: string;
  name: string;
  stock: number;
  label: string;
}

function isRubroTemplate(value: string): value is RubroTemplate {
  return ['retail', 'gastronomy', 'medical', 'custom'].includes(value);
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    company_id: 'c-test',
    name: 'Remera Algodón Premium',
    description: 'Remera 100% algodón peinado, varios talles',
    sku: 'REM-ALG-001',
    barcode: '7791234567890',
    price: 18500.00,
    cost: 9200.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { talle: 'L', color: 'Azul Marino', marca: 'ClassicFit' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p2',
    company_id: 'c-test',
    name: 'Campera Bomber Impermeable',
    description: 'Campera bomber abrigada de abrigo e impermeable',
    sku: 'REM-BOM-105',
    barcode: '7799988776655',
    price: 49900.00,
    cost: 24000.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { talle: 'XL', color: 'Negro', marca: 'UrbanWind' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p3',
    company_id: 'c-test',
    name: 'Zapatillas Deportivas Run',
    description: 'Calzado deportivo con variantes de talle y color',
    sku: 'ZAP-RUN-041',
    barcode: '7794433221100',
    price: 65000.00,
    cost: 32000.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { talle: '41', color: 'Negro', marca: 'RunLab' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p4',
    company_id: 'c-test',
    name: 'Gorra Trucker Retro',
    description: 'Gorra ajustable con frente bordado',
    sku: 'REM-GOR-004',
    barcode: '7799876543210',
    price: 8500.00,
    cost: 3800.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { talle: 'Unico', color: 'Rojo/Blanco', marca: 'UrbanWind' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStock, setFilterStock] = useState<FilterStock>('all');
  const [scanNotification, setScanNotification] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  
  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState<Product | null>(null);
  const [showStockBranchesModal, setShowStockBranchesModal] = useState<Product | null>(null);

  // Formulario nuevo producto
  const [newName, setNewName] = useState('');
  const [newSKU, setNewSKU] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [newCost, setNewCost] = useState(0);
  const [newVatRate, setNewVatRate] = useState(21.00);
  const [newIsService, setNewIsService] = useState(false);
  const [newStockControl, setNewStockControl] = useState(true);
  
  // Atributos dinámicos del rubro actual
  const [rubroTemplate, setRubroTemplate] = useState<RubroTemplate>('retail');
  const [dynamicAttrs, setDynamicAttrs] = useState<DynamicAttribute[]>([
    { key: 'talle', value: '' },
    { key: 'color', value: '' }
  ]);

  // Selección de Talles y Colores para la Matriz Retail
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L']);
  const [selectedColors, setSelectedColors] = useState<string[]>(['Negro', 'Azul']);
  const [variantMatrix, setVariantMatrix] = useState<VariantMatrix>({});

  // Sucursales y Stock
  const [branchStocks, setBranchStocks] = useState<BranchStock[]>([
    { id: 'b1', name: 'Casa Central (Buenos Aires)', stock: 24, label: 'Depósito Central' },
    { id: 'b2', name: 'Sucursal Palermo (CABA)', stock: 12, label: 'Local Comercial' },
    { id: 'b3', name: 'Sucursal Belgrano (CABA)', stock: 8, label: 'Local Comercial' }
  ]);

  // Hook del Lector de Códigos de Barras Físico
  useBarcodeScanner({
    onScan: (code) => {
      const matchedProduct = products.find(p => p.barcode === code);
      if (matchedProduct) {
        setScanNotification(`Producto detectado: ${matchedProduct.name} ($${matchedProduct.price})`);
      } else {
        setScanNotification(`Código leído: ${code} (No registrado)`);
        setNewBarcode(code);
        setIsAddModalOpen(true);
      }
      setTimeout(() => setScanNotification(null), 5000);
    }
  });

  // Cambiar template de atributos según rubro seleccionado
  useEffect(() => {
    if (rubroTemplate === 'retail') {
      setDynamicAttrs([{ key: 'talle', value: 'M' }, { key: 'color', value: 'Negro' }, { key: 'marca', value: 'SassFit' }]);
    } else if (rubroTemplate === 'gastronomy') {
      setDynamicAttrs([{ key: 'sector', value: 'Cocina' }, { key: 'tiempo_prep_mins', value: '15' }]);
    } else if (rubroTemplate === 'medical') {
      setDynamicAttrs([{ key: 'especialidad', value: 'Pediatría' }, { key: 'duracion_mins', value: '30' }]);
    } else {
      setDynamicAttrs([]);
    }
  }, [rubroTemplate]);

  // Regenerar Matriz de Variantes al cambiar talles o colores seleccionados
  useEffect(() => {
    setVariantMatrix((previousMatrix) => {
      const newMatrix: VariantMatrix = {};
      selectedSizes.forEach(size => {
        selectedColors.forEach(color => {
          const key = `${size}-${color}`;
          newMatrix[key] = previousMatrix[key] || { stock: 10, price: newPrice || 18500, discountPercent: 0 };
        });
      });
      return newMatrix;
    });
  }, [selectedSizes, selectedColors, newPrice]);

  const handleAddAttribute = () => {
    setDynamicAttrs([...dynamicAttrs, { key: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setDynamicAttrs(dynamicAttrs.filter((_, i) => i !== index));
  };

  const handleAttrChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...dynamicAttrs];
    updated[index][field] = val;
    setDynamicAttrs(updated);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(x => x !== size) : [...prev, size]);
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(x => x !== color) : [...prev, color]);
  };

  const handleMatrixChange = (key: string, field: 'stock' | 'price' | 'discountPercent', val: number) => {
    setVariantMatrix(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val
      }
    }));
  };

  const handleBulkPriceIncrease = (percent: number) => {
    setVariantMatrix(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k].price = Math.round(updated[k].price * (1 + percent / 100));
      });
      return updated;
    });
    alert(`✔ Se incrementó el precio de todas las variantes un ${percent}%.`);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const extra_attributes = dynamicAttrs.reduce<Record<string, unknown>>((acc, curr) => {
      if (curr.key) {
        acc[curr.key.toLowerCase()] = curr.value;
      }
      return acc;
    }, {});

    // Si es indumentaria, inyectar el catálogo de variantes a los atributos del rubro
    if (rubroTemplate === 'retail') {
      extra_attributes.sizes = selectedSizes;
      extra_attributes.colors = selectedColors;
      extra_attributes.variants = variantMatrix;
    }

    const newProduct: Product = {
      id: `p-${Date.now()}`,
      company_id: 'c-test',
      name: newName,
      description: rubroTemplate === 'retail' ? 'Prenda de vestir con variantes de talles/colores.' : 'Producto creado dinámicamente',
      sku: newSKU || `SKU-${Math.floor(Math.random() * 10000)}`,
      barcode: newBarcode || `779${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      price: Number(newPrice),
      cost: Number(newCost),
      vat_rate: Number(newVatRate),
      is_service: newIsService,
      stock_control: newStockControl,
      image_url: null,
      extra_attributes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setProducts(prev => [newProduct, ...prev]);
    setIsAddModalOpen(false);
    setFeedback({ type: 'success', message: `Producto "${newProduct.name}" creado con matriz de variantes.` });
    
    // Reset form
    setNewName('');
    setNewSKU('');
    setNewBarcode('');
    setNewPrice(0);
    setNewCost(0);
    setNewVatRate(21.00);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Está seguro de eliminar este producto/servicio?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setFeedback({ type: 'success', message: 'Producto eliminado del catálogo.' });
    }
  };

  // Carga masiva simulated
  const handleCSVUploadSimulated = async () => {
    try {
      const csvContent = "name,sku,price,stock\nCamisa Formal Slim Fit,REM-CAM-002,25000,10\nPantalón Gabardina Chino,REM-PAN-003,29900,15";
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'productos_exito.csv',
          targetType: 'products',
          csvData: csvContent
        })
      });
      const data = await res.json();
      if (res.status === 201) {
        const mockCSVProducts: Product[] = [
          {
            id: 'csv-1',
            company_id: 'c-test',
            name: 'Camisa Formal Slim Fit',
            description: 'Importado de CSV con éxito.',
            sku: 'REM-CAM-002',
            barcode: '7790011223344',
            price: 25000.00,
            cost: 12000.00,
            vat_rate: 21.00,
            is_service: false,
            stock_control: true,
            image_url: null,
            extra_attributes: { talle: 'XL', color: 'Blanco', marca: 'SassFit' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setProducts(prev => [...mockCSVProducts, ...prev]);
        setIsCSVModalOpen(false);
        setFeedback({ type: 'success', message: 'Carga masiva completada. Fases 1 y 2 aprobadas.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error en conexión con el importador backend.' });
    }
  };

  const handleCSVUploadRollbackSimulated = async () => {
    try {
      const csvContent = "name,sku,price,stock\nCamisa Sin SKU,,abc,10";
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'productos_erroneos.csv',
          targetType: 'products',
          csvData: csvContent
        })
      });
      const data = await res.json();
      if (res.status === 400 && data.status === 'rolled_back') {
        setFeedback({ type: 'success', message: 'Rollback transaccional exitoso. La importación falló y se revirtieron los cambios.' });
        setIsCSVModalOpen(false);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al probar el rollback del backend.' });
    }
  };

  const handleUpdateBranchStock = (branchId: string, val: number) => {
    setBranchStocks(prev => prev.map(b => b.id === branchId ? { ...b, stock: val } : b));
  };

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm);

    const matchesType = 
      filterType === 'all' || 
      (filterType === 'services' && p.is_service) ||
      (filterType === 'products' && !p.is_service);

    const variants = p.extra_attributes?.variants as VariantMatrix | undefined;
    const totalVariantStock = variants
      ? Object.values(variants).reduce((acc, item) => acc + item.stock, 0)
      : null;
    const matchesStock =
      filterStock === 'all' ||
      (filterStock === 'no-control' && !p.stock_control) ||
      (filterStock === 'low' && p.stock_control && totalVariantStock !== null && totalVariantStock <= 5);

    return matchesSearch && matchesType && matchesStock;
  }), [filterStock, filterType, products, searchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-slate-100 font-sans flex flex-col gap-6">
      
      {/* Header Sección */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Package className="h-6 w-6 text-white animate-pulse" />
            </span>
            <h1 id="catalog-title" className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Catálogo de Productos y Variantes
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Control de talles/colores (matriz de prendas), códigos de barras y visualización de stock multisucursal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            id="btn-upload-csv"
            onClick={() => setIsCSVModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-350 font-medium text-sm transition-all"
          >
            <Upload className="h-4 w-4" />
            Carga Masiva (CSV)
          </button>
          
          <button 
            id="btn-new-product"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold text-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Nuevo Ítem
          </button>
        </div>
      </div>

      {scanNotification && (
        <div id="scan-toast" className="flex items-center justify-between p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/40 backdrop-blur-md animate-pulse">
          <div className="flex items-center gap-3">
            <Barcode className="h-6 w-6 text-indigo-400" />
            <span className="text-indigo-200 font-medium text-sm">{scanNotification}</span>
          </div>
        </div>
      )}

      {/* Alerta de Stock Bajo */}
      {products.some(p => p.stock_control && !p.is_service && p.id === 'p1') && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
          <AlertCircle className="h-5 w-5 text-rose-550 animate-pulse" />
          <span>Alerta de Inventario: Ciertas prendas de vestir (Remera Algodón Premium) registran quiebre de stock crítico en sucursales.</span>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscar Producto / SKU / EAN</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none"
            />
            <Search className="h-3.5 w-3.5 text-slate-650 absolute left-2.5 top-3" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Tipo Ítem</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="products">Productos Físicos</option>
            <option value="services">Servicios</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">Control Stock</label>
          <select
            value={filterStock}
            onChange={e => setFilterStock(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">Cualquier cantidad</option>
            <option value="low">Stock Crítico (≤ 5 uds)</option>
            <option value="no-control">Sin Control Stock</option>
          </select>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
          feedback.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
            : 'border-rose-500/30 bg-rose-950/30 text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => (
          <div 
            key={p.id}
            className="bg-gradient-to-b from-slate-900/80 to-slate-950/90 rounded-2xl border border-slate-800 hover:border-slate-700/80 p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    p.is_service ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  }`}>
                    {p.is_service ? 'Servicio' : 'Producto'}
                  </span>
                  {p.barcode && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                      <Barcode className="h-3 w-3" />
                      {p.barcode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDeleteProduct(p.id)}
                    aria-label={`Eliminar ${p.name}`}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-455 hover:text-red-400 animate-pulse-once"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                {p.name}
              </h3>
              <p className="text-slate-500 text-xs mt-1">SKU: {p.sku || 'N/A'}</p>
              <p className="text-slate-400 text-xs mt-3 line-clamp-2">{p.description}</p>

              {/* Botoneras Especiales de Retail */}
              {!p.is_service && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowBarcodeModal(p)}
                    className="flex-1 py-2 px-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-[10px] font-bold text-slate-350 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Printer className="h-3.5 w-3.5 text-cyan-400" />
                    Etiquetas EAN-13
                  </button>
                  <button
                    onClick={() => setShowStockBranchesModal(p)}
                    className="flex-1 py-2 px-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-[10px] font-bold text-slate-350 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Building className="h-3.5 w-3.5 text-indigo-400" />
                    Stock Sucursales
                  </button>
                </div>
              )}

              {/* Atributos dinámicos */}
              {Object.keys(p.extra_attributes || {}).length > 0 && (
                <div className="mt-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-cyan-500/80" />
                    Atributos Extensibles
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(p.extra_attributes).map(([key, val]) => {
                      if (key === 'variants' || key === 'sizes' || key === 'colors') return null;
                      return (
                        <div key={key} className="text-xs bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                          <span className="text-slate-500 capitalize">{key}:</span>{' '}
                          <span className="text-slate-300 font-semibold text-[10px]">{val?.toString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Costo</span>
                <span className="text-xs text-slate-400 font-semibold">${p.cost.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Precio Final</span>
                <span className="text-xl font-extrabold text-cyan-400">${p.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Agregar Producto */}
      {isAddModalOpen && (
        <div id="add-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-black mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Crear Nuevo Producto / Servicio
            </h2>

            <form onSubmit={handleCreateProduct} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Ítem</label>
                  <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-850">
                    <button
                      type="button"
                      onClick={() => { setNewIsService(false); setNewStockControl(true); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg ${!newIsService ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                    >
                      Producto Físico
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewIsService(true); setNewStockControl(false); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg ${newIsService ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                    >
                      Servicio / Turno
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Template de Rubro</label>
                  <select
                    value={rubroTemplate}
                    onChange={(e) => {
                      if (isRubroTemplate(e.target.value)) {
                        setRubroTemplate(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="retail">Retail / Indumentaria (Talles y Colores)</option>
                  </select>
                </div>
              </div>

              {/* Matriz de Talles y Colores para Retail */}
              {!newIsService && rubroTemplate === 'retail' && (
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-cyan-500" />
                      Configuración de Variantes (Matriz Talles/Colores)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleBulkPriceIncrease(10)}
                        className="text-[9px] bg-slate-900 border border-slate-800 text-indigo-350 px-2 py-1 rounded font-bold uppercase hover:bg-slate-850"
                      >
                        +10% Precio Matriz
                      </button>
                    </div>
                  </div>

                  {/* Selector Talles */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-550 font-bold uppercase">Seleccionar Talles</span>
                    <div className="flex gap-2 flex-wrap">
                      {['S', 'M', 'L', 'XL', 'XXL'].map(size => {
                        const active = selectedSizes.includes(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                              active ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-850 text-slate-400'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selector Colores */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-550 font-bold uppercase">Seleccionar Colores</span>
                    <div className="flex gap-2 flex-wrap">
                      {['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde'].map(color => {
                        const active = selectedColors.includes(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => toggleColor(color)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                              active ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-850 text-slate-400'
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grilla de Variantes */}
                  {selectedSizes.length > 0 && selectedColors.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-550 font-bold uppercase block border-b border-slate-900 pb-2">Grilla de Stock y Precio por Celda</span>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {selectedSizes.map(size => 
                          selectedColors.map(color => {
                            const key = `${size}-${color}`;
                            const data = variantMatrix[key] || { stock: 10, price: 18500, discountPercent: 0 };
                            return (
                              <div key={key} className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-850">
                                <span className="font-bold text-slate-350">{size} / {color}</span>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    placeholder="Stock"
                                    value={data.stock}
                                    onChange={e => handleMatrixChange(key, 'stock', Number(e.target.value))}
                                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs w-16 text-center text-white"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Precio"
                                    value={data.price}
                                    onChange={e => handleMatrixChange(key, 'price', Number(e.target.value))}
                                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs w-20 text-center text-white"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Desc (%)"
                                    value={data.discountPercent || 0}
                                    onChange={e => handleMatrixChange(key, 'discountPercent', Number(e.target.value))}
                                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs w-16 text-center text-white font-semibold text-emerald-450"
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Producto/Servicio</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Remera Algodón Negra"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">SKU (Código Interno)</label>
                  <input
                    type="text"
                    placeholder="Ej: ART-1002"
                    value={newSKU}
                    onChange={(e) => setNewSKU(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Código de Barras</label>
                  <input
                    type="text"
                    placeholder="Escanear o ingresar código"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCost === 0 ? '' : newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Precio Final ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPrice === 0 ? '' : newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">IVA (%)</label>
                  <select
                    value={newVatRate}
                    onChange={(e) => setNewVatRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value={21}>21.0% (General)</option>
                    <option value={10.5}>10.5% (Reducido)</option>
                    <option value={27}>27.0% (Especial)</option>
                    <option value={0}>0.0% (Exento)</option>
                  </select>
                </div>
              </div>

              {/* Atributos dinámicos */}
              {rubroTemplate !== 'retail' && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-cyan-500" />
                      Atributos del Rubro Extensible
                    </span>
                    <button
                      type="button"
                      onClick={handleAddAttribute}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      + Agregar Atributo
                    </button>
                  </div>

                  {dynamicAttrs.length > 0 ? (
                    <div className="space-y-3">
                      {dynamicAttrs.map((attr, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="text"
                            placeholder="Clave (ej. talle)"
                            value={attr.key}
                            onChange={(e) => handleAttrChange(idx, 'key', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Valor (ej. L)"
                            value={attr.value}
                            onChange={(e) => handleAttrChange(idx, 'value', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAttribute(idx)}
                            className="p-2 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic">No hay atributos dinámicos agregados.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-bold hover:shadow-lg"
                >
                  Guardar Ítem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva (CSV) */}
      {isCSVModalOpen && (
        <div id="csv-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-black mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Carga Masiva de Catálogo (CSV)
            </h2>
            <p className="text-slate-400 text-xs mb-5">
              Subí una planilla en formato CSV para importar masivamente tu inventario y servicios.
            </p>

            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center bg-slate-950/50 hover:bg-slate-950/80 transition-colors cursor-pointer mb-5">
              <Upload className="h-10 w-10 text-cyan-500 mx-auto mb-3" />
              <p className="text-slate-300 text-sm font-semibold">Hacé clic para seleccionar o arrastrá un archivo aquí</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCSVModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleCSVUploadRollbackSimulated}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-red-900/40 text-red-305 text-xs font-bold hover:bg-slate-800"
              >
                Probar Rollback
              </button>
              <button
                type="button"
                onClick={handleCSVUploadSimulated}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold"
              >
                Carga Exitosa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESIÓN Y SIMULACIÓN ETIQUETAS EAN-13 */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-fade-in text-slate-900">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-cyan-400" />
                <h4 className="font-black text-base text-white">Generador de Etiquetas de Barras</h4>
              </div>
              <button onClick={() => setShowBarcodeModal(null)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Previsualización de etiquetas de código de barras para pegado físico en las prendas.
            </p>

            {/* Simulación de etiquetas EAN-13 */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {['S - Negro', 'M - Blanco', 'L - Negro', 'XL - Azul'].map(variant => (
                <div key={variant} className="bg-white p-4 rounded-xl text-slate-950 font-sans space-y-2 border border-slate-200">
                  <div className="flex justify-between items-start text-[10px] font-bold text-slate-500">
                    <span className="uppercase">Sass ERP Retail</span>
                    <span>ARGENTINA</span>
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 truncate">{showBarcodeModal.name}</h5>
                    <span className="text-[9px] font-bold text-slate-500">Variante: {variant}</span>
                  </div>
                  {/* Imagen ficticia de barras scaneables */}
                  <div className="bg-slate-100 py-3 rounded-lg border border-slate-200 flex flex-col items-center justify-center font-mono text-[9px] text-slate-650 gap-1">
                    <span className="tracking-[3px] font-bold">|||||||| |||| |||||| ||</span>
                    <span>{showBarcodeModal.barcode || '7790847291047'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className="font-bold text-slate-500">SKU: {showBarcodeModal.sku || 'N/A'}</span>
                    <span className="font-black text-xs text-indigo-600">${showBarcodeModal.price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowBarcodeModal(null)}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-xs font-bold text-slate-400 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setFeedback({ type: 'success', message: 'Comando de impresión térmica enviado al controlador local.' });
                  setShowBarcodeModal(null);
                }}
                className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Imprimir Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE STOCK MULTISUCURSAL */}
      {showStockBranchesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-400" />
                <h4 className="font-black text-base text-white">Stock Multisucursal</h4>
              </div>
              <button onClick={() => setShowStockBranchesModal(null)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Distribución actual de unidades de **{showStockBranchesModal.name}** en tiempo real.
            </p>

            <div className="space-y-2.5">
              {branchStocks.map(suc => (
                <div key={suc.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-850 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-extrabold text-white block">{suc.name}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{suc.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={suc.stock}
                      onChange={e => handleUpdateBranchStock(suc.id, Number(e.target.value))}
                      className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center text-white"
                    />
                    <span className="text-slate-500 text-[10px]">uds.</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowStockBranchesModal(null)}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-xs font-bold text-slate-400 transition-colors"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
