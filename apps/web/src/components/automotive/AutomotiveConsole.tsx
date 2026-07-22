"use client";

import React, { useMemo, useState } from "react";
import {
  Wrench,
  Car,
  Clock,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  X,
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  Search,
  Printer,
  Check,
  Hammer,
  HelpCircle,
  Phone,
  Award,
  Camera,
  PenTool,
  Layers,
  DollarSign,
} from "lucide-react";

type StockStatus = "available" | "ordered" | "out_of_stock";
type RepairStatus =
  | "entered"
  | "diagnostic"
  | "waiting_parts"
  | "repairing"
  | "ready"
  | "delivered";
type BudgetStatus = "pending" | "approved" | "rejected";
type Feedback = { type: "success" | "error"; message: string } | null;

const REPAIR_STATUSES: RepairStatus[] = [
  "entered",
  "diagnostic",
  "waiting_parts",
  "repairing",
  "ready",
  "delivered",
];

function isRepairStatus(value: string): value is RepairStatus {
  return REPAIR_STATUSES.includes(value as RepairStatus);
}

export interface SparePart {
  id: string;
  name: string;
  price: number;
  stockStatus: StockStatus;
  cost?: number;
  stock?: number;
  minStock?: number;
  sku?: string;
  barcode?: string;
  supplier?: string;
  compatibility?: string;
  imageUrl?: string | null;
  active?: boolean;
}

interface RepairOrder {
  id: string;
  plate: string;
  vehicle: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  client: string;
  mechanic: string;
  checklist: string[];
  partsUsed: Array<{ part: SparePart; qty: number }>;
  laborCost: number;
  status: RepairStatus;
  notes: string;
  budgetStatus: BudgetStatus;
  signatureMock: string; // Base64 or signature name
  photos: string[];
  warrantyMonths: number;
  recommendedNextServiceKm: number;
}

export const SPARE_PARTS: SparePart[] = [
  {
    id: "p1",
    name: "Pastillas de Freno Delanteras Remsa",
    price: 18500,
    stockStatus: "available",
    compatibility: "Toyota",
  },
  {
    id: "p2",
    name: "Filtro de Aceite Fram",
    price: 5400,
    stockStatus: "available",
    compatibility: "Volkswagen",
  },
  {
    id: "p3",
    name: "Aceite Semisintético Elaion 10W40 4L",
    price: 29000,
    stockStatus: "available",
    compatibility: "Todas",
  },
  {
    id: "p4",
    name: "Bujía de Encendido NGK",
    price: 3200,
    stockStatus: "ordered",
    compatibility: "Toyota",
  },
];

const INITIAL_ORDERS: RepairOrder[] = [
  {
    id: "ot-1001",
    plate: "AF105XG",
    vehicle: "Toyota Corolla",
    brand: "Toyota",
    model: "Corolla XEI",
    year: 2021,
    km: 45000,
    client: "Eduardo Galeano",
    mechanic: "Mario Pereyra",
    checklist: ["Luces OK", "Aceite OK", "Golpe guardabarros delantero"],
    partsUsed: [{ part: SPARE_PARTS[0], qty: 1 }],
    laborCost: 15000,
    status: "repairing",
    notes: "Cambiar pastillas de freno y alinear tren delantero.",
    budgetStatus: "approved",
    signatureMock: "Eduardo Galeano (Firma)",
    photos: ["Frente_Corolla.jpg", "Costado_Rayon.jpg"],
    warrantyMonths: 6,
    recommendedNextServiceKm: 55000,
  },
  {
    id: "ot-1002",
    plate: "AA998ZZ",
    vehicle: "Volkswagen Gol Trend",
    brand: "Volkswagen",
    model: "Gol Trend 1.6",
    year: 2018,
    km: 72000,
    client: "Paula Albarracín",
    mechanic: "Andrés Rosales",
    checklist: ["Cubiertas desgastadas", "Batería baja"],
    partsUsed: [
      { part: SPARE_PARTS[1], qty: 1 },
      { part: SPARE_PARTS[2], qty: 1 },
    ],
    laborCost: 8000,
    status: "diagnostic",
    notes: "Service completo de los 70.000 KM.",
    budgetStatus: "pending",
    signatureMock: "Paula Albarracín (Firma)",
    photos: ["Gol_Tablero.jpg"],
    warrantyMonths: 3,
    recommendedNextServiceKm: 80000,
  },
];

interface AutomotiveConsoleProps {
  parts?: SparePart[];
  onPartUsed?: (partId: string, quantity: number) => void;
}

export default function AutomotiveConsole({
  parts = SPARE_PARTS,
  onPartUsed,
}: AutomotiveConsoleProps) {
  const [orders, setOrders] = useState<RepairOrder[]>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(
    INITIAL_ORDERS[0],
  );
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RepairStatus>("all");

  // Form OT nuevo
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState(2020);
  const [newKm, setNewKm] = useState(50000);
  const [newClient, setNewClient] = useState("");
  const [newMechanic, setNewMechanic] = useState("Mario Pereyra");
  const [newNotes, setNewNotes] = useState("");

  // Checklist temp
  const [lucesOk, setLucesOk] = useState(true);
  const [cubiertasOk, setCubiertasOk] = useState(true);
  const [aceiteOk, setAceiteOk] = useState(true);

  // Form agregar repuesto
  const [selectedPartId, setSelectedPartId] = useState("p1");
  const [partQty, setPartQty] = useState(1);
  const [newLaborCost, setNewLaborCost] = useState(0);

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newBrand) return;

    const checklist: string[] = [];
    if (lucesOk) checklist.push("Luces OK");
    if (cubiertasOk) checklist.push("Cubiertas OK");
    if (aceiteOk) checklist.push("Aceite OK");

    const newOrder: RepairOrder = {
      id: `ot-${1000 + orders.length + 1}`,
      plate: newPlate.toUpperCase(),
      vehicle: `${newBrand} ${newModel}`,
      brand: newBrand,
      model: newModel,
      year: Number(newYear),
      km: Number(newKm),
      client: newClient || "Consumidor Final",
      mechanic: newMechanic,
      checklist,
      partsUsed: [],
      laborCost: 0,
      status: "entered",
      notes: newNotes,
      budgetStatus: "pending",
      signatureMock: `${newClient} (Firma)`,
      photos: ["Auto_Ingreso.jpg"],
      warrantyMonths: 3,
      recommendedNextServiceKm: Number(newKm) + 10000,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setSelectedOrder(newOrder);
    setIsAddModalOpen(false);
    setFeedback({
      type: "success",
      message: `Orden ${newOrder.id.toUpperCase()} creada para ${newOrder.plate}.`,
    });

    // Reset
    setNewPlate("");
    setNewBrand("");
    setNewModel("");
    setNewNotes("");
  };

  // FASE 3: Peritaje Visual de Daños
  const handleToggleDamageZone = (zone: string) => {
    if (!selectedOrder) return;
    const isPresent = selectedOrder.checklist.includes(zone);
    const updatedChecklist = isPresent
      ? selectedOrder.checklist.filter((c) => c !== zone)
      : [...selectedOrder.checklist, zone];

    const updatedOrder = { ...selectedOrder, checklist: updatedChecklist };
    setSelectedOrder(updatedOrder);
    setOrders((prev) =>
      prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)),
    );
    setFeedback({
      type: "success",
      message: `Zona "${zone}" actualizada en el peritaje de la orden.`,
    });
  };

  const handleAddPartToOrder = () => {
    if (!selectedOrder) return;
    const part = parts.find((p) => p.id === selectedPartId);
    if (!part) return;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === selectedOrder.id) {
          const updatedParts = [...o.partsUsed];
          const existingIdx = updatedParts.findIndex(
            (x) => x.part.id === part.id,
          );
          if (existingIdx > -1) {
            updatedParts[existingIdx].qty += partQty;
          } else {
            updatedParts.push({ part, qty: partQty });
          }
          const updated = { ...o, partsUsed: updatedParts };
          setSelectedOrder(updated);
          return updated;
        }
        return o;
      }),
    );
    onPartUsed?.(part.id, partQty);
  };

  const handleBudgetStatusChange = (id: string, budgetStatus: BudgetStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, budgetStatus } : o)),
    );
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder((prev) => (prev ? { ...prev, budgetStatus } : null));
    }
  };

  const handleUpdateLabor = () => {
    if (!selectedOrder) return;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === selectedOrder.id) {
          const updated = { ...o, laborCost: Number(newLaborCost) };
          setSelectedOrder(updated);
          return updated;
        }
        return o;
      }),
    );
    setFeedback({ type: "success", message: "Mano de obra actualizada." });
  };

  const handleStatusChange = (id: string, status: RepairStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const calculateTotal = (order: RepairOrder) => {
    const partsTotal = order.partsUsed.reduce(
      (acc, curr) => acc + curr.part.price * curr.qty,
      0,
    );
    return partsTotal + order.laborCost;
  };

  const handlePrintOT = (order: RepairOrder) => {
    const partsList = order.partsUsed
      .map((p) => `${p.part.name} (x${p.qty})`)
      .join(", ");
    setPrintModalContent({
      title: `ORDEN DE TRABAJO - ${order.id.toUpperCase()}`,
      content: `Patente: ${order.plate}\nVehículo: ${order.vehicle}\nCliente: ${order.client}\nMecánico: ${order.mechanic}\n\nChecklist Ingreso: ${order.checklist.join(", ")}\nFalla: ${order.notes}\n\nRepuestos: ${partsList || "Ninguno cargado"}\nM. Obra: $${order.laborCost.toLocaleString()}\n\nFirma Receptor: Taller SASS`,
    });
  };

  const handlePrintPresupuesto = (order: RepairOrder) => {
    const partsTotal = order.partsUsed.reduce(
      (acc, curr) => acc + curr.part.price * curr.qty,
      0,
    );
    const total = partsTotal + order.laborCost;
    const partsText = order.partsUsed
      .map(
        (p) =>
          `- ${p.part.name} x${p.qty}: $${(p.part.price * p.qty).toLocaleString()}`,
      )
      .join("\n");

    setPrintModalContent({
      title: `PRESUPUESTO ESTIMADO - TALLER SASS`,
      content: `Cliente: ${order.client}\nVehículo: ${order.vehicle}\nPatente: ${order.plate}\n\nDetalle de Repuestos:\n${partsText || "Sin repuestos."}\n\nMano de obra: $${order.laborCost.toLocaleString()}\n\nTotal Presupuestado: $${total.toLocaleString()}\nGarantía Reparación: ${order.warrantyMonths} meses\n\nFirma Aceptación Cliente: ${order.signatureMock}`,
    });
  };

  // Filtrado de OTs
  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        const matchSearch =
          o.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.client.toLowerCase().includes(searchTerm.toLowerCase());
        const matchMechanic =
          mechanicFilter === "all" || o.mechanic === mechanicFilter;
        const matchStatus = statusFilter === "all" || o.status === statusFilter;

        return matchSearch && matchMechanic && matchStatus;
      }),
    [mechanicFilter, orders, searchTerm, statusFilter],
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      {/* Header Operativo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-cyan-400 animate-pulse animate-duration-1000" />
          <div>
            <h1 className="text-xl font-black text-white">
              Gestión de Órdenes de Trabajo (Taller)
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Control de checklist, presupuestos con firma de aceptación y
              trazabilidad de repuestos.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-555 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 animate-pulse"
        >
          <Plus className="h-3.5 w-3.5" />
          Ingresar Vehículo
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
              <AlertTriangle className="h-4 w-4" />
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

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Vehículos Ingresados
          </span>
          <span className="text-xl font-black text-white mt-1 block">
            {orders.length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            En Reparación
          </span>
          <span className="text-xl font-black text-amber-450 mt-1 block">
            {orders.filter((o) => o.status === "repairing").length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Presupuestos Rechazados
          </span>
          <span className="text-xl font-black text-rose-500 mt-1 block">
            {orders.filter((o) => o.budgetStatus === "rejected").length}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Mano de Obra Hoy
          </span>
          <span className="text-xl font-black text-emerald-450 mt-1 block">
            $
            {orders
              .reduce((acc, curr) => acc + curr.laborCost, 0)
              .toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Mecánico Líder
          </span>
          <span className="text-xs font-bold text-cyan-400 mt-2 block truncate">
            Mario Pereyra (1)
          </span>
        </div>
      </div>

      {/* Alertas Críticas */}
      {orders.some((o) => o.budgetStatus === "pending") && (
        <div className="p-4 bg-amber-550/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-550 animate-pulse" />
            <span>
              Alerta de Taller: Hay vehículos parados a la espera de la
              aprobación del presupuesto del cliente.
            </span>
          </div>
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Buscar por Patente / Auto / Cliente
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
            Mecánico Asignado
          </label>
          <select
            value={mechanicFilter}
            onChange={(e) => setMechanicFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Mecánicos</option>
            <option value="Mario Pereyra">Mario Pereyra</option>
            <option value="Andrés Rosales">Andrés Rosales</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase block">
            Estado de OT
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all" || isRepairStatus(value)) {
                setStatusFilter(value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
          >
            <option value="all">Todos los Estados</option>
            <option value="entered">Recibido</option>
            <option value="diagnostic">Diagnosticando</option>
            <option value="waiting_parts">Esperando Repuestos</option>
            <option value="repairing">En Reparación</option>
            <option value="ready">Listo para Retirar</option>
            <option value="delivered">Entregado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listado OT */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Car className="h-4.5 w-4.5 text-cyan-400" />
            Vehículos en Taller
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-650 text-xs italic">
                Sin OTs con los filtros activos.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const active = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setNewLaborCost(order.laborCost);
                    }}
                    className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                      active
                        ? "bg-cyan-950/10 border-cyan-500/40 text-white"
                        : "bg-slate-950/40 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-extrabold text-xs text-white">
                        {order.vehicle}
                      </span>
                      <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[9px] text-cyan-455 font-mono">
                        {order.plate}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                      <span>Mecánico: {order.mechanic}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          order.budgetStatus === "approved"
                            ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20"
                            : order.budgetStatus === "rejected"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-450 border border-amber-500/25"
                        }`}
                      >
                        {order.budgetStatus}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detalle Orden y Presupuestos */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
          {selectedOrder ? (
            <>
              <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                <div>
                  <h4 className="font-black text-base text-white">
                    {selectedOrder.vehicle} ({selectedOrder.year})
                  </h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Cliente: {selectedOrder.client} | KM:{" "}
                    {selectedOrder.km.toLocaleString()} | Patente:{" "}
                    {selectedOrder.plate}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintOT(selectedOrder)}
                    className="p-2 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850"
                  >
                    <Printer className="h-3.5 w-3.5 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => handlePrintPresupuesto(selectedOrder)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 font-bold rounded-xl text-[10px] flex items-center gap-1"
                  >
                    Presupuesto
                  </button>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-cyan-400" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      Próximo Service Programado
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Próximo kilometraje sugerido:{" "}
                      {(selectedOrder.km + 10000).toLocaleString()} km. El
                      vencimiento de VTV todavía no fue cargado.
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/20">
                  Regla local, sin envío
                </span>
              </div>

              {/* FASE 3: Peritaje Visual de Daños (Croquis Interactivo del Vehículo) */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Hammer className="h-4.5 w-4.5 text-cyan-400 animate-bounce-once" />
                  Peritaje Visual de Daños (Hotspots Interactivos)
                </span>

                <p className="text-[10px] text-slate-500 leading-normal">
                  Hacé click en cualquier zona del croquis para registrar
                  rasguños/golpes detectados durante la recepción.
                </p>

                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { zone: "Frente (Rasguño/Golpe)", label: "Frente" },
                    { zone: "Trasero (Rasguño/Golpe)", label: "Trasero" },
                    {
                      zone: "Costado Izquierdo (Golpe)",
                      label: "Lat. Izquierdo",
                    },
                    { zone: "Costado Derecho (Rayón)", label: "Lat. Derecho" },
                  ].map((z) => {
                    const isDamaged = selectedOrder.checklist.includes(z.zone);
                    return (
                      <button
                        key={z.zone}
                        type="button"
                        onClick={() => handleToggleDamageZone(z.zone)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          isDamaged
                            ? "bg-rose-500/10 border-rose-500 text-rose-455 shadow-md shadow-rose-950/20"
                            : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <Car className="h-5 w-5" />
                        <span>{z.label}</span>
                        <span className="text-[9px] font-mono block">
                          {isDamaged ? "⚠️ Marcado" : "Sin detalles"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timeline de Reparación */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <span className="text-[10px] text-slate-550 font-bold uppercase block">
                  Timeline / Estado de Reparación
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {[
                    { label: "Ingresado", val: "entered" },
                    { label: "Diagnóstico", val: "diagnostic" },
                    { label: "Esp. Repuesto", val: "waiting_parts" },
                    { label: "Reparando", val: "repairing" },
                    { label: "Listo Retiro", val: "ready" },
                    { label: "Entregado", val: "delivered" },
                  ].map((step) => (
                    <button
                      key={step.val}
                      onClick={() => {
                        if (isRepairStatus(step.val)) {
                          handleStatusChange(selectedOrder.id, step.val);
                        }
                      }}
                      className={`py-1.5 px-2 text-[10px] font-bold rounded-xl border text-center transition-all ${
                        selectedOrder.status === step.val
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                          : "bg-slate-900 border-slate-850 text-slate-500"
                      }`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Firma y Fotos de Ingreso */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs">
                  <span className="text-[9px] text-slate-550 font-bold uppercase block flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5 text-cyan-400" />
                    Fotos de Ingreso (Peritaje)
                  </span>
                  <div className="flex gap-2 pt-1">
                    {selectedOrder.photos.map((f, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-350 cursor-pointer hover:border-slate-600"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs">
                  <span className="text-[9px] text-slate-550 font-bold uppercase block flex items-center gap-1">
                    <PenTool className="h-3.5 w-3.5 text-cyan-400" />
                    Firma Recepción del Cliente
                  </span>
                  <span className="font-mono text-[10px] text-slate-450 italic block pt-1">
                    "{selectedOrder.signatureMock}"
                  </span>
                </div>
              </div>

              {/* Presupuesto y Repuestos */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <span className="text-xs font-bold text-cyan-400 uppercase block">
                  Repuestos & Trazabilidad de Stock
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-550 font-bold uppercase block">
                      Seleccionar Repuesto
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedPartId}
                        onChange={(e) => setSelectedPartId(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                      >
                        {parts.map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.name} (Compatibilidad:{" "}
                            {part.compatibility || "Todas"})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddPartToOrder}
                        className="px-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs"
                      >
                        +
                      </button>
                    </div>
                    {(() => {
                      const selectedPart = parts.find(
                        (p) => p.id === selectedPartId,
                      );
                      const isCompatible =
                        selectedPart &&
                        (selectedPart.compatibility === "Todas" ||
                          selectedPart.compatibility === selectedOrder.brand);
                      if (!isCompatible && selectedPart) {
                        return (
                          <span className="text-[9px] text-amber-500 font-bold block pt-1 animate-pulse">
                            ⚠️ Incompatibilidad: Ficha técnica (
                            {selectedPart.compatibility}) difiere de la marca
                            del auto ({selectedOrder.brand}).
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-550 font-bold uppercase block">
                      Mano de Obra ($)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newLaborCost === 0 ? "" : newLaborCost}
                        onChange={(e) =>
                          setNewLaborCost(Number(e.target.value))
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white"
                      />
                      <button
                        onClick={handleUpdateLabor}
                        className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold rounded-xl text-xs border border-slate-850"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Repuestos Aplicados */}
                <div className="space-y-2 pt-3 border-t border-slate-900">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Repuestos Utilizados
                  </span>
                  {selectedOrder.partsUsed.map((u, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs bg-slate-900/40 p-2 rounded-lg border border-slate-900"
                    >
                      <span>
                        {u.part.name} x{u.qty}
                      </span>
                      <div className="flex gap-3 items-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            u.part.stockStatus === "available"
                              ? "bg-emerald-500/10 text-emerald-450"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {u.part.stockStatus}
                        </span>
                        <span className="font-bold">
                          ${(u.part.price * u.qty).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-900">
                  <div>
                    <span className="text-[9px] text-slate-555 font-bold uppercase block">
                      Aprobación Cliente
                    </span>
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-850 text-[10px] mt-1">
                      <button
                        onClick={() =>
                          handleBudgetStatusChange(selectedOrder.id, "approved")
                        }
                        className={`px-2 py-0.5 rounded ${selectedOrder.budgetStatus === "approved" ? "bg-emerald-600 text-slate-950 font-bold" : "text-slate-500"}`}
                      >
                        Aprobado
                      </button>
                      <button
                        onClick={() =>
                          handleBudgetStatusChange(selectedOrder.id, "pending")
                        }
                        className={`px-2 py-0.5 rounded ${selectedOrder.budgetStatus === "pending" ? "bg-amber-600 text-slate-950 font-bold" : "text-slate-500"}`}
                      >
                        Pendiente
                      </button>
                      <button
                        onClick={() =>
                          handleBudgetStatusChange(selectedOrder.id, "rejected")
                        }
                        className={`px-2 py-0.5 rounded ${selectedOrder.budgetStatus === "rejected" ? "bg-rose-600 text-slate-950 font-bold" : "text-slate-500"}`}
                      >
                        Rechazado
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-555 font-bold uppercase block">
                      Importe Estimado
                    </span>
                    <span className="text-xl font-black text-cyan-400">
                      ${calculateTotal(selectedOrder).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-28 text-slate-650 text-xs my-auto">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 text-slate-850" />
              Selecciona una orden de trabajo para ver timeline de reparación.
            </div>
          )}
        </div>
      </div>

      {/* Modal Impresiones */}
      {printModalContent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-900 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                {printModalContent.title}
              </h4>
              <button
                onClick={() => setPrintModalContent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono">
              {printModalContent.content}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPrintModalContent(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setFeedback({
                    type: "success",
                    message: "Comprobante de taller enviado a impresión.",
                  });
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-cyan-650 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva OT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-black mb-4 text-white">
              Nueva Orden de Trabajo
            </h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Patente / Dominio
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: AA123BB"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Toyota"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Modelo / Versión
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Corolla XEI"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    required
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Kilometraje
                  </label>
                  <input
                    type="number"
                    required
                    value={newKm}
                    onChange={(e) => setNewKm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Horacio Quiroga"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-555 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Guardar Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
