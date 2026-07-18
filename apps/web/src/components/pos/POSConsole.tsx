'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, CreditCard, DollarSign, RefreshCw, Barcode, Search, Plus, 
  Minus, Trash2, ShieldAlert, CheckCircle, Smartphone, X, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { Product, Caja, CajaMovement } from '@programa-sass/shared-types';

// Mock de productos cargados para el POS
const POS_PRODUCTS: Product[] = [
  {
    id: 'p1',
    company_id: 'c-test',
    name: 'Remera Algodón Premium',
    description: 'Remera 100% algodón, talle L',
    sku: 'REM-ALG-001',
    barcode: '7791234567890',
    price: 18500.00,
    cost: 9200.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { talle: 'L', color: 'Azul' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p2',
    company_id: 'c-test',
    name: 'Pantalón Jean Slim Fit',
    description: 'Jean clásico talle 42',
    sku: 'REM-JEA-002',
    barcode: '7790011223344',
    price: 29900.00,
    cost: 14000.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { talle: '42', color: 'Celeste' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p3',
    company_id: 'c-test',
    name: 'Zapatillas Deportivas Run',
    description: 'Calzado running talle 41',
    sku: 'ZAP-RUN-041',
    barcode: '7794433221100',
    price: 65000.00,
    cost: 32000.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { talle: '41', color: 'Negro' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p4',
    company_id: 'c-test',
    name: 'Gorra Trucker Retro',
    description: 'Gorra ajustable retro',
    sku: 'REM-GOR-004',
    barcode: '7799876543210',
    price: 8500.00,
    cost: 3800.00,
    vat_rate: 21.00,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { color: 'Rojo/Blanco' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSConsole() {
  // Estado de la Caja
  const [caja, setCaja] = useState<Caja | null>(null);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(true);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('5000');
  
  // Caja chica - Movimientos manuales
  const [isCajaMovementModalOpen, setIsCajaMovementModalOpen] = useState(false);
  const [cajaMovements, setCajaMovements] = useState<CajaMovement[]>([]);
  const [cajaMovementAmount, setCajaMovementAmount] = useState('');
  const [cajaMovementType, setCajaMovementType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [cajaMovementNotes, setCajaMovementNotes] = useState('');

  // Cierre de caja
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingBalanceInput, setClosingBalanceInput] = useState('');

  // Estado del Carrito y Selección
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mercadopago' | 'cta_cte'>('cash');
  const [clientType, setClientType] = useState<'Consumidor Final' | 'Responsable Inscripto'>('Consumidor Final');

  // FASE 3: Cobro Dividido (Split Payments)
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitTransfer, setSplitTransfer] = useState('');

  // FASE 3: Cuenta Corriente (Cta Cte / Deudores)
  const [selectedClientName, setSelectedClientName] = useState('Consumidor Final');
  const [clientAccountBalance, setClientAccountBalance] = useState(20000); // Saldo actual deudor
  const [clientAccountLimit, setClientAccountLimit] = useState(50000);     // Límite de deuda

  // FASE 3: Cupones Promocionales
  const [promoCoupon, setPromoCoupon] = useState('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState(0);

  // Integración Mercado Pago Point (Simulado)
  const [mpStatus, setMpStatus] = useState<'idle' | 'sending' | 'waiting' | 'approved' | 'failed'>('idle');
  const [mpMessage, setMpMessage] = useState('');

  // Facturación y Post-Venta
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [shouldInvoiceARCA, setShouldInvoiceARCA] = useState(true);

  // Escáner de Códigos de Barras Físico
  useBarcodeScanner({
    onScan: (code) => {
      if (!caja || caja.status !== 'open') {
        alert('Debés abrir la caja antes de registrar ventas.');
        return;
      }
      const prod = POS_PRODUCTS.find(p => p.barcode === code);
      if (prod) {
        addToCart(prod);
      } else {
        alert(`Código de barras ${code} no encontrado.`);
      }
    }
  });

  // Apertura de Caja
  const handleOpenCaja = (e: React.FormEvent) => {
    e.preventDefault();
    const initialAmt = Number(openingBalanceInput) || 0;
    const newCaja: Caja = {
      id: `caja-${Date.now()}`,
      company_id: 'c-test',
      branch_id: 'b-main',
      name: 'Caja Principal - Terminal 01',
      status: 'open',
      opened_at: new Date().toISOString(),
      closed_at: null,
      opened_by: 'u-user',
      closed_by: null,
      opening_balance: initialAmt,
      closing_balance: 0,
      created_at: new Date().toISOString()
    };
    setCaja(newCaja);
    setIsOpeningModalOpen(false);
  };

  // Movimientos Manuales (Retiro o ingreso de efectivo de la caja chica)
  const handleRecordCajaMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caja) return;
    const amt = Number(cajaMovementAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newMov: CajaMovement = {
      id: `mov-${Date.now()}`,
      company_id: 'c-test',
      caja_id: caja.id,
      amount: cajaMovementType === 'cash_out' ? -amt : amt,
      type: cajaMovementType,
      payment_method: 'cash',
      reference_id: null,
      notes: cajaMovementNotes,
      created_at: new Date().toISOString()
    };

    setCajaMovements([newMov, ...cajaMovements]);
    setIsCajaMovementModalOpen(false);
    setCajaMovementAmount('');
    setCajaMovementNotes('');
  };

  // Calcular el saldo teórico en efectivo de la caja actual
  const calculateTheoreticalCashBalance = () => {
    if (!caja) return 0;
    const initial = caja.opening_balance;
    const movementsSum = cajaMovements.reduce((acc, curr) => acc + curr.amount, 0);
    // Ventas pagadas en efectivo
    // En un sistema real, consultaríamos las ventas registradas. Haremos una estimación
    return initial + movementsSum;
  };

  // Cierre de Caja
  const handleCloseCaja = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caja) return;
    const closingVal = Number(closingBalanceInput) || 0;
    const theoreticalVal = calculateTheoreticalCashBalance();
    
    setCaja({
      ...caja,
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: 'u-user',
      closing_balance: closingVal
    });

    setIsClosingModalOpen(false);
    
    const diff = closingVal - theoreticalVal;
    if (diff === 0) {
      alert('¡Caja cerrada correctamente! El arqueo dió perfecto.');
    } else {
      alert(`Caja cerrada con diferencia. Teórico: $${theoreticalVal.toFixed(2)} | Ingresado: $${closingVal.toFixed(2)} | Diferencia: $${diff.toFixed(2)}`);
    }
  };

  // Lógica del Carrito
  const addToCart = (product: Product) => {
    if (!caja || caja.status !== 'open') {
      setIsOpeningModalOpen(true);
      return;
    }
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Totales con Cupones
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  const activeDiscountPercent = discount + couponDiscountPercent;
  const cartDiscountAmt = (cartSubtotal * activeDiscountPercent) / 100;
  const cartTotal = cartSubtotal - cartDiscountAmt;
  const cartTaxAmt = (cartTotal * 0.21) / 1.21; // Asumiendo tasa promedio para estimar

  // Confirmar Venta (Checkout)
  const handleCheckout = () => {
    if (cart.length === 0) return;

    // Validación pago dividido
    if (isSplitPayment) {
      const cashVal = Number(splitCash) || 0;
      const cardVal = Number(splitCard) || 0;
      const transferVal = Number(splitTransfer) || 0;
      const sum = cashVal + cardVal + transferVal;
      if (Math.abs(sum - cartTotal) > 0.05) {
        alert(`Error en Cobro Dividido: La suma de montos ($${sum.toFixed(2)}) debe coincidir con el total a cobrar ($${cartTotal.toFixed(2)}).`);
        return;
      }
    }

    // Validación Cuenta Corriente
    if (paymentMethod === 'cta_cte') {
      if (selectedClientName === 'Consumidor Final') {
        alert('Error: Selecciona un cliente registrado para habilitar el cobro por Cuenta Corriente (Fiado).');
        return;
      }
      const futureBalance = clientAccountBalance + cartTotal;
      if (futureBalance > clientAccountLimit) {
        alert(`Crédito Insuficiente: La deuda superará el límite de $${clientAccountLimit.toFixed(2)} del cliente.\nSaldo actual: $${clientAccountBalance.toFixed(2)}\nMonto compra: $${cartTotal.toFixed(2)}\nFalta cupo: $${(futureBalance - clientAccountLimit).toFixed(2)}.`);
        return;
      }
    }

    if (paymentMethod === 'mercadopago') {
      // Simular cobro con dispositivo Mercado Pago Point
      setMpStatus('sending');
      setMpMessage('Enviando monto a terminal física...');
      
      setTimeout(() => {
        setMpStatus('waiting');
        setMpMessage('Aproxime o inserte tarjeta en la terminal Point...');
        
        setTimeout(() => {
          setMpStatus('approved');
          setMpMessage('Pago aprobado correctamente.');
          
          setTimeout(() => {
            setMpStatus('idle');
            completeSale();
          }, 1500);
        }, 3000);
      }, 1500);
    } else {
      completeSale();
    }
  };

  const completeSale = () => {
    const saleId = `sale-${Date.now()}`;
    
    if (paymentMethod === 'cta_cte') {
      // Registrar incremento de deuda
      setClientAccountBalance(prev => prev + cartTotal);
    }

    // Si fue en efectivo, agregar al flujo de la caja
    if (!isSplitPayment && paymentMethod === 'cash' && caja) {
      const saleMov: CajaMovement = {
        id: `mov-${Date.now()}`,
        company_id: 'c-test',
        caja_id: caja.id,
        amount: cartTotal,
        type: 'sale_payment',
        payment_method: 'cash',
        reference_id: saleId as any,
        notes: `Cobro venta ${saleId}`,
        created_at: new Date().toISOString()
      };
      setCajaMovements(prev => [saleMov, ...prev]);
    } else if (isSplitPayment && caja) {
      const cashVal = Number(splitCash) || 0;
      if (cashVal > 0) {
        const saleMov: CajaMovement = {
          id: `mov-${Date.now()}`,
          company_id: 'c-test',
          caja_id: caja.id,
          amount: cashVal,
          type: 'sale_payment',
          payment_method: 'cash',
          reference_id: saleId as any,
          notes: `Cobro dividido (Efectivo) venta ${saleId}`,
          created_at: new Date().toISOString()
        };
        setCajaMovements(prev => [saleMov, ...prev]);
      }
    }

    setLastSaleId(saleId);
    setIsSuccessModalOpen(true);
    setCart([]);
    setDiscount(0);
    setCouponDiscountPercent(0);
    setPromoCoupon('');
    setIsSplitPayment(false);
    setSplitCash('');
    setSplitCard('');
    setSplitTransfer('');
  };

  const filteredProducts = POS_PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6">
      
      {/* Caja Cerrada / Estado de Alerta */}
      {(!caja || caja.status === 'closed') && (
        <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl text-center backdrop-blur-md max-w-lg mx-auto mt-12 shadow-2xl">
          <ShieldAlert className="h-14 w-14 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white">Terminal de Caja Cerrada</h2>
          <p className="text-slate-400 text-xs mt-2 mb-6">
            Para comenzar a vender, realizar arqueos de caja y emitir facturas, debés realizar el ciclo de apertura indicando el saldo en efectivo inicial disponible en gaveta.
          </p>
          <button
            onClick={() => setIsOpeningModalOpen(true)}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20"
          >
            Aperturar Caja Principal
          </button>
        </div>
      )}

      {/* Interfaz Activa de POS */}
      {caja && caja.status === 'open' && (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Panel Izquierdo: Productos y Búsqueda */}
          <div className="flex-1 flex flex-col gap-5">
            {/* Header POS */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between backdrop-blur-sm">
              <div>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-bold uppercase">
                  Terminal 01 Activa
                </span>
                <h2 className="font-black text-white text-base mt-1">{caja.name}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCajaMovementModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-750"
                >
                  Caja Chica
                </button>
                <button
                  onClick={() => setIsClosingModalOpen(true)}
                  className="px-3.5 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-xl text-xs font-bold border border-red-900/20"
                >
                  Cerrar Caja
                </button>
              </div>
            </div>

            {/* Buscador & Scanner status */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por código de barra, SKU o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
              />
            </div>

            {/* Grid de Productos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl text-left flex flex-col justify-between hover:shadow-lg transition-all group"
                >
                  <div>
                    <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {prod.sku}
                    </span>
                    <h4 className="font-bold text-sm text-slate-200 mt-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {prod.name}
                    </h4>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-[10px] text-slate-500 font-bold">IVA {prod.vat_rate}%</span>
                    <span className="font-extrabold text-base text-cyan-400">${prod.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Panel Derecho: Ticket de Compra / Cobro */}
          <div className="w-full lg:w-[420px] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl h-[fit-content]">
            
            {/* Cabecera Ticket */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-black text-white text-sm">Ticket Actual</h3>
                </div>
                <span className="text-xs bg-slate-850 text-slate-400 px-2 py-1 rounded font-bold">
                  {cart.reduce((acc, curr) => acc + curr.quantity, 0)} ítems
                </span>
              </div>

              {/* Items del Carrito */}
              {cart.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto py-3 space-y-3 border-b border-slate-850">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                      <div className="flex-1">
                        <h5 className="text-xs font-bold text-slate-200 line-clamp-1">{item.product.name}</h5>
                        <span className="text-[10px] text-slate-500 font-mono">${item.product.price.toFixed(2)}</span>
                      </div>
                      
                      {/* Controles cantidad */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-white min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-slate-650 hover:text-red-400 rounded-lg hover:bg-red-950/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs border-b border-slate-850 border-dashed">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  El carrito está vacío. Escaneá o seleccioná un producto.
                </div>
              )}
            </div>

            {/* Ajustes del Cobro */}
            <div className="py-4 space-y-4">
              {/* Condición Fiscal del Cliente */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Comprobante Tipo</label>
                <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-lg text-[11px]">
                  <button
                    onClick={() => setClientType('Consumidor Final')}
                    className={`flex-1 py-1.5 rounded font-semibold ${clientType === 'Consumidor Final' ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                  >
                    Ticket B/C (Consumidor Final)
                  </button>
                  <button
                    onClick={() => setClientType('Responsable Inscripto')}
                    className={`flex-1 py-1.5 rounded font-semibold ${clientType === 'Responsable Inscripto' ? 'bg-slate-850 text-white' : 'text-slate-500'}`}
                  >
                    Factura A (Responsable Inscripto)
                  </button>
                </div>
              </div>

              {/* FASE 3: Selector de Cliente Registrado (Para Cta Cte y Fidelidad) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Socio / Cliente Registrado</label>
                <select
                  value={selectedClientName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedClientName(val);
                    if (val === 'Horacio Quiroga') {
                      setClientAccountBalance(22000);
                      setClientAccountLimit(50000);
                    } else if (val === 'Clara Vignolo') {
                      setClientAccountBalance(14500);
                      setClientAccountLimit(80000);
                    } else if (val === 'Esteban Gomez') {
                      setClientAccountBalance(3200);
                      setClientAccountLimit(20000);
                    } else {
                      setClientAccountBalance(0);
                      setClientAccountLimit(0);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2.5 text-slate-300 text-xs focus:outline-none"
                >
                  <option value="Consumidor Final">Consumidor Final (Sin registrar)</option>
                  <option value="Horacio Quiroga">Horacio Quiroga (Silver - Cta Cte)</option>
                  <option value="Clara Vignolo">Clara Vignolo (Gold - Cta Cte)</option>
                  <option value="Esteban Gomez">Esteban Gomez (Bronze - Cta Cte)</option>
                </select>
                
                {selectedClientName !== 'Consumidor Final' && (
                  <div className="mt-1.5 px-2.5 py-1 bg-slate-950/60 rounded border border-slate-850 text-[9px] text-slate-400 font-mono flex justify-between">
                    <span>Deuda Cta Cte: <strong>${clientAccountBalance.toFixed(2)}</strong></span>
                    <span>Límite: <strong>${clientAccountLimit.toFixed(2)}</strong></span>
                  </div>
                )}
              </div>

              {/* Descuento, Cupón y Método de Pago */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descuento (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 text-xs text-center"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    disabled={isSplitPayment}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2 text-slate-300 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta Débito/Crédito</option>
                    <option value="transfer">Transferencia</option>
                    <option value="mercadopago">Mercado Pago Point</option>
                    <option value="cta_cte">Cuenta Corriente (Fiado)</option>
                  </select>
                </div>
              </div>

              {/* FASE 3: Aplicación de Cupones Promocionales */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cupón Promocional</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCoupon}
                    onChange={(e) => {
                      const code = e.target.value.toUpperCase();
                      setPromoCoupon(code);
                      try {
                        const saved = localStorage.getItem('aura_coupons');
                        const activeCoupons = saved ? JSON.parse(saved) : [
                          { code: 'VERANO26', discount: 15, active: true },
                          { code: 'CONSCIENTE', discount: 10, active: true },
                          { code: 'SASS2026', discount: 20, active: true }
                        ];
                        const found = activeCoupons.find((c: any) => c.code === code && c.active !== false);
                        if (found) {
                          setCouponDiscountPercent(found.discount);
                        } else {
                          setCouponDiscountPercent(0);
                        }
                      } catch (err) {
                        if (code === 'VERANO26') setCouponDiscountPercent(15);
                        else if (code === 'CONSCIENTE') setCouponDiscountPercent(10);
                        else if (code === 'SASS2026') setCouponDiscountPercent(20);
                        else setCouponDiscountPercent(0);
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs font-mono"
                    placeholder="Ej: VERANO26"
                  />
                  {couponDiscountPercent > 0 && (
                    <span className="px-2.5 py-2 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[10px] rounded-xl font-bold flex items-center shrink-0">
                      -{couponDiscountPercent}% OFF
                    </span>
                  )}
                </div>
              </div>

              {/* FASE 3: Checkbox Pago Combinado */}
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSplitPayment}
                    onChange={(e) => {
                      setIsSplitPayment(e.target.checked);
                      if (e.target.checked) {
                        setPaymentMethod('cash'); // Reset to default when split
                        setSplitCash(String(Math.floor(cartTotal / 2)));
                        setSplitCard(String(Math.ceil(cartTotal / 2)));
                        setSplitTransfer('');
                      }
                    }}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 h-4 w-4"
                  />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dividir cobro (Pago Combinado)</span>
                </label>

                {isSplitPayment && (
                  <div className="space-y-2 pt-1 border-t border-slate-850">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Efectivo ($)</label>
                        <input
                          type="number"
                          value={splitCash}
                          onChange={(e) => setSplitCash(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-slate-200 text-xs font-mono text-center"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tarjeta ($)</label>
                        <input
                          type="number"
                          value={splitCard}
                          onChange={(e) => setSplitCard(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-slate-200 text-xs font-mono text-center"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Transf. ($)</label>
                        <input
                          type="number"
                          value={splitTransfer}
                          onChange={(e) => setSplitTransfer(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-slate-200 text-xs font-mono text-center"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {(() => {
                      const sum = (Number(splitCash) || 0) + (Number(splitCard) || 0) + (Number(splitTransfer) || 0);
                      const diff = cartTotal - sum;
                      const isMatched = Math.abs(diff) < 0.05;
                      return (
                        <div className={`text-[9px] font-mono text-center ${isMatched ? 'text-emerald-450' : 'text-amber-500'}`}>
                          {isMatched ? 'Monto completo distribuido.' : `Pendiente de asignar: $${diff.toFixed(2)}`}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

            </div>

            {/* Resumen e Importes */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850 space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal:</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Descuento Manual ({discount}%):</span>
                  <span>-${((cartSubtotal * discount) / 100).toFixed(2)}</span>
                </div>
              )}
              {couponDiscountPercent > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Descuento Cupón ({couponDiscountPercent}%):</span>
                  <span>-${((cartSubtotal * couponDiscountPercent) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500">
                <span>IVA estimado (incluido):</span>
                <span>${cartTaxAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end pt-2 border-t border-slate-850">
                <span className="font-extrabold text-white text-sm uppercase">Total Cobrar:</span>
                <span className="text-2xl font-black text-cyan-400">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkbox para ARCA */}
            <div className="flex items-center gap-2 mb-4 px-1.5">
              <input
                type="checkbox"
                id="check-arca"
                checked={shouldInvoiceARCA}
                onChange={(e) => setShouldInvoiceARCA(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-cyan-500 h-4 w-4"
              />
              <label htmlFor="check-arca" className="text-[10px] text-slate-400 cursor-pointer">
                Solicitar CAE inmediato en ARCA / AFIP (Factura Electrónica)
              </label>
            </div>

            {/* Botón Cobrar */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl text-white font-bold text-sm transition-all duration-200 ${
                cart.length > 0 
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/10' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
              }`}
            >
              Confirmar y Cobrar (${cartTotal.toFixed(2)})
            </button>
          </div>
        </div>
      )}

      {/* Modal Apertura de Caja */}
      {isOpeningModalOpen && (!caja || caja.status === 'closed') && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2">Ciclo de Caja - Apertura</h3>
            <p className="text-slate-400 text-xs mb-5">
              Ingresá el saldo en efectivo inicial disponible en la gaveta de caja para control de arqueo diario.
            </p>

            <form onSubmit={handleOpenCaja} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Saldo de Apertura (Efectivo)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="number"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 text-base focus:outline-none focus:border-cyan-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg"
                >
                  Abrir Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimiento de Caja Chica */}
      {isCajaMovementModalOpen && caja && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">Movimiento de Caja Chica</h3>
              <button onClick={() => setIsCajaMovementModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordCajaMovement} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Movimiento</label>
                <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setCajaMovementType('cash_out')}
                    className={`flex-1 py-2 rounded font-semibold flex items-center justify-center gap-1.5 ${cajaMovementType === 'cash_out' ? 'bg-slate-850 text-red-400' : 'text-slate-500'}`}
                  >
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    Retirar / Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setCajaMovementType('cash_in')}
                    className={`flex-1 py-2 rounded font-semibold flex items-center justify-center gap-1.5 ${cajaMovementType === 'cash_in' ? 'bg-slate-850 text-emerald-400' : 'text-slate-500'}`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Ingresar / Refuerzo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={cajaMovementAmount}
                  onChange={(e) => setCajaMovementAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Concepto / Motivo</label>
                <textarea
                  required
                  value={cajaMovementNotes}
                  onChange={(e) => setCajaMovementNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Pago a repartidor de refrescos"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
              >
                Confirmar Registro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cierre de Caja (Arqueo) */}
      {isClosingModalOpen && caja && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-black text-white">Arqueo y Cierre de Caja</h3>
              <button onClick={() => setIsClosingModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-slate-400 text-xs mb-5">
              Por favor, contá el efectivo físico de la gaveta e ingresá el total para verificar discrepancias contables.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1.5 mb-5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Saldo Inicial:</span>
                <span>${caja.opening_balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Retiros/Ingresos manuales:</span>
                <span className={cajaMovements.reduce((acc, curr) => acc + curr.amount, 0) < 0 ? 'text-red-400' : 'text-emerald-400'}>
                  ${cajaMovements.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1.5 border-t border-slate-850">
                <span>Esperado en Efectivo:</span>
                <span>${calculateTheoreticalCashBalance().toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseCaja} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Efectivo Real Recaudado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingBalanceInput}
                  onChange={(e) => setClosingBalanceInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 text-base focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl"
              >
                Cerrar Turno de Caja
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simulación de Mercado Pago Point */}
      {mpStatus !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <Smartphone className="h-16 w-16 text-cyan-400 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-black text-white mb-2">Conexión Mercado Pago Point</h3>
            <p className="text-cyan-400 text-sm font-semibold mb-2">{mpStatus === 'sending' ? 'Enviando...' : mpStatus === 'waiting' ? 'Esperando Tarjeta...' : 'Aprobado!'}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{mpMessage}</p>
            
            {mpStatus === 'waiting' && (
              <div className="mt-6 flex justify-center gap-1">
                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce delay-200"></span>
                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce delay-300"></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Éxito Venta y Factura Electrónica ARCA */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-center shadow-2xl">
            <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-white">Venta Procesada</h3>
            <p className="text-slate-400 text-xs mt-1 mb-6">El cobro ha sido registrado en la caja.</p>

            {shouldInvoiceARCA ? (
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-950/40 text-left space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estado Factura ARCA</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                    CAE APROBADO
                  </span>
                </div>
                <div className="text-xs text-slate-350 space-y-1">
                  <p><strong>Comprobante:</strong> Factura {clientType === 'Responsable Inscripto' ? 'A 0001-00002130' : 'B 0001-00005423'}</p>
                  <p><strong>CAE:</strong> 76239401827364</p>
                  <p><strong>Vence:</strong> {new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
                <div className="pt-2 flex gap-2">
                  <button 
                    onClick={() => alert('Abriendo PDF oficial de ARCA con código QR...')}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold text-slate-300 rounded-xl"
                  >
                    Ver Comprobante (PDF)
                  </button>
                  <button 
                    onClick={() => alert('Simulación: Comprobante enviado por WhatsApp al cliente.')}
                    className="py-2 px-3 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/20 text-[11px] font-bold text-emerald-400 rounded-xl"
                  >
                    Enviar WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-left text-xs text-slate-400 mb-6">
                Venta registrada únicamente como comprobante no fiscal interno de preventa.
              </div>
            )}

            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
            >
              Entendido / Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
