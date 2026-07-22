'use client';

import React, { useState } from 'react';
import { 
  Package, RefreshCw, AlertTriangle, ArrowLeftRight, Edit, History, 
  MapPin, CheckCircle, Search, ArrowUp, ArrowDown, Settings, Plus, Info 
} from 'lucide-react';
import { Product, Stock, StockMovement, Branch } from '@programa-sass/shared-types';

// Mock de sucursales
const MOCK_BRANCHES: Branch[] = [
  { id: 'b1', company_id: 'c-test', name: 'Sucursal Centro', address: 'Av. Corrientes 1200, CABA', phone: '11-1234-5678', email: 'centro@empresa.com', is_main: true, arca_punto_venta: 1, created_at: '', updated_at: '' },
  { id: 'b2', company_id: 'c-test', name: 'Sucursal Palermo', address: 'Honduras 4800, CABA', phone: '11-8765-4321', email: 'palermo@empresa.com', is_main: false, arca_punto_venta: 2, created_at: '', updated_at: '' },
  { id: 'b3', company_id: 'c-test', name: 'Depósito Central', address: 'Ruta 8 Km 45, Pilar', phone: '11-5555-0100', email: 'deposito@empresa.com', is_main: false, arca_punto_venta: null, created_at: '', updated_at: '' }
];

// Mock inicial de productos
const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', company_id: 'c-test', name: 'Remera Algodón Premium', price: 18500, cost: 9200, vat_rate: 21, is_service: false, stock_control: true, sku: 'REM-ALG-001', barcode: '7791234567890', description: '', image_url: null, extra_attributes: {}, created_at: '', updated_at: '' },
  { id: 'p2', company_id: 'c-test', name: 'Pantalón Jean Slim Fit', price: 29900, cost: 14000, vat_rate: 21, is_service: false, stock_control: true, sku: 'REM-JEA-002', barcode: '7790011223344', description: '', image_url: null, extra_attributes: {}, created_at: '', updated_at: '' },
  { id: 'p3', company_id: 'c-test', name: 'Zapatillas Deportivas Run', price: 65000, cost: 32000, vat_rate: 21, is_service: false, stock_control: true, sku: 'ZAP-RUN-041', barcode: '7794433221100', description: '', image_url: null, extra_attributes: {}, created_at: '', updated_at: '' },
  { id: 'p4', company_id: 'c-test', name: 'Gorra Trucker Retro', price: 8500, cost: 3800, vat_rate: 21, is_service: false, stock_control: true, sku: 'REM-GOR-004', barcode: '7799876543210', description: '', image_url: null, extra_attributes: {}, created_at: '', updated_at: '' }
];

// Mock de stock por sucursal
const INITIAL_STOCK: Stock[] = [
  { id: 's1', company_id: 'c-test', branch_id: 'b1', product_id: 'p1', quantity: 24, min_stock: 5, location: 'Estante A-3' },
  { id: 's2', company_id: 'c-test', branch_id: 'b1', product_id: 'p2', quantity: 3, min_stock: 5, location: 'Estante A-4' },
  { id: 's3', company_id: 'c-test', branch_id: 'b1', product_id: 'p3', quantity: 0, min_stock: 2, location: 'Mostrador' },
  
  { id: 's4', company_id: 'c-test', branch_id: 'b2', product_id: 'p1', quantity: 12, min_stock: 5, location: 'Sector Niños' },
  { id: 's5', company_id: 'c-test', branch_id: 'b2', product_id: 'p2', quantity: 15, min_stock: 5, location: 'Sector Hombres' },
  
  { id: 's6', company_id: 'c-test', branch_id: 'b3', product_id: 'p1', quantity: 150, min_stock: 20, location: 'Pallet 4' },
  { id: 's7', company_id: 'c-test', branch_id: 'b3', product_id: 'p2', quantity: 80, min_stock: 20, location: 'Pallet 5' },
  { id: 's8', company_id: 'c-test', branch_id: 'b3', product_id: 'p3', quantity: 45, min_stock: 10, location: 'Caja Fuerte' }
];

// Mock inicial de movimientos
const INITIAL_MOVEMENTS: StockMovement[] = [
  { id: 'm1', company_id: 'c-test', stock_id: 's1', user_id: 'u-user', quantity: 50, type: 'in', notes: 'Ingreso inicial por compra a proveedor', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'm2', company_id: 'c-test', stock_id: 's1', user_id: 'u-user', quantity: -2, type: 'sale', notes: 'Descuento por venta ticket 0012', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: 'm3', company_id: 'c-test', stock_id: 's2', user_id: 'u-user', quantity: -1, type: 'sale', notes: 'Descuento por venta ticket 0013', created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() }
];

export default function InventoryConsole() {
  const [stockList, setStockList] = useState<Stock[]>(INITIAL_STOCK);
  const [movements, setMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('b1');
  const [activeTab, setActiveTab] = useState<'levels' | 'history' | 'transfers'>('levels');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales y control de ajuste
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Transferencia de stock
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferProdId, setTransferProdId] = useState('p1');
  const [transferFromBranch, setTransferFromBranch] = useState('b3'); // Generalmente de deposito
  const [transferToBranch, setTransferToBranch] = useState('b1'); // a sucursal
  const [transferQty, setTransferQty] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const getProduct = (productId: string) => MOCK_PRODUCTS.find(p => p.id === productId)!;
  const getBranch = (branchId: string) => MOCK_BRANCHES.find(b => b.id === branchId)!;

  // Lógica Ajustar Stock
  const handleOpenAdjust = (stk: Stock) => {
    setSelectedStock(stk);
    setAdjustQty('');
    setAdjustNotes('');
    setAdjustType('adjustment');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;
    const value = Number(adjustQty);
    if (isNaN(value) || value <= 0) return;

    let finalQtyChange = value;
    if (adjustType === 'out') finalQtyChange = -value;

    // Actualizar stock en la lista
    const updatedStock = stockList.map(s => {
      if (s.id === selectedStock.id) {
        const newQty = adjustType === 'adjustment' ? value : s.quantity + finalQtyChange;
        const actualChange = adjustType === 'adjustment' ? (value - s.quantity) : finalQtyChange;

        // Registrar movimiento
        const newMov: StockMovement = {
          id: `mov-${Date.now()}`,
          company_id: 'c-test',
          stock_id: s.id,
          user_id: 'u-user',
          quantity: actualChange,
          type: adjustType === 'adjustment' ? 'adjustment' : adjustType,
          notes: adjustNotes || 'Ajuste manual de inventario',
          created_at: new Date().toISOString()
        };
        setMovements([newMov, ...movements]);

        return { ...s, quantity: newQty };
      }
      return s;
    });

    setStockList(updatedStock);
    setIsAdjustModalOpen(false);
  };

  // Lógica Transferir Stock
  const handleTransferStock = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(transferQty);
    if (isNaN(value) || value <= 0) return;
    if (transferFromBranch === transferToBranch) {
      alert('Las sucursales de origen y destino deben ser diferentes.');
      return;
    }

    // Buscar stock origen
    const sourceStock = stockList.find(s => s.branch_id === transferFromBranch && s.product_id === transferProdId);
    if (!sourceStock || sourceStock.quantity < value) {
      alert('Stock insuficiente en la sucursal de origen.');
      return;
    }

    // Buscar o crear stock destino
    const targetStock = stockList.find(s => s.branch_id === transferToBranch && s.product_id === transferProdId);

    const updatedStock = stockList.map(s => {
      // Descontar origen
      if (s.branch_id === transferFromBranch && s.product_id === transferProdId) {
        return { ...s, quantity: s.quantity - value };
      }
      // Sumar destino
      if (s.branch_id === transferToBranch && s.product_id === transferProdId) {
        return { ...s, quantity: s.quantity + value };
      }
      return s;
    });

    // Si no existía registro de stock en la sucursal destino, lo agregamos
    let nextStockList = updatedStock;
    if (!targetStock) {
      const newStk: Stock = {
        id: `s-${Date.now()}`,
        company_id: 'c-test',
        branch_id: transferToBranch,
        product_id: transferProdId,
        quantity: value,
        min_stock: 5,
        location: 'Depósito sucursal'
      };
      nextStockList = [...updatedStock, newStk];
    }

    setStockList(nextStockList);

    // Movimiento Origen (Egreso por transferencia)
    const movFrom: StockMovement = {
      id: `mov-tf-${Date.now()}-1`,
      company_id: 'c-test',
      stock_id: sourceStock.id,
      user_id: 'u-user',
      quantity: -value,
      type: 'transfer',
      notes: `Transferencia hacia ${getBranch(transferToBranch).name}. ${transferNotes}`,
      created_at: new Date().toISOString()
    };

    // Movimiento Destino (Ingreso por transferencia)
    const movTo: StockMovement = {
      id: `mov-tf-${Date.now()}-2`,
      company_id: 'c-test',
      stock_id: targetStock ? targetStock.id : `s-${Date.now()}`,
      user_id: 'u-user',
      quantity: value,
      type: 'transfer',
      notes: `Ingreso desde transferencia de ${getBranch(transferFromBranch).name}. ${transferNotes}`,
      created_at: new Date().toISOString()
    };

    setMovements([movFrom, movTo, ...movements]);
    setIsTransferModalOpen(false);
    setTransferQty('');
    setTransferNotes('');
    alert('Transferencia completada con éxito.');
  };

  // Filtrado de stock de la sucursal activa
  const currentBranchStock = stockList.filter(s => s.branch_id === selectedBranchId);
  const filteredStock = currentBranchStock.filter(s => {
    const prod = getProduct(s.product_id);
    return prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.sku && prod.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (prod.barcode && prod.barcode.includes(searchTerm));
  });

  // Alertas de Stock Mínimo
  const lowStockItems = currentBranchStock.filter(s => s.min_stock !== null && s.quantity <= s.min_stock);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Header Sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Control de Stock e Inventario
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Control en tiempo real de múltiples depósitos y sucursales. Auditoría automatizada de movimientos de stock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition-all duration-200"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transferir Mercadería
          </button>
        </div>
      </div>

      {/* Alertas de Stock Mínimo */}
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-4 p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl">
          <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-amber-300">¡Alerta de Stock Crítico!</h4>
            <p className="text-xs text-amber-400 mt-1">
              Hay {lowStockItems.length} productos en esta sucursal por debajo del stock mínimo establecido. Reponer inventario para evitar pérdidas de ventas.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {lowStockItems.map(s => {
                const prod = getProduct(s.product_id);
                return (
                  <span key={s.id} className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
                    {prod.name} ({s.quantity} de {s.min_stock} min)
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs y Selector de Sucursal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-2">
        <div className="flex bg-slate-900/80 rounded-xl p-1 border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('levels')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'levels' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Package className="h-3.5 w-3.5" />
            Niveles de Stock
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <History className="h-3.5 w-3.5" />
            Historial de Movimientos
          </button>
        </div>

        {/* Selector de Sucursal */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 w-fit">
          <MapPin className="h-4 w-4 text-cyan-400" />
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Ver Sucursal:</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent border-none text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
          >
            {MOCK_BRANCHES.map(b => (
              <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">{b.name} {b.is_main ? '(Matriz)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vista 1: Niveles de Stock */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrar stock por producto o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
            />
          </div>

          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase font-bold tracking-wider">
                    <th className="p-4">Producto</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Ubicación</th>
                    <th className="p-4 text-center">Stock Mínimo</th>
                    <th className="p-4 text-right">Cantidad Stock</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredStock.length > 0 ? (
                    filteredStock.map(s => {
                      const prod = getProduct(s.product_id);
                      const isLow = s.min_stock !== null && s.quantity <= s.min_stock;
                      const isOut = s.quantity === 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 font-bold text-slate-200">{prod.name}</td>
                          <td className="p-4 font-mono text-slate-500">{prod.sku}</td>
                          <td className="p-4 text-slate-400">{s.location || 'No asignada'}</td>
                          <td className="p-4 text-center font-semibold text-slate-400">{s.min_stock ?? 'N/A'}</td>
                          <td className={`p-4 text-right font-extrabold text-sm ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-200'}`}>
                            {s.quantity.toString()}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${
                              isOut 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : isLow 
                                ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                            }`}>
                              {isOut ? 'Sin Stock' : isLow ? 'Crítico' : 'Normal'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleOpenAdjust(s)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white rounded-lg font-bold border border-slate-750 transition-colors"
                            >
                              Ajustar Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 italic">No se encontraron productos registrados en esta sucursal.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vista 2: Historial de Movimientos */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" />
                Auditoría Global de Movimientos (Triggers RLS)
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Producto</th>
                    <th className="p-4">Sucursal</th>
                    <th className="p-4 text-center">Tipo</th>
                    <th className="p-4 text-right">Cant. Movimiento</th>
                    <th className="p-4">Motivo / Notas</th>
                    <th className="p-4">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {movements.map(m => {
                    const stockItem = stockList.find(s => s.id === m.stock_id);
                    if (!stockItem) return null;
                    const prod = getProduct(stockItem.product_id);
                    const branch = getBranch(stockItem.branch_id);
                    const isPositive = m.quantity > 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-slate-500 font-mono">{new Date(m.created_at).toLocaleString()}</td>
                        <td className="p-4 font-bold text-slate-200">{prod.name}</td>
                        <td className="p-4 text-slate-450">{branch.name}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold text-[9px] uppercase border ${
                            m.type === 'sale' 
                              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                              : m.type === 'in' || m.type === 'purchase'
                              ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {m.type === 'sale' ? 'Venta' : m.type === 'in' ? 'Ingreso Compra' : m.type === 'transfer' ? 'Transferencia' : 'Ajuste'}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-extrabold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{m.quantity.toString()}
                        </td>
                        <td className="p-4 text-slate-400">{m.notes}</td>
                        <td className="p-4 text-slate-500 font-semibold">{m.user_id}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajustar Stock */}
      {isAdjustModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Ajustar Inventario</h3>
            <p className="text-slate-400 text-xs mb-4">
              Producto: <strong className="text-cyan-400">{getProduct(selectedStock.product_id).name}</strong>
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Acción de Ajuste</label>
                <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`flex-1 py-2 rounded font-semibold ${adjustType === 'in' ? 'bg-slate-850 text-emerald-400' : 'text-slate-500'}`}
                  >
                    Ingresar (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`flex-1 py-2 rounded font-semibold ${adjustType === 'out' ? 'bg-slate-850 text-red-450' : 'text-slate-500'}`}
                  >
                    Egresar (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`flex-1 py-2 rounded font-semibold ${adjustType === 'adjustment' ? 'bg-slate-850 text-indigo-400' : 'text-slate-500'}`}
                  >
                    Establecer (=)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad</label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none"
                  placeholder="Ej: 10"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nota / Justificación</label>
                <textarea
                  required
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Rotura de empaque, recuento de fin de año"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="w-full py-2.5 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transferir Mercadería */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2">Transferencia de Mercadería</h3>
            <p className="text-slate-400 text-xs mb-5">
              Enviá stock de un depósito central a una sucursal de ventas o realizá traspasos rápidos de inventario.
            </p>

            <form onSubmit={handleTransferStock} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Producto a Transferir</label>
                <select
                  value={transferProdId}
                  onChange={(e) => setTransferProdId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-300 text-xs focus:outline-none"
                >
                  {MOCK_PRODUCTS.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Origen</label>
                  <select
                    value={transferFromBranch}
                    onChange={(e) => setTransferFromBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-300 text-xs focus:outline-none"
                  >
                    {MOCK_BRANCHES.map(b => (
                      <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destino</label>
                  <select
                    value={transferToBranch}
                    onChange={(e) => setTransferToBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-300 text-xs focus:outline-none"
                  >
                    {MOCK_BRANCHES.map(b => (
                      <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad a Traspasar</label>
                  <input
                    type="number"
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none"
                    placeholder="Ej: 20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Traspaso semanal de mercadería"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold"
                >
                  Confirmar Transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
