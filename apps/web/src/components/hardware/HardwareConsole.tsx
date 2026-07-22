"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  Truck,
  RefreshCw,
  Barcode,
  Layers,
  Plus,
  CheckCircle2,
  ChevronRight,
  X,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Search,
  Printer,
  Scale,
  Phone,
  ShieldAlert,
  ListFilter,
  Download,
  ArrowUpRight,
} from "lucide-react";
import { calculateCutPlan } from "@/lib/domain/operationalCalculations";

type HardwareCategory =
  "cemento" | "arena" | "hierro" | "cables" | "pinturas" | "buloneria";
type DispatchStatus =
  "pending" | "preparing" | "loaded" | "in_route" | "delivered";
type Feedback = { type: "success" | "error"; message: string } | null;

const DISPATCH_STATUSES: DispatchStatus[] = [
  "pending",
  "preparing",
  "loaded",
  "in_route",
  "delivered",
];

function isDispatchStatus(value: string): value is DispatchStatus {
  return DISPATCH_STATUSES.includes(value as DispatchStatus);
}

interface ConversionRule {
  id: string;
  itemName: string;
  sourceUnit: string;
  targetUnit: string;
  factor: number;
  currentSourceQty: number;
}

interface DispatchOrder {
  id: string;
  client: string;
  address: string;
  items: string;
  truckAssigned: string;
  status: DispatchStatus;
  remitoNumber: string;
  driverName: string;
  driverPhone: string;
  estimatedWeightKg: number;
  maxWeightAllowedKg: number;
}

export interface HardwareProduct {
  id: string;
  name: string;
  category: HardwareCategory;
  price: number;
  unitWeightKg: number;
  stockDeposito: number;
  stockMostrador: number;
  stockEnReparto: number;
  unit: string;
  cost?: number;
  sku?: string;
  barcode?: string;
  minStock?: number;
  supplier?: string;
  imageUrl?: string | null;
  active?: boolean;
}

interface QuoteItem {
  product: HardwareProduct;
  qty: number;
}

export const HARDWARE_PRODUCTS: HardwareProduct[] = [
  {
    id: "p1",
    name: "Cemento Portland Loma Negra 50kg",
    category: "cemento",
    price: 6200,
    unitWeightKg: 50,
    stockDeposito: 240,
    stockMostrador: 15,
    stockEnReparto: 40,
    unit: "Bolsa",
  },
  {
    id: "p2",
    name: "Arena Fina Lavada M³",
    category: "arena",
    price: 18000,
    unitWeightKg: 1500,
    stockDeposito: 12,
    stockMostrador: 0,
    stockEnReparto: 4,
    unit: "M³",
  },
  {
    id: "p3",
    name: "Hierro Del 8 Aletado 6m",
    category: "hierro",
    price: 4800,
    unitWeightKg: 2.5,
    stockDeposito: 800,
    stockMostrador: 50,
    stockEnReparto: 120,
    unit: "Barra",
  },
  {
    id: "p4",
    name: "Cable Unipolar Cobre 2.5mm 100m",
    category: "cables",
    price: 34000,
    unitWeightKg: 3.2,
    stockDeposito: 90,
    stockMostrador: 8,
    stockEnReparto: 12,
    unit: "Rollo",
  },
  {
    id: "p5",
    name: "Pintura Látex AlbaFrentes 20L",
    category: "pinturas",
    price: 98000,
    unitWeightKg: 28,
    stockDeposito: 35,
    stockMostrador: 4,
    stockEnReparto: 6,
    unit: "Balde",
  },
];

const INITIAL_CONVERSIONS: ConversionRule[] = [
  {
    id: "c1",
    itemName: "Cemento Portland Loma Negra (Pallet)",
    sourceUnit: "Pallet (40u)",
    targetUnit: "Bolsas 50kg",
    factor: 40,
    currentSourceQty: 12,
  },
  {
    id: "c2",
    itemName: "Arena Fina Lavada (M³)",
    sourceUnit: "Mts Cúbicos",
    targetUnit: "Baldes 20L",
    factor: 50,
    currentSourceQty: 6,
  },
  {
    id: "c3",
    itemName: "Cable Unipolar Cobre 2.5mm",
    sourceUnit: "Rollo 100m",
    targetUnit: "Metros sueltos",
    factor: 100,
    currentSourceQty: 18,
  },
  {
    id: "c4",
    itemName: "Tornillos Autoperforantes T2 (Caja)",
    sourceUnit: "Caja 1000u",
    targetUnit: "Unidades",
    factor: 1000,
    currentSourceQty: 14,
  },
];

const INITIAL_DISPATCHES: DispatchOrder[] = [
  {
    id: "d1",
    client: "Constructora del Plata",
    address: "Av. Juan B. Justo 4500, CABA",
    items: "40x Cemento, 2m³ Arena",
    truckAssigned: "Scania Volcador #4",
    status: "preparing",
    remitoNumber: "REM-00004123",
    driverName: "Alberto Spinetta",
    driverPhone: "11-5841-2532",
    estimatedWeightKg: 5000,
    maxWeightAllowedKg: 6000,
  },
  {
    id: "d2",
    client: "Ferretería La Grampa",
    address: "Mitre 1250, Avellaneda",
    items: "5x Rollos Cable, 1x Caja T2",
    truckAssigned: "F-100 Reparto #1",
    status: "in_route",
    remitoNumber: "REM-00004124",
    driverName: "Roberto Gómez",
    driverPhone: "11-9988-7733",
    estimatedWeightKg: 16,
    maxWeightAllowedKg: 1000,
  },
  {
    id: "d3",
    client: "Obra Los Cardales",
    address: "Ruta 9 KM 56, Campana",
    items: "90x Cemento, 5m³ Arena",
    truckAssigned: "Sin Asignar",
    status: "pending",
    remitoNumber: "REM-PENDIENTE",
    driverName: "Chofer sin asignar",
    driverPhone: "",
    estimatedWeightKg: 12000,
    maxWeightAllowedKg: 10000,
  },
];

interface HardwareConsoleProps {
  products?: HardwareProduct[];
  onDispatchCreated?: (
    items: Array<{ productId: string; quantity: number }>,
  ) => void;
}

export default function HardwareConsole({
  products = HARDWARE_PRODUCTS,
  onDispatchCreated,
}: HardwareConsoleProps) {
  const [localProducts, setLocalProducts] =
    useState<HardwareProduct[]>(products);
  const [conversions, setConversions] =
    useState<ConversionRule[]>(INITIAL_CONVERSIONS);
  const [dispatches, setDispatches] =
    useState<DispatchOrder[]>(INITIAL_DISPATCHES);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<
    "all" | DispatchStatus
  >("all");

  // Conversión
  const [selectedConvId, setSelectedConvId] = useState("c1");
  const [convAmount, setConvAmount] = useState(1);

  // Cotizador Rápido de Obra
  const [quoteCart, setQuoteCart] = useState<QuoteItem[]>([]);
  const [quoteClient, setQuoteClient] = useState("");
  const [quoteAddress, setQuoteAddress] = useState("");

  // Remito Imprimible
  const [printedRemito, setPrintedRemito] = useState<DispatchOrder | null>(
    null,
  );

  // Form despacho manual
  const [isAddDispatchOpen, setIsAddDispatchOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [materialSummary, setMaterialSummary] = useState("");
  const [estWeight, setEstWeight] = useState(2000);

  // FASE 1: Cotizador de Cortes a Medida (Tirantes / Chapas)
  const [cutMaterialType, setCutMaterialType] = useState<"tirante" | "chapa">(
    "tirante",
  );
  const [totalLengthMeters, setTotalLengthMeters] = useState(6.0);
  const [desiredCutMeters, setDesiredCutMeters] = useState(2.4);
  const [cutQuantity, setCutQuantity] = useState(2);

  const handleCalculateCuts = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const plan = calculateCutPlan(
        totalLengthMeters,
        desiredCutMeters,
        cutQuantity,
      );
      setFeedback({
        type: "success",
        message: `Corte calculado: ${plan.commercialPieces} pieza(s) comerciales, ${plan.cutsPerPiece} corte(s) por pieza y ${plan.totalScrapMeters.toFixed(2)} m de sobrante total.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo calcular el plan de cortes.",
      });
    }
  };

  const handleConvertUnits = () => {
    const rule = conversions.find((c) => c.id === selectedConvId);
    if (!rule || rule.currentSourceQty < convAmount) {
      setFeedback({
        type: "error",
        message: "Stock insuficiente en unidad de origen.",
      });
      return;
    }

    const result = convAmount * rule.factor;

    let updatedProductId = "";
    if (selectedConvId === "c1")
      updatedProductId = "p1"; // Cemento
    else if (selectedConvId === "c2")
      updatedProductId = "p2"; // Arena
    else if (selectedConvId === "c3") updatedProductId = "p4"; // Cable

    if (updatedProductId) {
      setLocalProducts((prev) =>
        prev.map((p) => {
          if (p.id === updatedProductId) {
            return { ...p, stockMostrador: p.stockMostrador + result };
          }
          return p;
        }),
      );
    }

    setConversions((prev) =>
      prev.map((c) => {
        if (c.id === selectedConvId) {
          setFeedback({
            type: "success",
            message: `Conversión exitosa: ${convAmount} ${c.sourceUnit} convertidos en ${result} ${c.targetUnit} y añadidos al stock de mostrador.`,
          });
          return { ...c, currentSourceQty: c.currentSourceQty - convAmount };
        }
        return c;
      }),
    );
  };

  const handleAddToQuote = (prod: HardwareProduct) => {
    setQuoteCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { product: prod, qty: 1 }];
    });
  };

  const handleCreateDispatchFromQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (quoteCart.length === 0 || !quoteClient || !quoteAddress) return;

    const itemsSummary = quoteCart
      .map((i) => `${i.qty}x ${i.product.name.slice(0, 15)}`)
      .join(", ");
    const totalWeight = quoteCart.reduce(
      (acc, curr) => acc + curr.qty * curr.product.unitWeightKg,
      0,
    );

    const newOrder: DispatchOrder = {
      id: `d-${Date.now()}`,
      client: quoteClient,
      address: quoteAddress,
      items: itemsSummary,
      truckAssigned: "Sin Asignar",
      status: "pending",
      remitoNumber: `REM-0000${4125 + dispatches.length}`,
      driverName: "Chofer sin asignar",
      driverPhone: "",
      estimatedWeightKg: totalWeight,
      maxWeightAllowedKg: 5000, // Limite estandar de camión volcador mediano
    };

    setDispatches((prev) => [newOrder, ...prev]);
    onDispatchCreated?.(
      quoteCart.map((item) => ({
        productId: item.product.id,
        quantity: item.qty,
      })),
    );
    setQuoteCart([]);
    setQuoteClient("");
    setQuoteAddress("");
    setFeedback({
      type: "success",
      message: `Despacho generado desde cotizador. Peso total: ${totalWeight.toLocaleString()} KG.`,
    });
  };

  const handleCreateDispatchManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !workAddress) return;

    const newOrder: DispatchOrder = {
      id: `d-${Date.now()}`,
      client: clientName,
      address: workAddress,
      items: materialSummary || "Varios Materiales",
      truckAssigned: "Sin Asignar",
      status: "pending",
      remitoNumber: `REM-0000${4125 + dispatches.length}`,
      driverName: "Chofer sin asignar",
      driverPhone: "",
      estimatedWeightKg: estWeight,
      maxWeightAllowedKg: 5000,
    };

    setDispatches((prev) => [newOrder, ...prev]);
    setIsAddDispatchOpen(false);
    setClientName("");
    setWorkAddress("");
    setMaterialSummary("");
    setFeedback({
      type: "success",
      message: "Despacho y remito manual cargados con éxito.",
    });
  };

  const handleAssignDriver = (
    orderId: string,
    truck: string,
    driver: string,
    phone: string,
  ) => {
    let maxWeight = 5000;
    if (truck === "Scania Volcador #4") maxWeight = 6000;
    else if (truck === "F-100 Reparto #1") maxWeight = 1000;
    else if (truck === "Chasis Doble Cargo") maxWeight = 15000;

    setDispatches((prev) =>
      prev.map((d) =>
        d.id === orderId
          ? {
              ...d,
              truckAssigned: truck,
              driverName: driver,
              driverPhone: phone,
              maxWeightAllowedKg: maxWeight,
              status: "preparing",
            }
          : d,
      ),
    );
    setFeedback({
      type: "success",
      message: `Camión asignado: ${driver} (${truck}) - Límite de carga: ${maxWeight.toLocaleString()} KG.`,
    });
  };

  const handleUpdateStatus = (orderId: string, status: DispatchStatus) => {
    setDispatches((prev) =>
      prev.map((d) => (d.id === orderId ? { ...d, status } : d)),
    );
  };

  // Calculos de cotizador
  const quoteTotalWeight = useMemo(
    () =>
      quoteCart.reduce(
        (acc, curr) => acc + curr.qty * curr.product.unitWeightKg,
        0,
      ),
    [quoteCart],
  );
  const quoteTotalPrice = useMemo(
    () =>
      quoteCart.reduce((acc, curr) => acc + curr.qty * curr.product.price, 0),
    [quoteCart],
  );
  const isQuoteOverloaded = quoteTotalWeight > 5000;

  // Filtrado de repartos
  const filteredDispatches = useMemo(
    () =>
      dispatches.filter((d) => {
        const matchSearch =
          d.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.address.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus =
          deliveryStatusFilter === "all" || d.status === deliveryStatusFilter;
        return matchSearch && matchStatus;
      }),
    [deliveryStatusFilter, dispatches, searchTerm],
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-orange-450 animate-pulse" />
          <div>
            <h1 className="text-xl font-black text-white">
              Despacho de Corralón & Cotizador de Obras
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Control de conversión de unidades, peso máximo de reparto y
              seguimiento de choferes.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddDispatchOpen(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Despacho Manual
        </button>
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

      {/* Métricas del Corralón */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Pedidos del Día
          </span>
          <span className="text-xl font-black text-white mt-1 block">
            {dispatches.length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Entregas Pendientes
          </span>
          <span className="text-xl font-black text-amber-400 mt-1 block">
            {dispatches.filter((d) => d.status !== "delivered").length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Toneladas en Reparto
          </span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {(
              dispatches
                .filter((d) => d.status === "in_route")
                .reduce((acc, curr) => acc + curr.estimatedWeightKg, 0) / 1000
            ).toFixed(1)}{" "}
            tn
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Vehículos sin Asignar
          </span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {dispatches.filter((d) => d.truckAssigned === "Sin Asignar").length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Pallets en Stock
          </span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            {conversions.find((c) => c.id === "c1")?.currentSourceQty || 0}
          </span>
        </div>
      </div>

      {/* Alertas Críticas (Exceso de Peso) */}
      {dispatches.some(
        (d) =>
          d.estimatedWeightKg > d.maxWeightAllowedKg && d.status === "pending",
      ) && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
            <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>
              Alerta de Logística: Hay despachos pendientes que exceden el
              límite de carga admisible del camión.
            </span>
          </div>
        </div>
      )}

      {/* Buscador & Filtro de Entregas */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 col-span-1 sm:col-span-2">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Buscar por Cliente / Obra / Remito
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
            Estado de Entrega
          </label>
          <select
            value={deliveryStatusFilter}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all" || isDispatchStatus(value)) {
                setDeliveryStatusFilter(value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendiente</option>
            <option value="preparing">Preparando Carga</option>
            <option value="loaded">Cargado</option>
            <option value="in_route">En Reparto</option>
            <option value="delivered">Entregado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cotizador de Obra */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <Scale className="h-4.5 w-4.5 text-orange-450" />
              Cotizador Rápido de Obra
            </h3>

            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
              {localProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {p.name}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      Peso: {p.unitWeightKg} kg/unidad
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddToQuote(p)}
                    className="p-1 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 border border-slate-850"
                  >
                    Agregar
                  </button>
                </div>
              ))}
            </div>

            {/* Carrito de Cotización */}
            <div className="space-y-2 border-t border-slate-900/60 pt-3">
              <span className="text-[10px] text-slate-550 font-bold uppercase block">
                Materiales Cotizados
              </span>
              {quoteCart.length === 0 ? (
                <span className="text-xs text-slate-600 italic block">
                  No hay materiales cargados a la cotización.
                </span>
              ) : (
                quoteCart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center text-xs"
                  >
                    <span>
                      {item.product.name.slice(0, 20)} x{item.qty}
                    </span>
                    <span className="font-bold text-slate-250">
                      ${(item.product.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* FASE 1: Cotizador de Cortes a Medida */}
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl space-y-2 text-xs text-left">
              <span className="text-[9px] text-orange-450 font-bold uppercase block flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                Cálculo de Cortes a Medida (Tirantes / Chapas)
              </span>
              <form
                onSubmit={handleCalculateCuts}
                className="grid grid-cols-2 gap-2"
              >
                <div>
                  <label className="text-[8px] text-slate-500 font-bold uppercase block">
                    Material Base
                  </label>
                  <select
                    value={cutMaterialType}
                    onChange={(e) =>
                      setCutMaterialType(e.target.value as "tirante" | "chapa")
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                  >
                    <option value="tirante">Tirante Pino 2x6"</option>
                    <option value="chapa">Chapa Cincalum C-25</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-slate-500 font-bold uppercase block">
                    Largo Comercial (m)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={totalLengthMeters}
                    onChange={(e) =>
                      setTotalLengthMeters(Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-500 font-bold uppercase block">
                    Medida Deseada (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={desiredCutMeters}
                    onChange={(e) =>
                      setDesiredCutMeters(Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-500 font-bold uppercase block">
                    Cantidad Cortes
                  </label>
                  <input
                    type="number"
                    value={cutQuantity}
                    onChange={(e) => setCutQuantity(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="col-span-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-orange-400 font-bold rounded-lg text-[9px] uppercase cursor-pointer"
                >
                  Calcular Piezas & Desperdicio
                </button>
              </form>
            </div>
          </div>

          {/* Formulario e Indicador de Carga */}
          <form
            onSubmit={handleCreateDispatchFromQuote}
            className="space-y-3 pt-3 border-t border-slate-900"
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Cliente..."
                value={quoteClient}
                onChange={(e) => setQuoteClient(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                required
                placeholder="Obra Destino..."
                value={quoteAddress}
                onChange={(e) => setQuoteAddress(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">
                  Peso Total
                </span>
                <span
                  className={`font-black ${isQuoteOverloaded ? "text-rose-500" : "text-cyan-400"}`}
                >
                  {quoteTotalWeight.toLocaleString()} KG
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">
                  Total Cotización
                </span>
                <span className="font-black text-emerald-450">
                  ${quoteTotalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {isQuoteOverloaded && (
              <span className="text-[9px] text-rose-400 block font-bold uppercase">
                ⚠ Exceso de peso! Límite de carga: 5.000 KG.
              </span>
            )}

            <button
              type="submit"
              disabled={quoteCart.length === 0 || isQuoteOverloaded}
              className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs disabled:opacity-40"
            >
              Generar Despacho
            </button>
          </form>
        </div>

        {/* Repartos e Hojas de Ruta */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Truck className="h-4.5 w-4.5 text-orange-450 animate-pulse" />
            Hojas de Ruta & Remisiones Activas
          </h3>

          <div className="space-y-3">
            {filteredDispatches.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                No hay repartos registrados en este estado.
              </div>
            ) : (
              filteredDispatches.map((order) => {
                const isOverloaded =
                  order.estimatedWeightKg > order.maxWeightAllowedKg;
                return (
                  <div
                    key={order.id}
                    className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-white">
                          {order.client}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          [{order.remitoNumber}]
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Destino: {order.address}
                      </span>
                      <span className="text-[10px] text-cyan-400 block font-semibold">
                        Carga: {order.items}
                      </span>

                      {/* FASE 3: Indicador de Seguridad de Carga */}
                      {order.truckAssigned !== "Sin Asignar" && (
                        <div className="w-full max-w-[220px] mt-1.5 space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-400">
                            <span>
                              Seguridad Vial (
                              {Math.round(
                                (order.estimatedWeightKg /
                                  order.maxWeightAllowedKg) *
                                  100,
                              )}
                              %)
                            </span>
                            <span
                              className={
                                isOverloaded
                                  ? "text-rose-500 font-bold"
                                  : "text-slate-500"
                              }
                            >
                              {order.estimatedWeightKg.toLocaleString()} /{" "}
                              {order.maxWeightAllowedKg.toLocaleString()} KG
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-850">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverloaded
                                  ? "bg-rose-500 animate-pulse"
                                  : "bg-orange-500"
                              }`}
                              style={{
                                width: `${Math.min(100, (order.estimatedWeightKg / order.maxWeightAllowedKg) * 100)}%`,
                              }}
                            />
                          </div>
                          {isOverloaded && (
                            <span className="text-[7px] text-rose-500 font-black uppercase block">
                              ⚠ SOBRECARGA DETECTADA: ELIGE CAMIÓN PESADO
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Scale className="h-3.5 w-3.5" />
                          Peso: {order.estimatedWeightKg.toLocaleString()} KG
                          {isOverloaded && (
                            <span className="text-[9px] text-rose-500 font-bold">
                              (EXCESO)
                            </span>
                          )}
                        </span>
                        {order.driverPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {order.driverName} ({order.driverPhone})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-900 pt-3 md:pt-0 justify-between items-center">
                      <button
                        onClick={() => setPrintedRemito(order)}
                        aria-label={`Imprimir remito ${order.id}`}
                        className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-850"
                      >
                        <Printer className="h-3.5 w-3.5 text-cyan-450" />
                      </button>

                      {order.truckAssigned === "Sin Asignar" ? (
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "t1")
                              handleAssignDriver(
                                order.id,
                                "Scania Volcador #4",
                                "Alberto Spinetta",
                                "11-5841-2532",
                              );
                            if (val === "t2")
                              handleAssignDriver(
                                order.id,
                                "F-100 Reparto #1",
                                "Roberto Gómez",
                                "11-9988-7733",
                              );
                            if (val === "t3")
                              handleAssignDriver(
                                order.id,
                                "Chasis Doble Cargo",
                                "Carlos Gardel",
                                "11-4433-2211",
                              );
                          }}
                          className="bg-slate-900 border border-slate-800 text-[10px] rounded px-2.5 py-1 text-slate-350 focus:outline-none"
                        >
                          <option value="">Asignar Chofer...</option>
                          <option value="t1">
                            Alberto Spinetta (Scania - 6000kg)
                          </option>
                          <option value="t2">
                            Roberto Gómez (F-100 - 1000kg)
                          </option>
                          <option value="t3">
                            Carlos Gardel (Chasis Doble - 15000kg)
                          </option>
                        </select>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              handleUpdateStatus(order.id, "in_route")
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                              order.status === "in_route"
                                ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                : "bg-slate-900 text-slate-400 hover:border-slate-800"
                            }`}
                          >
                            En Reparto
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(order.id, "delivered")
                            }
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-[9px] uppercase"
                          >
                            Entregado
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Despacho Corralón */}
      {isAddDispatchOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">
              Generar Remito Manual
            </h2>
            <form onSubmit={handleCreateDispatchManual} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Cliente / Constructora
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Constructora Del Plata"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Dirección de Obra (Destino)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Av. Juan B. Justo 4500, CABA"
                  value={workAddress}
                  onChange={(e) => setWorkAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Peso Estimado (KG)
                  </label>
                  <input
                    type="number"
                    required
                    value={estWeight}
                    onChange={(e) => setEstWeight(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Detalle de Carga
                  </label>
                  <input
                    type="text"
                    placeholder="Bolsas, caños..."
                    value={materialSummary}
                    onChange={(e) => setMaterialSummary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDispatchOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-650 hover:bg-orange-600 text-white font-bold rounded-xl text-xs"
                >
                  Generar Remito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impresión Remito */}
      {printedRemito && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-900 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  REMITO DE CARGA Y LOGÍSTICA
                </h4>
                <span className="text-[10px] text-slate-550 block mt-0.5">
                  Sass Corralón Comercial
                </span>
              </div>
              <button
                onClick={() => setPrintedRemito(null)}
                className="text-slate-400 hover:text-slate-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span>Nro Documento: {printedRemito.remitoNumber}</span>
              <span className="block">Cliente: {printedRemito.client}</span>
              <span className="block">Destino: {printedRemito.address}</span>
              <span className="block">Materiales: {printedRemito.items}</span>
              <span className="block">
                Transporte: {printedRemito.truckAssigned}
              </span>
              <span className="block">Chofer: {printedRemito.driverName}</span>
              <span className="block">
                Peso de Carga:{" "}
                {printedRemito.estimatedWeightKg.toLocaleString()} KG
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPrintedRemito(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setFeedback({
                    type: "success",
                    message: "Remito de carga enviado a impresión.",
                  });
                  setPrintedRemito(null);
                }}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-550 text-white font-bold rounded-xl text-xs"
              >
                Imprimir Remito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
