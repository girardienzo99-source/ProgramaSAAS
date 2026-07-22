"use client";

import React, { useMemo, useState } from "react";
import {
  ShoppingCart,
  Barcode,
  Scale,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  X,
  LayoutGrid,
  DollarSign,
  ArrowRightLeft,
  ShieldAlert,
  Printer,
  Trash,
  RefreshCw,
  Calculator,
  User,
  Award,
  ListFilter,
  Search,
} from "lucide-react";
import { decodeScaleEan13 } from "@/lib/domain/operationalCalculations";

type SupermarketCategory =
  | "almacen"
  | "bebidas"
  | "lacteos"
  | "carniceria"
  | "verduleria"
  | "limpieza"
  | "panaderia";
type SupermarketPromo = "none" | "2x1" | "30off";
type SupermarketUnit = "kg" | "unit";
type PaymentMethod = "Efectivo" | "QR MercadoPago";
type Feedback = { type: "success" | "error"; message: string } | null;

export interface SupermarketProduct {
  id: string;
  name: string;
  price: number;
  cost: number;
  barcode: string;
  isWeighed: boolean;
  unit: SupermarketUnit;
  category: SupermarketCategory;
  expirationDate: string;
  daysToExpire: number;
  promo: SupermarketPromo;
  stock: number;
  minStock: number;
  supplier: string;
  imageUrl?: string | null;
  active?: boolean;
  scaleCode?: string;
  scalePrefix?: "20" | "21";
}

interface CartItem {
  product: SupermarketProduct;
  qty: number;
  weight?: number;
  subtotal: number;
}

export const SUPERMARKET_PRODUCTS: SupermarketProduct[] = [
  {
    id: "s1",
    name: "Leche Entera La Serenísima 1L",
    price: 1800,
    cost: 1200,
    barcode: "779123456001",
    isWeighed: false,
    unit: "unit",
    category: "lacteos",
    expirationDate: "2026-07-28",
    daysToExpire: 18,
    promo: "none",
    stock: 120,
    minStock: 20,
    supplier: "Mastellone SA",
  },
  {
    id: "s2",
    name: "Queso Cremoso La Paulina (Trozado)",
    price: 8500,
    cost: 5800,
    barcode: "779123456002",
    isWeighed: true,
    unit: "kg",
    category: "lacteos",
    expirationDate: "2026-07-12",
    daysToExpire: 2,
    promo: "30off",
    stock: 8,
    minStock: 15,
    supplier: "La Paulina SRL",
  },
  {
    id: "s3",
    name: "Coca Cola Original 2.25L",
    price: 3400,
    cost: 2100,
    barcode: "779123456003",
    isWeighed: false,
    unit: "unit",
    category: "bebidas",
    expirationDate: "2026-09-15",
    daysToExpire: 65,
    promo: "2x1",
    stock: 250,
    minStock: 50,
    supplier: "Femsa S.A.",
  },
  {
    id: "s4",
    name: "Manzana Red Delicius",
    price: 2800,
    cost: 1600,
    barcode: "779123456004",
    isWeighed: true,
    unit: "kg",
    category: "verduleria",
    expirationDate: "2026-07-15",
    daysToExpire: 5,
    promo: "none",
    stock: 12,
    minStock: 30,
    supplier: "Central Frutera",
  },
  {
    id: "s5",
    name: "Detergente Ala Platos 500ml",
    price: 2100,
    cost: 1400,
    barcode: "779123456005",
    isWeighed: false,
    unit: "unit",
    category: "limpieza",
    expirationDate: "2027-02-10",
    daysToExpire: 200,
    promo: "none",
    stock: 45,
    minStock: 10,
    supplier: "Unilever Arg",
  },
  {
    id: "s6",
    name: "Mignon de Panadería (Bolsa)",
    price: 2500,
    cost: 1500,
    barcode: "779123456006",
    isWeighed: true,
    unit: "kg",
    category: "panaderia",
    expirationDate: "2026-07-11",
    daysToExpire: 1,
    promo: "none",
    stock: 5,
    minStock: 25,
    supplier: "PanSur Distribuidora",
  },
];

const DEFAULT_SCALE_CODES: Record<
  string,
  { code: string; prefix: "20" | "21" }
> = {
  s2: { code: "00002", prefix: "20" },
  s4: { code: "00004", prefix: "20" },
  s6: { code: "00006", prefix: "20" },
};

interface SaleRecord {
  id: string;
  timestamp: string;
  itemsCount: number;
  total: number;
  paymentMethod: PaymentMethod;
  margin: number;
}

interface VoidLog {
  id: string;
  timestamp: string;
  productName: string;
  reason: string;
  value: number;
}

export interface SupermarketCashState {
  isOpen: boolean;
  cashId: string | null;
  openingBalance: number;
  expectedCash: number;
  salesTotal: number;
  cashPayments: number;
  qrPayments: number;
  ticketCount: number;
  openedAt: string | null;
}

export interface SupermarketSaleResult {
  saleId: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  discount: number;
  fiscalStatus: string;
  duplicate: boolean;
}

interface SupermarketConsoleProps {
  products?: SupermarketProduct[];
  cashState?: SupermarketCashState;
  onSaleCommitted?: (input: {
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: "cash" | "qr";
    idempotencyKey: string;
  }) => Promise<SupermarketSaleResult>;
  onCashOpened?: (openingBalance: number) => Promise<void>;
  onCashClosed?: (declaredCash: number) => Promise<{ difference: number }>;
  onReturnRegistered?: (input: {
    barcode: string;
    quantity: number;
    reason: string;
    disposition: "restock" | "waste";
    idempotencyKey: string;
  }) => Promise<{ productName: string }>;
  onNavigatePurchases?: () => void;
}

export default function SupermarketConsole({
  products = SUPERMARKET_PRODUCTS,
  cashState,
  onSaleCommitted,
  onCashOpened,
  onCashClosed,
  onReturnRegistered,
  onNavigatePurchases,
}: SupermarketConsoleProps) {
  const [localProducts, setLocalProducts] =
    useState<SupermarketProduct[]>(products);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSupplier, setActiveSupplier] = useState<string>("all");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [simulatedWeight, setSimulatedWeight] = useState(1.0);

  // Caja y Arqueo
  const cashDrawerOpen = cashState?.isOpen ?? false;
  const cashBalance = cashState?.expectedCash ?? 0;
  const cashierName = "Usuario actual";
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [voidLogs, setVoidLogs] = useState<VoidLog[]>([]);
  const [processing, setProcessing] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Modal Arqueo de Caja
  const [isArqueoOpen, setIsArqueoOpen] = useState(false);
  const [countedCash, setCountedCash] = useState(0);

  // Modal Ticket Termico
  const [printedTicketText, setPrintedTicketText] = useState<string | null>(
    null,
  );

  // Form Devolución
  const [returnBarcode, setReturnBarcode] = useState("");
  const [returnReason, setReturnReason] = useState("Vencimiento / Mal Estado");

  // Multiplicador del POS rápido
  const [posMultiplier, setPosMultiplier] = useState(1);

  const handleAddProduct = (
    prod: SupermarketProduct,
    explicitQty: number = 1,
    explicitWeightKg?: number,
  ) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      let newQty = explicitQty;
      const unitWeight = explicitWeightKg ?? simulatedWeight;
      let newWeight = unitWeight * explicitQty;

      if (existing) {
        newQty = existing.qty + explicitQty;
        newWeight = (existing.weight || 0) + unitWeight * explicitQty;
      }

      let unitPrice = prod.price;
      if (prod.promo === "30off") {
        unitPrice = prod.price * 0.7;
      }

      let subtotal = prod.isWeighed
        ? newWeight * unitPrice
        : newQty * unitPrice;

      if (prod.promo === "2x1" && !prod.isWeighed) {
        subtotal = (Math.floor(newQty / 2) + (newQty % 2)) * unitPrice;
      }

      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id
            ? {
                ...item,
                qty: newQty,
                weight: prod.isWeighed ? newWeight : undefined,
                subtotal,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          product: prod,
          qty: newQty,
          weight: prod.isWeighed ? newWeight : undefined,
          subtotal,
        },
      ];
    });
    setPosMultiplier(1); // reset multiplier
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;

    // Los prefijos internos de balanza requieren checksum y un PLU configurado por producto.
    if (
      (barcodeInput.startsWith("20") || barcodeInput.startsWith("21")) &&
      barcodeInput.length === 13
    ) {
      const decoded = decodeScaleEan13(barcodeInput);
      if (!decoded || decoded.encodedValue <= 0) {
        setFeedback({
          type: "error",
          message:
            "Etiqueta de balanza invalida: verifica el checksum y el peso.",
        });
        return;
      }
      const productCode = decoded.productCode;
      const weightKg = decoded.encodedValue / 1000;

      const prod = localProducts.find((product) => {
        const scaleConfig =
          product.scaleCode && product.scalePrefix
            ? { code: product.scaleCode, prefix: product.scalePrefix }
            : DEFAULT_SCALE_CODES[product.id];
        return (
          product.isWeighed &&
          scaleConfig?.code === productCode &&
          scaleConfig.prefix === decoded.prefix
        );
      });
      if (prod) {
        setSimulatedWeight(weightKg);
        handleAddProduct(prod, 1, weightKg);
        setBarcodeInput("");
        setFeedback({
          type: "success",
          message: `Balanza EAN-13 leída: ${prod.name} - Peso extraído: ${weightKg.toFixed(3)} kg`,
        });
        return;
      }
      setFeedback({
        type: "error",
        message: `El PLU ${productCode} no está asociado a un producto pesable.`,
      });
      return;
    }

    const prod = localProducts.find(
      (p) => p.barcode === barcodeInput || p.id === barcodeInput,
    );
    if (prod) {
      handleAddProduct(prod, posMultiplier);
      setBarcodeInput("");
    } else {
      setFeedback({
        type: "error",
        message: "Código de barras no reconocido.",
      });
    }
  };

  const handleCancelItem = (prodId: string) => {
    const item = cart.find((i) => i.product.id === prodId);
    if (item) {
      const log: VoidLog = {
        id: `void-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString().slice(0, 8),
        productName: item.product.name,
        reason: "Anulación manual cajero",
        value: item.subtotal,
      };
      setVoidLogs((prev) => [log, ...prev]);
    }
    setCart((prev) => prev.filter((item) => item.product.id !== prodId));
  };

  const handleCheckout = async (method: PaymentMethod) => {
    if (cart.length === 0 || processing || !onSaleCommitted) return;
    const margin = cart.reduce((sum, item) => {
      const cost = item.product.isWeighed
        ? (item.weight || 0) * item.product.cost
        : item.qty * item.product.cost;
      return sum + item.subtotal - cost;
    }, 0);
    const items = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.product.isWeighed ? item.weight || 0 : item.qty,
    }));
    setProcessing(true);
    try {
      const result = await onSaleCommitted({
        items,
        paymentMethod: method === "Efectivo" ? "cash" : "qr",
        idempotencyKey: `supermarket-sale:${crypto.randomUUID()}`,
      });
      const sale: SaleRecord = {
        id: result.saleId,
        timestamp: new Date().toLocaleTimeString().slice(0, 8),
        itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
        total: result.total,
        paymentMethod: method,
        margin,
      };
      setSalesHistory((current) =>
        current.some((item) => item.id === sale.id)
          ? current
          : [sale, ...current],
      );
      const ticketItems = cart
        .map(
          (item) =>
            `${item.product.name.slice(0, 24)} x${item.qty} $${item.subtotal.toLocaleString()}`,
        )
        .join("\n");
      setPrintedTicketText(
        `COMPROBANTE INTERNO\nOperación: ${result.saleId.slice(0, 8)}\nCajero: ${cashierName}\nFecha: ${new Date().toLocaleString()}\n\n${ticketItems}\n\nTotal: $${result.total.toLocaleString()}\nMedio: ${method}\n\nEstado fiscal: pendiente de ARCA`,
      );
      setCart([]);
      setFeedback({
        type: "success",
        message: `Venta confirmada con ${method}. Stock y caja actualizados.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar la venta.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRegisterReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onReturnRegistered || processing) return;
    setProcessing(true);
    try {
      const result = await onReturnRegistered({
        barcode: returnBarcode,
        quantity: 1,
        reason: returnReason,
        disposition:
          returnReason === "Cambio de Producto" ? "restock" : "waste",
        idempotencyKey: `supermarket-return:${crypto.randomUUID()}`,
      });
      const product = localProducts.find(
        (item) => item.barcode === returnBarcode,
      );
      setVoidLogs((current) => [
        {
          id: `ret-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString().slice(0, 8),
          productName: `DEVOLUCIÓN: ${result.productName}`,
          reason: returnReason,
          value: -(product?.price ?? 0),
        },
        ...current,
      ]);
      setReturnBarcode("");
      setFeedback({
        type: "success",
        message: `Devolución de ${result.productName} auditada.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la devolución.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenCash = async () => {
    if (!onCashOpened || processing) return;
    setProcessing(true);
    try {
      await onCashOpened(openingBalance);
      setCountedCash(openingBalance);
      setFeedback({
        type: "success",
        message: "Caja abierta y lista para operar.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo abrir la caja.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseCash = async () => {
    if (!onCashClosed || processing) return;
    setProcessing(true);
    try {
      const result = await onCashClosed(countedCash);
      setIsArqueoOpen(false);
      setFeedback({
        type: Math.abs(result.difference) <= 0.01 ? "success" : "error",
        message: `Caja cerrada. Diferencia de arqueo: $${result.difference.toLocaleString()}.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo cerrar la caja.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const cartTotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Filtrado de productos
  const filteredProducts = useMemo(
    () =>
      localProducts
        .filter((p) => p.active !== false)
        .filter((p) => {
          const matchSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode.includes(searchTerm);
          const matchCategory =
            activeCategory === "all" || p.category === activeCategory;
          const matchSupplier =
            activeSupplier === "all" || p.supplier === activeSupplier;
          return matchSearch && matchCategory && matchSupplier;
        }),
    [activeCategory, activeSupplier, localProducts, searchTerm],
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-emerald-450 animate-pulse" />
          <div>
            <h1 className="text-xl font-black text-white">
              Terminal POS de Alta Velocidad (Caja Rápida)
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Control de arqueos de caja, anulaciones, devoluciones de
              mercadería y promociones.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setCountedCash(cashBalance);
              setIsArqueoOpen(true);
            }}
            disabled={!cashDrawerOpen || processing}
            className="flex-1 lg:flex-none px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-slate-900"
          >
            <Calculator className="h-4 w-4 text-cyan-400" />
            Arqueo de Caja
          </button>

          {!cashDrawerOpen && (
            <input
              type="number"
              min="0"
              aria-label="Saldo inicial de caja"
              value={openingBalance}
              onChange={(event) =>
                setOpeningBalance(Number(event.target.value))
              }
              className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
          )}
          <button
            onClick={
              cashDrawerOpen
                ? () => {
                    setCountedCash(cashBalance);
                    setIsArqueoOpen(true);
                  }
                : handleOpenCash
            }
            disabled={processing}
            className={`flex-1 lg:flex-none px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
              cashDrawerOpen
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            {processing
              ? "Procesando..."
              : cashDrawerOpen
                ? `Caja abierta (${cashierName})`
                : "Abrir caja"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-500/25 bg-emerald-950/20 text-emerald-300"
              : "border-rose-500/25 bg-rose-950/20 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-950 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Métricas Económicas & Margen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Ventas del Día
          </span>
          <span className="text-xl font-black text-white mt-1 block">
            ${(cashState?.salesTotal ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Margen Estimado
          </span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            $
            {salesHistory
              .reduce((acc, curr) => acc + curr.margin, 0)
              .toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Tickets Emitidos
          </span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {cashState?.ticketCount ?? 0}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Stock Crítico
          </span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {localProducts.filter((p) => p.stock < p.minStock).length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-amber-400 font-bold uppercase block">
            Liquidación 24h Vencimiento
          </span>
          <span className="text-xl font-black text-amber-400 mt-1 block">
            {localProducts.filter((p) => p.daysToExpire <= 2).length} Ítems (50% Off)
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Anulaciones
          </span>
          <span className="text-xl font-black text-amber-500 mt-1 block">
            {voidLogs.length}
          </span>
        </div>
      </div>

      {/* Alertas Críticas */}
      {localProducts.some((p) => p.daysToExpire <= 5) && (
        <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-550 animate-pulse" />
            <span>
              Alerta de Góndola: Existen productos por vencer en menos de 5
              días.
            </span>
          </div>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1 col-span-1 sm:col-span-2">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Buscar Producto por EAN / Nombre
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none"
            />
            <Search className="h-3.5 w-3.5 text-slate-650 absolute left-2.5 top-3" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Categoría Góndola
          </label>
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todas las Categorías</option>
            <option value="lacteos">Lácteos</option>
            <option value="bebidas">Bebidas</option>
            <option value="verduleria">Verdulería</option>
            <option value="limpieza">Limpieza</option>
            <option value="panaderia">Panadería</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Proveedor Distribuidor
          </label>
          <select
            value={activeSupplier}
            onChange={(e) => setActiveSupplier(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Proveedores</option>
            <option value="Mastellone SA">Mastellone SA</option>
            <option value="Femsa S.A.">Femsa S.A.</option>
            <option value="Unilever Arg">Unilever Arg</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Góndola y Teclado POS */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Escáner de Entrada */}
            <form
              onSubmit={handleBarcodeSubmit}
              className="bg-slate-900/40 p-5 rounded-3xl border border-slate-850 space-y-3"
            >
              <label className="text-[10px] text-slate-500 font-bold uppercase block">
                Simulador Pistola / EAN Manual
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribir EAN (ej. 779123456001)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Escanear
                </button>
              </div>

              {/* Multiplicador rápido */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 font-bold">Multiplicador:</span>
                <div className="flex gap-1.5">
                  {[1, 2, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPosMultiplier(n)}
                      className={`px-3 py-1 rounded-lg border text-[10px] font-bold ${
                        posMultiplier === n
                          ? "bg-cyan-600 text-slate-950 border-cyan-500"
                          : "bg-slate-950 border-slate-850 text-slate-400"
                      }`}
                    >
                      x{n}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Balanza de Góndola */}
            <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-850 space-y-3">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">
                Balanza de Pesaje ($ / KG)
              </label>
              <div className="flex items-center justify-between">
                <span className="font-mono text-cyan-400 font-bold text-lg bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  {simulatedWeight.toFixed(3)} KG
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      setSimulatedWeight((w) => Math.max(0.1, w - 0.25))
                    }
                    className="p-2 bg-slate-950 rounded-lg text-[10px] border border-slate-850 hover:bg-slate-900"
                  >
                    -250g
                  </button>
                  <button
                    onClick={() => setSimulatedWeight((w) => w + 0.25)}
                    className="p-2 bg-slate-950 rounded-lg text-[10px] border border-slate-850 hover:bg-slate-900"
                  >
                    +250g
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Góndola */}
          <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-850 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Góndola Comercial
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isCritical = p.stock < p.minStock;
                const isExpiring = p.daysToExpire <= 5;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddProduct(p, posMultiplier)}
                    className="p-3 bg-slate-950/40 border border-slate-850 hover:border-cyan-500/50 rounded-xl text-left flex justify-between items-center text-xs transition-all cursor-pointer"
                  >
                    <div>
                      <span className="font-extrabold text-white block">
                        {p.name}
                      </span>
                      <div className="flex gap-1 items-center mt-1">
                        {p.promo !== "none" && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-300 uppercase border border-indigo-500/20">
                            {p.promo === "2x1" ? "2x1" : "30% Off"}
                          </span>
                        )}
                        {isCritical && (
                          <span className="text-[8px] text-rose-400 font-bold uppercase">
                            Reponer
                          </span>
                        )}
                        {isExpiring && (
                          <span className="text-[8px] text-amber-550 font-bold uppercase">
                            Vence Pronto
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-cyan-400 font-black">
                        ${p.price.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-550 block">
                        Stock: {p.stock}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Devolución de Mercadería */}
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-850 space-y-3">
            <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">
              Devolución / Rechazo de Producto
            </span>
            <form
              onSubmit={handleRegisterReturn}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <input
                type="text"
                required
                placeholder="Escribir EAN..."
                value={returnBarcode}
                onChange={(e) => setReturnBarcode(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Vencimiento / Mal Estado">
                  Mal Estado / Vencido
                </option>
                <option value="Cambio de Producto">Cambio de Producto</option>
              </select>
              <button
                type="submit"
                className="py-2 bg-slate-955 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Registrar Devolución
              </button>
            </form>
          </div>
        </div>

        {/* Detalle Ticket POS */}
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 flex flex-col justify-between min-h-[520px]">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-850">
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
                Detalle de Ticket
              </h3>
              <button
                onClick={() => setCart([])}
                className="text-[9px] text-rose-450 hover:underline"
              >
                Vaciar Todo
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-24 text-slate-650 text-xs italic">
                  Escanear código de barras o presionar productos de la góndola
                  comercial.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-850"
                  >
                    <div className="flex-1 pr-2">
                      <span className="text-slate-200 block font-semibold">
                        {item.product.name}
                      </span>
                      {item.product.isWeighed ? (
                        <span className="text-[9px] text-slate-500">
                          {item.weight?.toFixed(3)} kg x ${item.product.price}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">
                          {item.qty} uds x ${item.product.price}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-slate-250">
                        ${item.subtotal.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleCancelItem(item.product.id)}
                        className="p-1 hover:bg-rose-950 hover:text-rose-400 text-slate-650 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Acciones de Cobro */}
          <div className="pt-4 border-t border-slate-850 space-y-4">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-450">TOTAL TICKET</span>
              <span className="text-xl font-black text-cyan-400">
                ${cartTotal.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCheckout("Efectivo")}
                disabled={cart.length === 0 || !cashDrawerOpen || processing}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 font-bold rounded-xl text-[10px] uppercase transition-all disabled:opacity-50"
              >
                Cobrar Efectivo
              </button>
              <button
                onClick={() => handleCheckout("QR MercadoPago")}
                disabled={cart.length === 0 || !cashDrawerOpen || processing}
                className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-[10px] uppercase transition-all disabled:opacity-50"
              >
                Cobrar QR/Tarjeta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bitácora de Anulaciones & Devoluciones */}
      <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-850 space-y-4">
        <h3 className="font-extrabold text-sm text-white uppercase tracking-wider block border-b border-slate-900 pb-3">
          Historial de Anulaciones y Devoluciones (Auditoría Cajero)
        </h3>

        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
          {voidLogs.length === 0 ? (
            <span className="text-xs text-slate-600 italic block">
              No se registraron anulaciones ni devoluciones en este turno de
              caja.
            </span>
          ) : (
            voidLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-900 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="text-[11px] font-black text-slate-300 block">
                    {log.productName}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Causa: {log.reason}
                  </span>
                </div>
                <span className="text-[10px] text-rose-500 font-bold shrink-0">
                  -${Math.abs(log.value).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FASE 3: Gestión Anti-Desperdicio & Reposición a Proveedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visor de Lotes y Vencimientos */}
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider block border-b border-slate-900 pb-3 flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
            Lotes & Alertas de Vencimiento (Góndola Segura)
          </h3>

          <div className="space-y-3">
            {localProducts.map((p) => {
              const statusColor =
                p.daysToExpire <= 2
                  ? "bg-rose-500/10 text-rose-455 border-rose-500/20"
                  : p.daysToExpire <= 5
                    ? "bg-amber-500/10 text-amber-450 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-455 border-emerald-500/20";

              return (
                <div
                  key={p.id}
                  className="p-3 bg-slate-950 rounded-2xl border border-slate-850 flex justify-between items-center text-xs font-mono"
                >
                  <div>
                    <span className="font-extrabold text-slate-200 block">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Fecha: {p.expirationDate} | Proveedor: {p.supplier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${statusColor}`}
                    >
                      {p.daysToExpire} Días
                    </span>
                    {p.daysToExpire <= 5 && !p.name.includes("(Liquidado)") && (
                      <button
                        onClick={() => {
                          setLocalProducts((prev) =>
                            prev.map((item) => {
                              if (item.id === p.id) {
                                return {
                                  ...item,
                                  name: `${item.name} (Liquidado)`,
                                  price: item.price * 0.5,
                                };
                              }
                              return item;
                            }),
                          );
                          setFeedback({
                            type: "success",
                            message: `Aplicado descuento del 50% por liquidación a ${p.name}.`,
                          });
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black rounded-lg transition-colors cursor-pointer"
                      >
                        Liquidar -50%
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reposición Automática a Proveedores */}
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider block border-b border-slate-900 pb-3 flex items-center gap-2">
            <RefreshCw className="h-4.5 w-4.5 text-cyan-400" />
            Solicitud de Reposición (Compra Centralizada)
          </h3>

          <div className="space-y-3">
            {localProducts.filter((p) => p.stock < p.minStock).length === 0 ? (
              <span className="text-xs text-slate-550 italic block py-4 text-center">
                Todos los productos cuentan con stock suficiente en góndola.
              </span>
            ) : (
              localProducts
                .filter((p) => p.stock < p.minStock)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-850 flex justify-between items-center text-xs font-mono"
                  >
                    <div>
                      <span className="font-extrabold text-slate-200 block">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Stock:{" "}
                        <strong className="text-rose-500">{p.stock}</strong> /
                        Min: {p.minStock} | Costo Unit: ${p.cost}
                      </span>
                    </div>
                    <button
                      onClick={onNavigatePurchases}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-550 text-slate-950 font-bold rounded-xl text-[9px] uppercase transition-colors cursor-pointer"
                    >
                      Generar compra
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Arqueo de Caja */}
      {isArqueoOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-900">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  ARQUEO DE CAJA DIARIO
                </h4>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Responsable: {cashierName}
                </span>
              </div>
              <button
                onClick={() => setIsArqueoOpen(false)}
                className="text-slate-400 hover:text-slate-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span>Efectivo Esperado (Caja)</span>
                <span className="font-bold text-slate-800">
                  ${cashBalance.toLocaleString()}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">
                  Efectivo Contado (Físico)
                </label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-3 text-xs">
                <span>Diferencia de Caja</span>
                <span
                  className={`font-black ${
                    countedCash - cashBalance === 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  ${(countedCash - cashBalance).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsArqueoOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={handleCloseCash}
                disabled={processing}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                {processing ? "Cerrando..." : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impresión Ticket */}
      {printedTicketText && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl text-slate-900">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Printer className="h-4.5 w-4.5 text-emerald-600" />
                COMPROBANTE INTERNO DE VENTA
              </h4>
              <button
                onClick={() => setPrintedTicketText(null)}
                className="text-slate-400 hover:text-slate-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-center">
              {printedTicketText}
            </p>

            <button
              onClick={() => {
                setFeedback({
                  type: "success",
                  message: "Comprobante térmico enviado a impresión.",
                });
                setPrintedTicketText(null);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Imprimir Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
