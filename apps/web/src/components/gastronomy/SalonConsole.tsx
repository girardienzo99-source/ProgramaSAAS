"use client";

import React, { useState } from "react";
import {
  Coffee,
  Grid,
  User,
  Plus,
  Minus,
  Check,
  DollarSign,
  Trash2,
  Send,
  Clock,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  X,
  Utensils,
  Users,
  ChefHat,
  UserPlus,
  CreditCard,
  Receipt,
  MessageSquare,
  Mic,
  Bot,
  AlertCircle,
  ShoppingBag,
  Search,
  Printer,
  Scale,
  CalendarDays,
  WalletCards,
  BarChart3,
} from "lucide-react";
import { Product } from "@programa-sass/shared-types";
import { apiFetch } from "@/lib/client/apiFetch";
import GastronomyCashConsole, {
  type CashState,
  type SettlementRecord,
} from "./GastronomyCashConsole";
import GastronomyReportsConsole from "./GastronomyReportsConsole";

type SalonTab =
  | "tables"
  | "reservations"
  | "kds"
  | "cash"
  | "reports"
  | "waiters"
  | "patron_ia";
type TableStatus = "available" | "busy" | "reserved";
type PaymentMethod = "cash" | "card" | "qr";
type ChatStatus = "pending" | "processed";

interface OrderItem {
  product: Product;
  quantity: number;
}

interface DiningTable {
  id: string;
  name: string;
  status: TableStatus;
  capacity: number;
  waiter: string;
  total: number;
  items: OrderItem[];
}

interface Waiter {
  id: string;
  name: string;
  tablesActive: number;
  totalSales: number;
}

interface KitchenOrderItem {
  name: string;
  qty: number;
  price?: number;
}

interface OnlineOrderItem extends KitchenOrderItem {
  price: number;
}

interface KitchenOrder {
  id: string;
  tableName: string;
  waiterName: string;
  items: KitchenOrderItem[];
  timestamp: number;
  status: "pending" | "preparing" | "ready";
}

interface TableApiRecord {
  id: string;
  name: string;
  status: "available" | "occupied" | "reserved" | "cleaning" | "blocked";
  capacity: number;
  total: number;
  waiter: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
}

interface KdsApiRecord {
  id: string;
  orderNumber: number;
  tableId: string | null;
  tableName: string;
  waiterName: string;
  items: Array<{ name: string; qty: number; price: number }>;
  openedAt: string;
  status: KitchenOrder["status"];
}

interface CommittedOrder {
  orderId: string;
  orderNumber: number;
  subtotal: number;
  total: number;
  status: "sent";
}

type ReservationStatus =
  "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  seated: "En mesa",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistio",
};

interface ReservationApiRecord {
  id: string;
  tableId: string | null;
  tableName: string;
  customerName: string;
  phone: string;
  guests: number;
  reservedFor: string;
  durationMinutes: number;
  status: ReservationStatus;
  source: "manual" | "whatsapp" | "instagram" | "web" | "phone";
  notes: string;
  createdAt: string;
}

interface ReservationChat {
  id: string;
  sender: string;
  message: string;
  extractedType: "reservation";
  extractedData: {
    name: string;
    guests: number;
    time: string;
  };
  status: ChatStatus;
}

interface OrderChat {
  id: string;
  sender: string;
  message: string;
  extractedType: "order" | "takeaway";
  extractedData: {
    items: OnlineOrderItem[];
    address?: string;
    total: number;
  };
  status: ChatStatus;
}

type PatronChat = ReservationChat | OrderChat;

function makeProduct(
  input: Pick<Product, "id" | "name" | "price" | "cost" | "vat_rate">,
): Product {
  return {
    ...input,
    company_id: "c-test",
    description: null,
    sku: input.id.toUpperCase(),
    barcode: null,
    is_service: false,
    stock_control: true,
    image_url: null,
    extra_attributes: { rubro: "gastronomy" },
    created_at: "",
    updated_at: "",
  };
}

function calculateOrderTotal(items: OrderItem[]) {
  return items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );
}

function calculateTaxBreakdown(items: OrderItem[]) {
  const breakdown = [21, 10.5].map((rate) => {
    const gross = items
      .filter((item) => item.product.vat_rate === rate)
      .reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const net = gross / (1 + rate / 100);

    return {
      rate,
      gross,
      net,
      tax: gross - net,
    };
  });

  return {
    subtotal: breakdown.reduce((acc, row) => acc + row.net, 0),
    taxTotal: breakdown.reduce((acc, row) => acc + row.tax, 0),
    total: breakdown.reduce((acc, row) => acc + row.gross, 0),
    breakdown,
  };
}

// Mock de productos gastronómicos
const FOOD_PRODUCTS: Product[] = [
  makeProduct({
    id: "g1",
    name: "Pizza Muzarella Grande",
    price: 12500,
    cost: 4500,
    vat_rate: 21,
  }),
  makeProduct({
    id: "g2",
    name: "Hamburguesa Doble Cheddar",
    price: 9500,
    cost: 3800,
    vat_rate: 21,
  }),
  makeProduct({
    id: "g3",
    name: "Cerveza Patagonia IPA 500ml",
    price: 4200,
    cost: 1500,
    vat_rate: 21,
  }),
  makeProduct({
    id: "g4",
    name: "Gaseosa Coca-Cola 350ml",
    price: 2500,
    cost: 800,
    vat_rate: 21,
  }),
  makeProduct({
    id: "g5",
    name: "Flan Casero con Dulce",
    price: 3500,
    cost: 1000,
    vat_rate: 10.5,
  }),
  makeProduct({
    id: "g6",
    name: "Café Cortado",
    price: 2200,
    cost: 600,
    vat_rate: 10.5,
  }),
];

// Waiters
const INITIAL_WAITERS = [
  { id: "w1", name: "Carlos G.", tablesActive: 2, totalSales: 23400 },
  { id: "w2", name: "Sofía M.", tablesActive: 1, totalSales: 11500 },
  { id: "w3", name: "Andrés P.", tablesActive: 0, totalSales: 0 },
];

interface SalonConsoleProps {
  products?: Product[];
  onOrderCommitted?: (order: CommittedOrder) => void | Promise<void>;
}

const CLOSED_CASH_STATE: CashState = {
  isOpen: false,
  cashId: null,
  name: "Caja Gastronomia",
  openingBalance: 0,
  expectedCash: 0,
  salesTotal: 0,
  cashPayments: 0,
  cardPayments: 0,
  qrPayments: 0,
  tipsTotal: 0,
  openedAt: null,
};

export default function SalonConsole({
  products = FOOD_PRODUCTS,
  onOrderCommitted,
}: SalonConsoleProps) {
  const [activeTab, setActiveTab] = useState<SalonTab>("tables");

  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      "salonTab",
    ) as SalonTab | null;
    if (
      requested &&
      [
        "tables",
        "reservations",
        "kds",
        "cash",
        "reports",
        "waiters",
        "patron_ia",
      ].includes(requested)
    ) {
      setActiveTab(requested);
    }
  }, []);

  // FASE 3: Live timer tick para KDS
  const [kdsTick, setKdsTick] = useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setKdsTick((t) => t + 1);
    }, 10000); // Actualiza cada 10 segundos
    return () => clearInterval(timer);
  }, []);

  const [tables, setTables] = useState<DiningTable[]>([
    {
      id: "t1",
      name: "Mesa 1",
      status: "available",
      capacity: 4,
      waiter: "",
      total: 0,
      items: [],
    },
    {
      id: "t2",
      name: "Mesa 2",
      status: "busy",
      capacity: 2,
      waiter: "Carlos G.",
      total: 23400,
      items: [
        { product: FOOD_PRODUCTS[0], quantity: 1 },
        { product: FOOD_PRODUCTS[2], quantity: 2 },
        { product: FOOD_PRODUCTS[3], quantity: 1 },
      ],
    },
    {
      id: "t3",
      name: "Mesa 3",
      status: "reserved",
      capacity: 6,
      waiter: "Carlos G.",
      total: 0,
      items: [],
    },
    {
      id: "t4",
      name: "Mesa 4",
      status: "available",
      capacity: 4,
      waiter: "",
      total: 0,
      items: [],
    },
    {
      id: "t5",
      name: "Mesa 5",
      status: "busy",
      capacity: 4,
      waiter: "Sofía M.",
      total: 11700,
      items: [
        { product: FOOD_PRODUCTS[1], quantity: 1 },
        { product: FOOD_PRODUCTS[5], quantity: 1 },
      ],
    },
    {
      id: "t6",
      name: "Mesa 6",
      status: "available",
      capacity: 2,
      waiter: "",
      total: 0,
      items: [],
    },
  ]);

  const [waiters, setWaiters] = useState(INITIAL_WAITERS);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [comandaCart, setComandaCart] = useState<OrderItem[]>([]);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [operationsBusy, setOperationsBusy] = useState(false);
  const [cashState, setCashState] = useState<CashState>(CLOSED_CASH_STATE);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [declaredCash, setDeclaredCash] = useState(0);
  const [reservations, setReservations] = useState<ReservationApiRecord[]>([]);
  const [reservationName, setReservationName] = useState("");
  const [reservationPhone, setReservationPhone] = useState("");
  const [reservationGuests, setReservationGuests] = useState(2);
  const [reservationDate, setReservationDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reservationTime, setReservationTime] = useState("21:00");
  const [reservationDuration, setReservationDuration] = useState(120);
  const [reservationTableId, setReservationTableId] = useState("");
  const [splitDinersCount, setSplitDinersCount] = useState(1);

  // Filtros de salón
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");

  // Kitchen Orders (KDS) con etapas
  const [kdsOrders, setKdsOrders] = useState<KitchenOrder[]>([
    {
      id: "k1",
      tableName: "Mesa 2",
      waiterName: "Carlos G.",
      items: [
        { name: "Pizza Muzarella Grande", qty: 1 },
        { name: "Cerveza Patagonia IPA 500ml", qty: 2 },
      ],
      timestamp: Date.now() - 650000,
      status: "pending",
    },
    {
      id: "k2",
      tableName: "Mesa 5",
      waiterName: "Sofía M.",
      items: [{ name: "Hamburguesa Doble Cheddar", qty: 1 }],
      timestamp: Date.now() - 120000,
      status: "pending",
    },
  ]);

  // Simulated "El Patrón IA" Chats
  const [patronChats, setPatronChats] = useState<PatronChat[]>([
    {
      id: "chat1",
      sender: "Horacio (WhatsApp)",
      message:
        "Buenas noches, me reservás una mesa para hoy a las 21:00hs a nombre de Horacio? Seríamos 4 personas.",
      extractedType: "reservation",
      extractedData: { name: "Horacio", guests: 4, time: "21:00" },
      status: "pending",
    },
    {
      id: "chat2",
      sender: "Clara (WhatsApp)",
      message:
        "Hola! Mándame una Pizza Grande Muzarella y 2 cervezas Patagonia IPA por favor a Av. Corrientes 1540, depto 4B.",
      extractedType: "order",
      extractedData: {
        items: [
          { name: "Pizza Muzarella Grande", qty: 1, price: 12500 },
          { name: "Cerveza Patagonia IPA 500ml", qty: 2, price: 4200 },
        ],
        address: "Av. Corrientes 1540, Depto 4B",
        total: 20900,
      },
      status: "pending",
    },
    {
      id: "chat3",
      sender: "Marcos (Instagram)",
      message:
        "Quiero encargar una Hamburguesa Doble Cheddar y un Flan casero para retirar en 20 minutos, gracias!",
      extractedType: "takeaway",
      extractedData: {
        items: [
          { name: "Hamburguesa Doble Cheddar", qty: 1, price: 9500 },
          { name: "Flan Casero con Dulce", qty: 1, price: 3500 },
        ],
        total: 13000,
      },
      status: "pending",
    },
  ]);
  const [selectedChatId, setSelectedChatId] = useState<string>("chat1");
  const [customMessage, setCustomMessage] = useState("");

  // Modals / Helpers
  const [showCheckoutModal, setShowCheckoutModal] =
    useState<DiningTable | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [splitMethods, setSplitMethods] = useState<PaymentMethod[]>(["cash"]);
  const [tipAmount, setTipAmount] = useState(0);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState("");
  const [settlingCheckout, setSettlingCheckout] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [assignedWaiter, setAssignedWaiter] = useState("");

  // División de cuenta
  const [splitCount, setSplitCount] = useState(1);

  // Modal Impresiones
  const [printModalContent, setPrintModalContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  // Notificaciones
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = (msg: string) => {
    setNotifications((prev) => [msg, ...prev]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(0, -1));
    }, 5000);
  };

  const refreshOperations = React.useCallback(async () => {
    const [
      tableResponse,
      orderResponse,
      reservationResponse,
      cashResponse,
      settlementResponse,
    ] = await Promise.all([
      apiFetch<{ items: TableApiRecord[] }>("/api/rubros/gastronomy/tables"),
      apiFetch<{ items: KdsApiRecord[] }>("/api/rubros/gastronomy/orders"),
      apiFetch<{ items: ReservationApiRecord[] }>(
        "/api/rubros/gastronomy/reservations",
      ),
      apiFetch<{ state: CashState }>("/api/rubros/gastronomy/cash"),
      apiFetch<{ items: SettlementRecord[] }>(
        "/api/rubros/gastronomy/settlements",
      ),
    ]);
    setTables(
      tableResponse.items.map((table) => ({
        id: table.id,
        name: table.name,
        status:
          table.status === "occupied"
            ? "busy"
            : table.status === "available"
              ? "available"
              : "reserved",
        capacity: table.capacity,
        waiter: table.waiter,
        total: table.total,
        items: table.items.map((item) => ({
          product: makeProduct({
            id: item.productId,
            name: item.name,
            price: item.unitPrice,
            cost: 0,
            vat_rate: item.vatRate,
          }),
          quantity: item.quantity,
        })),
      })),
    );
    setKdsOrders(
      orderResponse.items.map((order) => ({
        id: order.id,
        tableName: order.tableName,
        waiterName: order.waiterName,
        items: order.items,
        timestamp: new Date(order.openedAt).getTime(),
        status: order.status,
      })),
    );
    setReservations(reservationResponse.items);
    setCashState(cashResponse.state);
    setSettlements(settlementResponse.items);
    setDeclaredCash(cashResponse.state.expectedCash);
  }, []);

  React.useEffect(() => {
    let active = true;
    setOperationsBusy(true);
    refreshOperations()
      .catch((error: unknown) => {
        if (active)
          setNotifications([
            error instanceof Error
              ? error.message
              : "No se pudo sincronizar Salon y Cocina.",
          ]);
      })
      .finally(() => {
        if (active) setOperationsBusy(false);
      });
    return () => {
      active = false;
    };
  }, [refreshOperations]);

  const handleCreateReservation = async () => {
    if (!reservationName.trim() || !reservationDate || !reservationTime) return;
    const reservedFor = new Date(`${reservationDate}T${reservationTime}:00`);
    if (!Number.isFinite(reservedFor.getTime())) {
      addNotification("La fecha u hora de la reserva no es valida.");
      return;
    }
    setOperationsBusy(true);
    try {
      await apiFetch("/api/rubros/gastronomy/reservations", {
        method: "POST",
        body: JSON.stringify({
          tableId: reservationTableId || undefined,
          customerName: reservationName,
          phone: reservationPhone,
          guests: reservationGuests,
          reservedFor: reservedFor.toISOString(),
          durationMinutes: reservationDuration,
          source: "manual",
          notes: "",
        }),
      });
      await refreshOperations();
      addNotification(`Reserva de ${reservationName} confirmada.`);
      setReservationName("");
      setReservationPhone("");
      setReservationTableId("");
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "No se pudo crear la reserva.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  const handleReservationStatus = async (
    reservationId: string,
    status: "seated" | "completed" | "cancelled" | "no_show",
  ) => {
    setOperationsBusy(true);
    try {
      await apiFetch("/api/rubros/gastronomy/reservations", {
        method: "PATCH",
        body: JSON.stringify({ reservationId, status }),
      });
      await refreshOperations();
      addNotification(
        status === "seated"
          ? "Clientes ubicados en la mesa."
          : "Estado de reserva actualizado.",
      );
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la reserva.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  // Agregar mesa
  const handleAddTable = async () => {
    if (!newTableName) return;
    setOperationsBusy(true);
    try {
      await apiFetch("/api/rubros/gastronomy/tables", {
        method: "POST",
        body: JSON.stringify({
          name: newTableName,
          capacity: Number(newTableCapacity),
        }),
      });
      await refreshOperations();
      addNotification(`Mesa "${newTableName}" agregada al salon.`);
      setNewTableName("");
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "No se pudo agregar la mesa.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  // Eliminar mesa
  const handleDeleteTable = async (id: string, name: string) => {
    const isBusy = tables.find((t) => t.id === id)?.status === "busy";
    if (isBusy) {
      addNotification("No se puede eliminar una mesa ocupada.");
      return;
    }
    setOperationsBusy(true);
    try {
      await apiFetch(
        `/api/rubros/gastronomy/tables?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      setTables((prev) => prev.filter((t) => t.id !== id));
      if (selectedTable?.id === id) setSelectedTable(null);
      addNotification(`Mesa "${name}" eliminada.`);
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "No se pudo eliminar la mesa.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  // Agregar al pedido
  const handleAddToComanda = (prod: Product) => {
    setComandaCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === prod.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
  };

  // Actualizar cantidad
  const handleUpdateQty = (prodId: string, delta: number) => {
    setComandaCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === prodId) {
            const q = item.quantity + delta;
            return q > 0 ? { ...item, quantity: q } : null;
          }
          return item;
        })
        .filter((item): item is OrderItem => Boolean(item)),
    );
  };

  // Enviar comanda
  const handleSendToKitchen = async () => {
    if (comandaCart.length === 0 || !selectedTable) return;

    const waiter = assignedWaiter || selectedTable.waiter || waiters[0].name;
    setSendingOrder(true);
    try {
      const response = await apiFetch<{ order: CommittedOrder }>(
        "/api/rubros/gastronomy/orders",
        {
          method: "POST",
          body: JSON.stringify({
            tableId: selectedTable.id,
            tableName: selectedTable.name,
            waiterName: waiter,
            channel: "dine_in",
            items: comandaCart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
          }),
        },
      );
      await onOrderCommitted?.(response.order);
      await refreshOperations();

      setWaiters((prev) =>
        prev.map((w) => {
          if (w.name === waiter) {
            const extraSale = calculateOrderTotal(comandaCart);
            return {
              ...w,
              totalSales: w.totalSales + extraSale,
              tablesActive:
                w.tablesActive + (selectedTable.status === "available" ? 1 : 0),
            };
          }
          return w;
        }),
      );

      addNotification(
        `Comanda #${response.order.orderNumber} de la ${selectedTable.name} enviada a cocina.`,
      );
      setComandaCart([]);
      setSelectedTable(null);
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la comanda.",
      );
    } finally {
      setSendingOrder(false);
    }
  };

  // Marcar KDS listo
  const handleMarkKdsReady = async (id: string, tableName: string) => {
    setOperationsBusy(true);
    try {
      await apiFetch("/api/rubros/gastronomy/orders", {
        method: "PATCH",
        body: JSON.stringify({ orderId: id, status: "served" }),
      });
      setKdsOrders((prev) => prev.filter((o) => o.id !== id));
      addNotification(`Pedido de ${tableName} entregado al salon.`);
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "No se pudo entregar la comanda.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  // KDS cambiar estado a preparando
  const handleUpdateKdsStatus = async (
    id: string,
    newStatus: "preparing" | "ready",
  ) => {
    setOperationsBusy(true);
    try {
      await apiFetch("/api/rubros/gastronomy/orders", {
        method: "PATCH",
        body: JSON.stringify({ orderId: id, status: newStatus }),
      });
      setKdsOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
      );
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar Cocina.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  // Abrir checkout
  const handleOpenCheckout = (table: DiningTable) => {
    if (!cashState.isOpen) {
      addNotification("Abre una caja antes de cobrar la mesa.");
      setActiveTab("cash");
      return;
    }
    setSplitCount(1);
    setPaymentMethod("cash");
    setSplitMethods(["cash"]);
    setTipAmount(0);
    setCheckoutIdempotencyKey(crypto.randomUUID());
    setShowCheckoutModal(table);
  };

  const handleSplitCountChange = (value: number) => {
    const next = Math.min(20, Math.max(1, Math.trunc(value) || 1));
    setSplitCount(next);
    setSplitMethods((current) =>
      Array.from(
        { length: next },
        (_, index) => current[index] ?? paymentMethod,
      ),
    );
  };

  const selectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setSplitMethods(Array.from({ length: splitCount }, () => method));
  };

  const splitPayments = (total: number) => {
    const cents = Math.round(total * 100);
    const baseCents = Math.floor(cents / splitCount);
    return Array.from({ length: splitCount }, (_, index) => ({
      method: splitMethods[index] ?? paymentMethod,
      amount:
        (baseCents +
          (index === splitCount - 1 ? cents - baseCents * splitCount : 0)) /
        100,
    }));
  };

  // Confirmar cobro transaccional e idempotente.
  const handleConfirmCheckout = async () => {
    if (!showCheckoutModal) return;
    setSettlingCheckout(true);
    try {
      const chargedTotal = showCheckoutModal.total + tipAmount;
      const response = await apiFetch<{
        settlement: {
          settlementNumber: number;
          saleId: string;
          duplicate: boolean;
        };
      }>("/api/rubros/gastronomy/settlements", {
        method: "POST",
        headers: { "Idempotency-Key": checkoutIdempotencyKey },
        body: JSON.stringify({
          tableId: showCheckoutModal.id,
          splitCount,
          tipAmount,
          payments: splitPayments(chargedTotal),
        }),
      });
      setShowCheckoutModal(null);
      setSelectedTable(null);
      await refreshOperations();
      addNotification(
        `${response.settlement.duplicate ? "Cierre recuperado" : "Mesa cobrada"} #${response.settlement.settlementNumber}. Facturacion ARCA pendiente.`,
      );
      setActiveTab("cash");
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "No se pudo cobrar la mesa.",
      );
    } finally {
      setSettlingCheckout(false);
    }
  };

  const handleOpenCash = async () => {
    setOperationsBusy(true);
    try {
      await apiFetch("/api/rubros/gastronomy/cash", {
        method: "POST",
        body: JSON.stringify({ action: "open", openingBalance }),
      });
      await refreshOperations();
      addNotification("Caja abierta. Ya puedes registrar cobros.");
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "No se pudo abrir la caja.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  const handleCloseCash = async () => {
    setOperationsBusy(true);
    try {
      const response = await apiFetch<{ result: { difference: number } }>(
        "/api/rubros/gastronomy/cash",
        {
          method: "POST",
          body: JSON.stringify({ action: "close", declaredCash }),
        },
      );
      await refreshOperations();
      addNotification(
        `Caja cerrada. Diferencia declarada: $${response.result.difference.toLocaleString("es-AR")}.`,
      );
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "No se pudo cerrar la caja.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  // Procesar pedido desde el chatbot "El Patrón IA"
  const handleProcessPatronAction = async (chat: PatronChat) => {
    setOperationsBusy(true);
    try {
      if (chat.extractedType === "reservation") {
        const [hours, minutes] = chat.extractedData.time.split(":").map(Number);
        const reservedFor = new Date();
        reservedFor.setHours(
          Number.isFinite(hours) ? hours : 21,
          Number.isFinite(minutes) ? minutes : 0,
          0,
          0,
        );
        if (reservedFor.getTime() < Date.now() - 30 * 60_000)
          reservedFor.setDate(reservedFor.getDate() + 1);
        const table = tables
          .filter(
            (item) =>
              item.status !== "busy" &&
              item.capacity >= chat.extractedData.guests,
          )
          .sort((left, right) => left.capacity - right.capacity)[0];
        const source = chat.sender.toLowerCase().includes("instagram")
          ? "instagram"
          : "whatsapp";
        const response = await apiFetch<{ item: ReservationApiRecord }>(
          "/api/rubros/gastronomy/reservations",
          {
            method: "POST",
            body: JSON.stringify({
              tableId: table?.id,
              customerName: chat.extractedData.name,
              phone: "",
              guests: chat.extractedData.guests,
              reservedFor: reservedFor.toISOString(),
              durationMinutes: 120,
              source,
              notes: chat.message,
            }),
          },
        );
        await refreshOperations();
        addNotification(
          `Reserva de ${chat.extractedData.name} confirmada en ${response.item.tableName}.`,
        );
      } else {
        const normalize = (value: string) =>
          value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
        const keywords = [
          "pizza",
          "hamburguesa",
          "cerveza",
          "gaseosa",
          "flan",
          "cafe",
        ];
        const items = chat.extractedData.items.map((item) => {
          const requested = normalize(item.name);
          const keyword = keywords.find((candidate) =>
            requested.includes(candidate),
          );
          const product = products.find((candidate) => {
            const productName = normalize(candidate.name);
            return (
              productName === requested ||
              Boolean(keyword && productName.includes(keyword))
            );
          });
          if (!product)
            throw new Error(`No se encontro ${item.name} en la carta activa.`);
          return { productId: product.id, quantity: item.qty };
        });
        const response = await apiFetch<{ order: CommittedOrder }>(
          "/api/rubros/gastronomy/orders",
          {
            method: "POST",
            body: JSON.stringify({
              tableName: `${chat.extractedType === "order" ? "Delivery" : "Retiro"}: ${chat.sender.split(" ")[0]}`,
              waiterName: "Patron IA",
              channel: chat.extractedType === "order" ? "delivery" : "takeaway",
              notes: chat.extractedData.address ?? chat.message,
              items,
            }),
          },
        );
        await onOrderCommitted?.(response.order);
        await refreshOperations();
        addNotification(
          `Pedido online #${response.order.orderNumber} enviado al KDS.`,
        );
      }

      setPatronChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, status: "processed" } : c)),
      );
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "No se pudo procesar la solicitud digital.",
      );
    } finally {
      setOperationsBusy(false);
    }
  };

  // FASE 3: Parser NLP simulado de mensajes de texto libres
  const handleParseCustomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim()) return;

    const msg = customMessage.trim();
    const msgLower = msg.toLowerCase();

    let extractedType: "reservation" | "order" | "takeaway" = "order";
    let extractedData: any = {};

    if (
      msgLower.includes("reserva") ||
      msgLower.includes("mesa") ||
      msgLower.includes("anotame")
    ) {
      extractedType = "reservation";
      const guestsMatch = msgLower.match(
        /(\d+)\s*(personas|persona|comensales|amigos|cubiertos)/,
      );
      const guests = guestsMatch ? parseInt(guestsMatch[1]) : 2;
      const timeMatch = msgLower.match(
        /(\d{1,2}:\d{2})|(\d{1,2})\s*(hs|horas|pm|am)/,
      );
      const time = timeMatch ? timeMatch[1] || `${timeMatch[2]}:00` : "21:30";
      const nameMatch = msgLower.match(/(nombre de|para)\s*([a-zA-Záéíóúñ]+)/);
      const name = nameMatch ? nameMatch[2] : "Cliente Web";

      extractedData = { name, guests, time };
    } else {
      const items: any[] = [];
      let total = 0;

      if (msgLower.includes("pizza")) {
        items.push({ name: "Pizza Muzarella Grande", qty: 1, price: 12500 });
        total += 12500;
      }
      if (msgLower.includes("hamburguesa") || msgLower.includes("burger")) {
        items.push({ name: "Hamburguesa Doble Cheddar", qty: 1, price: 9500 });
        total += 9500;
      }
      if (
        msgLower.includes("cerveza") ||
        msgLower.includes("patagonia") ||
        msgLower.includes("birra")
      ) {
        items.push({
          name: "Cerveza Patagonia IPA 500ml",
          qty: 2,
          price: 4200,
        });
        total += 8400;
      }
      if (
        msgLower.includes("coca") ||
        msgLower.includes("gaseosa") ||
        msgLower.includes("cola")
      ) {
        items.push({ name: "Gaseosa Coca-Cola 350ml", qty: 1, price: 2500 });
        total += 2500;
      }
      if (msgLower.includes("flan")) {
        items.push({ name: "Flan Casero con Dulce", qty: 1, price: 3500 });
        total += 3500;
      }
      if (msgLower.includes("cafe") || msgLower.includes("café")) {
        items.push({ name: "Café Cortado", qty: 1, price: 2200 });
        total += 2200;
      }

      if (items.length === 0) {
        items.push({ name: "Pizza Muzarella Grande", qty: 1, price: 12500 });
        total += 12500;
      }

      const isTakeaway =
        msgLower.includes("retirar") ||
        msgLower.includes("takeaway") ||
        msgLower.includes("retiro");
      extractedType = isTakeaway ? "takeaway" : "order";

      if (!isTakeaway) {
        const addressMatch = msgLower.match(
          /(calle|calle\s+)?([a-zA-Záéíóúñ\s]+\s+\d+)/,
        );
        extractedData.address = addressMatch
          ? addressMatch[2]
          : "Av. Rivadavia 2500";
      }
      extractedData.items = items;
      extractedData.total = total;
    }

    const newChat: PatronChat = {
      id: `chat-${Date.now()}`,
      sender: `Simulación Web (${new Date().toLocaleTimeString().slice(0, 5)})`,
      message: msg,
      extractedType,
      extractedData,
      status: "pending",
    };

    setPatronChats((prev) => [newChat, ...prev]);
    setSelectedChatId(newChat.id);
    setCustomMessage("");
    addNotification("Mensaje procesado mediante motor de inferencia NLP.");
  };

  const handlePrintComanda = (table: DiningTable) => {
    const itemsText = table.items
      .map((i) => `- ${i.product.name} x${i.quantity}`)
      .join("\n");
    setPrintModalContent({
      title: `IMPRIMIR COMANDA DE MESA`,
      content: `COMANDA DE PREPARACIÓN\n\nLugar: ${table.name}\nMozo: ${table.waiter || "Sin Asignar"}\nHora: ${new Date().toLocaleTimeString()}\n\nItems:\n${itemsText}\n\nSASS ERP GASTRONOMÍA`,
    });
  };

  const selectedChat = patronChats.find((c) => c.id === selectedChatId);
  const checkoutTax = showCheckoutModal
    ? calculateTaxBreakdown(showCheckoutModal.items)
    : null;

  // Filtrado de plano de mesas
  const filteredTables = tables.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.waiter && t.waiter.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchCapacity =
      capacityFilter === "all" || t.capacity >= Number(capacityFilter);

    return matchSearch && matchStatus && matchCapacity;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 flex flex-col gap-6 font-sans">
      {/* Notificaciones flotantes */}
      {notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {notifications.map((msg, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-indigo-500/30 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slide-in text-xs font-semibold text-indigo-300"
            >
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alertas de Cocina Críticas */}
      {kdsOrders.some((order) => Date.now() - order.timestamp > 600000) && (
        <div className="p-4 bg-rose-550/10 border border-rose-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-350 font-semibold">
            <AlertCircle className="h-5 w-5 text-rose-550 animate-pulse animate-duration-1000" />
            <span>
              Alerta de Desvío: Existen pedidos en cola de cocina con tiempos de
              demora superiores a los 10 minutos recomendados.
            </span>
          </div>
        </div>
      )}

      {/* Tabs superiores */}
      <div className="flex overflow-x-auto border-b border-slate-900 gap-2 items-center">
        <button
          onClick={() => addNotification('Micrófono activo: Dictá la comanda (ej: "Mesa 4 una Pizza Muzarella y dos Cervezas").')}
          className="shrink-0 ml-auto order-last px-3 py-1.5 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Mic className="h-4 w-4 text-indigo-400 animate-pulse" />
          Comanda por Voz NLP
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "tables"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Utensils className="h-4 w-4" />
          Plano de Mesas
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`shrink-0 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "reservations"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Reservas
          {reservations.filter((item) => item.status === "confirmed").length >
            0 && (
            <span className="bg-emerald-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-black ml-1">
              {
                reservations.filter((item) => item.status === "confirmed")
                  .length
              }
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("kds")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "kds"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ChefHat className="h-4 w-4" />
          Monitor de Cocina (KDS)
          {kdsOrders.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-black ml-1">
              {kdsOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("patron_ia")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "patron_ia"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="h-4 w-4 text-indigo-400" />
          El Patrón IA (WhatsApp)
          {patronChats.filter((c) => c.status === "pending").length > 0 && (
            <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black ml-1">
              {patronChats.filter((c) => c.status === "pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("cash")}
          className={`shrink-0 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "cash"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <WalletCards className="h-4 w-4" />
          Caja y cierres
          <span
            className={`h-2 w-2 rounded-full ${cashState.isOpen ? "bg-emerald-400" : "bg-slate-600"}`}
          />
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`shrink-0 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "reports"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Reportes
        </button>
        <button
          onClick={() => setActiveTab("waiters")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "waiters"
              ? "border-slate-500 text-slate-450 bg-slate-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="h-4 w-4" />
          Estadísticas de Mozos
        </button>
      </div>

      {/* VISTA 1: PLANO DE MESAS */}
      {activeTab === "tables" && (
        <div className="space-y-6">
          {/* Buscador y Filtros */}
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase block">
                Buscar Mesa / Mozo
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar mesa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none"
                />
                <Search className="h-3.5 w-3.5 text-slate-650 absolute left-2.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase block">
                Estado Mesa
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
              >
                <option value="all">Todos los Estados</option>
                <option value="available">Disponible</option>
                <option value="busy">Ocupada</option>
                <option value="reserved">Reservada</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase block">
                Capacidad Mínima
              </label>
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
              >
                <option value="all">Cualquiera</option>
                <option value="2">2+ personas</option>
                <option value="4">4+ personas</option>
                <option value="6">6+ personas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grilla y Herramientas */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Agregar Mesa */}
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="h-5 w-5 text-cyan-400" />
                  <span className="font-bold text-xs text-white uppercase tracking-wider">
                    Gestión de Plano
                  </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Ej: Mesa 7, Barra 2"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-cyan-500 flex-1 sm:w-40"
                  />
                  <select
                    value={newTableCapacity}
                    onChange={(e) =>
                      setNewTableCapacity(Number(e.target.value))
                    }
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                  >
                    <option value={2}>2 pers.</option>
                    <option value={4}>4 pers.</option>
                    <option value={6}>6 pers.</option>
                    <option value={8}>8 pers.</option>
                  </select>
                  <button
                    onClick={() => void handleAddTable()}
                    disabled={operationsBusy || !newTableName.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-550 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 animate-pulse-once disabled:cursor-wait disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Agregar Mesa
                  </button>
                </div>
              </div>

              {/* Listado de Mesas */}
              <div className="bg-slate-900/30 p-6 rounded-3xl border border-slate-850 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredTables.map((table) => {
                  const isBusy = table.status === "busy";
                  const isReserved = table.status === "reserved";
                  return (
                    <div
                      key={table.id}
                      className={`p-4 rounded-2xl text-left border flex flex-col justify-between h-36 transition-all relative group ${
                        isBusy
                          ? "bg-rose-950/15 border-rose-500/25 hover:border-rose-500"
                          : isReserved
                            ? "bg-amber-950/15 border-amber-500/25 hover:border-amber-500"
                            : "bg-slate-950/40 border-slate-855 hover:border-cyan-500/50"
                      }`}
                    >
                      {/* Botón de Borrar Mesa */}
                      <button
                        onClick={() =>
                          void handleDeleteTable(table.id, table.name)
                        }
                        disabled={operationsBusy}
                        aria-label={`Eliminar ${table.name}`}
                        className="absolute top-3 right-3 p-1 bg-slate-950 hover:bg-rose-950 hover:text-rose-400 text-slate-600 rounded-lg transition-colors border border-slate-900"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedTable(table);
                          setComandaCart([]);
                          setAssignedWaiter(table.waiter || waiters[0].name);
                        }}
                        className="w-full h-full flex flex-col justify-between text-left"
                      >
                        <div className="flex flex-col gap-1 pr-6">
                          <span className="font-extrabold text-white text-sm">
                            {table.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Capacidad: {table.capacity} pers.
                          </span>
                        </div>

                        <div className="mt-4 flex flex-col gap-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase w-fit ${
                              isBusy
                                ? "bg-rose-500/10 text-rose-455 border border-rose-500/20"
                                : isReserved
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-slate-900 text-slate-500 border border-slate-800"
                            }`}
                          >
                            {isBusy
                              ? "Ocupada"
                              : isReserved
                                ? "Reservada"
                                : "Libre"}
                          </span>

                          {isBusy && (
                            <div className="flex items-center justify-between w-full text-[10px]">
                              <span className="text-slate-400 font-bold">
                                {table.waiter}
                              </span>
                              <span className="text-rose-455 font-black">
                                ${table.total.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lateral: Cargar Comanda / Detalle Mesa */}
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 flex flex-col justify-between min-h-[460px]">
              {selectedTable ? (
                <div className="flex flex-col justify-between h-full gap-6">
                  {/* Cabecera Mesa */}
                  <div>
                    <div className="flex justify-between items-start pb-4 border-b border-slate-850">
                      <div>
                        <h4 className="font-black text-base text-white">
                          {selectedTable.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Capacidad: {selectedTable.capacity} personas
                        </span>
                      </div>

                      <div className="flex gap-1">
                        {selectedTable.items.length > 0 && (
                          <button
                            onClick={() => handlePrintComanda(selectedTable)}
                            className="p-1.5 bg-slate-950 hover:bg-slate-900 rounded-lg border border-slate-850"
                          >
                            <Printer className="h-3.5 w-3.5 text-cyan-400" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTable(null)}
                          className="text-slate-500 hover:text-white p-1 hover:bg-slate-950 rounded-lg"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Asignar Mozo */}
                    <div className="py-3 border-b border-slate-850 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Mozo Asignado:
                      </span>
                      <select
                        value={assignedWaiter}
                        onChange={(e) => setAssignedWaiter(e.target.value)}
                        disabled={selectedTable.status === "busy"}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        {waiters.map((w) => (
                          <option key={w.id} value={w.name}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Items Consumidos */}
                    {selectedTable.items.length > 0 && (
                      <div className="py-4 border-b border-slate-850 space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Consumido
                        </span>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {selectedTable.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs bg-slate-950/40 p-2 rounded-xl border border-slate-850"
                            >
                              <span className="text-slate-300">
                                {item.product.name}{" "}
                                <strong className="text-cyan-400">
                                  x{item.quantity}
                                </strong>
                              </span>
                              <span className="font-extrabold text-slate-200">
                                $
                                {(
                                  item.product.price * item.quantity
                                ).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cargar Comanda */}
                    <div className="py-4 space-y-3">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Menú Rápido
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {products.map((prod) => (
                          <button
                            key={prod.id}
                            onClick={() => handleAddToComanda(prod)}
                            className="py-2 px-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-left text-[10px] font-bold text-slate-300 truncate"
                          >
                            + {prod.name}
                          </button>
                        ))}
                      </div>

                      {/* Pedidos temporales */}
                      {comandaCart.length > 0 && (
                        <div className="mt-3 p-3 bg-slate-950/60 rounded-xl border border-slate-850/60 space-y-2">
                          <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block">
                            Nuevos ítems a enviar
                          </span>
                          <div className="space-y-2">
                            {comandaCart.map((item) => (
                              <div
                                key={item.product.id}
                                className="flex justify-between items-center text-xs"
                              >
                                <span className="truncate flex-1 pr-2 text-slate-300">
                                  {item.product.name}
                                </span>
                                <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-0.5 border border-slate-800 mr-2">
                                  <button
                                    onClick={() =>
                                      handleUpdateQty(item.product.id, -1)
                                    }
                                    className="p-0.5 text-slate-500 hover:text-white"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="text-[10px] font-bold text-white min-w-[12px] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleUpdateQty(item.product.id, 1)
                                    }
                                    className="p-0.5 text-slate-500 hover:text-white"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="font-extrabold text-slate-200">
                                  $
                                  {(
                                    item.product.price * item.quantity
                                  ).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="space-y-2.5">
                    {comandaCart.length > 0 && (
                      <button
                        onClick={() => void handleSendToKitchen()}
                        disabled={sendingOrder}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-900/10 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        {sendingOrder
                          ? "Confirmando stock..."
                          : "Enviar Comanda a Cocina"}
                      </button>
                    )}

                    {selectedTable.items.length > 0 && (
                      <button
                        onClick={() => handleOpenCheckout(selectedTable)}
                        className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-emerald-500/20 text-emerald-450 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <Receipt className="h-4 w-4" />
                        Preparar cierre (${selectedTable.total.toLocaleString()}
                        )
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-28 text-slate-650 text-xs my-auto">
                  <Coffee className="h-10 w-10 mx-auto mb-2 text-slate-800" />
                  Selecciona una mesa en el plano para gestionar sus pedidos y
                  cuentas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "reservations" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
          <section
            className="space-y-4 rounded-2xl border border-slate-850 bg-slate-900/40 p-5"
            aria-label="Nueva reserva"
          >
            <div>
              <h3 className="font-extrabold text-base text-white">
                Nueva reserva
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Agenda una mesa y evita superposiciones.
              </p>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                  Cliente
                </span>
                <input
                  value={reservationName}
                  onChange={(event) => setReservationName(event.target.value)}
                  placeholder="Nombre y apellido"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                  Telefono
                </span>
                <input
                  value={reservationPhone}
                  onChange={(event) => setReservationPhone(event.target.value)}
                  placeholder="11 5555 5555"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                    Fecha
                  </span>
                  <input
                    type="date"
                    value={reservationDate}
                    onChange={(event) => setReservationDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-white"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                    Hora
                  </span>
                  <input
                    type="time"
                    value={reservationTime}
                    onChange={(event) => setReservationTime(event.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-white"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                    Personas
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={reservationGuests}
                    onChange={(event) =>
                      setReservationGuests(
                        Math.max(1, Number(event.target.value)),
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                    Duracion
                  </span>
                  <select
                    value={reservationDuration}
                    onChange={(event) =>
                      setReservationDuration(Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-white"
                  >
                    <option value={60}>1 hora</option>
                    <option value={90}>1 h 30</option>
                    <option value={120}>2 horas</option>
                    <option value={180}>3 horas</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
                  Mesa
                </span>
                <select
                  value={reservationTableId}
                  onChange={(event) =>
                    setReservationTableId(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="">Asignar luego</option>
                  {tables
                    .filter((table) => table.capacity >= reservationGuests)
                    .map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} - {table.capacity} personas
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <button
              onClick={() => void handleCreateReservation()}
              disabled={operationsBusy || !reservationName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 disabled:cursor-wait disabled:opacity-40"
            >
              <CalendarDays className="h-4 w-4" />
              Confirmar reserva
            </button>
          </section>

          <section
            className="overflow-hidden rounded-2xl border border-slate-850 bg-slate-900/40"
            aria-label="Agenda de reservas"
          >
            <div className="border-b border-slate-850 px-5 py-4">
              <h3 className="font-extrabold text-base text-white">
                Agenda de reservas
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Proximas reservas y seguimiento de asistencia.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-950/60 text-[9px] uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Mesa</th>
                    <th className="px-4 py-3">Personas</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-slate-950/30">
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {new Date(reservation.reservedFor).toLocaleString(
                          "es-AR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-white">
                          {reservation.customerName}
                        </span>
                        {reservation.phone && (
                          <span className="mt-0.5 block text-[10px] text-slate-500">
                            {reservation.phone}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {reservation.tableName}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {reservation.guests}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-400">
                        {reservation.source}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-950 px-2 py-1 text-[9px] font-bold text-emerald-400">
                          {RESERVATION_STATUS_LABELS[reservation.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {reservation.status === "confirmed" && (
                            <>
                              <button
                                onClick={() =>
                                  void handleReservationStatus(
                                    reservation.id,
                                    "seated",
                                  )
                                }
                                disabled={
                                  operationsBusy || !reservation.tableId
                                }
                                className="rounded-lg border border-emerald-500/30 px-2 py-1 font-bold text-emerald-400 disabled:opacity-30"
                              >
                                Sentar
                              </button>
                              <button
                                onClick={() =>
                                  void handleReservationStatus(
                                    reservation.id,
                                    "no_show",
                                  )
                                }
                                disabled={operationsBusy}
                                className="rounded-lg border border-slate-700 px-2 py-1 font-bold text-slate-400"
                              >
                                No asistio
                              </button>
                              <button
                                onClick={() =>
                                  void handleReservationStatus(
                                    reservation.id,
                                    "cancelled",
                                  )
                                }
                                disabled={operationsBusy}
                                className="rounded-lg border border-rose-500/30 px-2 py-1 font-bold text-rose-400"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {reservation.status === "seated" && (
                            <button
                              onClick={() =>
                                void handleReservationStatus(
                                  reservation.id,
                                  "completed",
                                )
                              }
                              disabled={operationsBusy}
                              className="rounded-lg border border-cyan-500/30 px-2 py-1 font-bold text-cyan-400"
                            >
                              Completar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reservations.length === 0 && (
              <div className="py-16 text-center text-xs text-slate-500">
                No hay reservas en la agenda.
              </div>
            )}
          </section>
        </div>
      )}

      {/* VISTA 2: MONITOR DE COCINA (KDS) */}
      {activeTab === "kds" && (
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-850">
            <div>
              <h3 className="font-extrabold text-base text-white">
                Cola de Pedidos en Cocina
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Monitoreo de pedidos en preparación clasificados por tiempo de
                espera.
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-400">
              KDS Activo
            </span>
          </div>

          {kdsOrders.length === 0 ? (
            <div className="text-center py-20 text-slate-650 text-xs">
              <ChefHat className="h-12 w-12 mx-auto mb-2 text-slate-850" />
              No hay pedidos pendientes de elaboración en cocina.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kdsOrders.map((order) => {
                const elapsed = Date.now() - order.timestamp;
                const minutes = Math.floor(elapsed / 60000);

                const isDelayed = minutes > 10;
                const alertColor = isDelayed
                  ? "border-rose-500/30 bg-rose-950/10 text-rose-300 animate-pulse-slow"
                  : minutes > 5
                    ? "border-amber-500/30 bg-amber-950/10 text-amber-300"
                    : "border-slate-855 bg-slate-950/40 text-slate-300";

                return (
                  <div
                    key={order.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${alertColor}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-sm text-white">
                            {order.tableName}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Mozo: {order.waiterName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Hace {minutes} min
                        </span>
                      </div>

                      {/* Timeline Interno del Pedido */}
                      <div className="mt-3 flex items-center justify-between text-[9px] bg-slate-900 border border-slate-850 p-2 rounded-lg">
                        <button
                          disabled
                          className={`px-1.5 py-0.5 rounded font-extrabold ${order.status === "pending" ? "bg-rose-550/20 text-rose-400" : "text-slate-500"}`}
                        >
                          En Cola
                        </button>
                        <ChevronRight className="h-3 w-3 text-slate-700" />
                        <button
                          onClick={() =>
                            void handleUpdateKdsStatus(order.id, "preparing")
                          }
                          disabled={
                            operationsBusy || order.status !== "pending"
                          }
                          className={`px-1.5 py-0.5 rounded font-extrabold ${order.status === "preparing" ? "bg-amber-500/20 text-amber-400" : "text-slate-500"}`}
                        >
                          Preparando
                        </button>
                        <ChevronRight className="h-3 w-3 text-slate-700" />
                        <button
                          onClick={() =>
                            void handleUpdateKdsStatus(order.id, "ready")
                          }
                          disabled={operationsBusy || order.status === "ready"}
                          className={`px-1.5 py-0.5 rounded font-extrabold ${order.status === "ready" ? "bg-emerald-500/20 text-emerald-450" : "text-slate-500"}`}
                        >
                          Listo
                        </button>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-slate-850/40 pt-3">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-xs"
                          >
                            <span className="text-slate-350">{item.name}</span>
                            <span className="font-bold text-cyan-400">
                              x{item.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          void handleMarkKdsReady(order.id, order.tableName)
                        }
                        disabled={operationsBusy || order.status !== "ready"}
                        className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs font-bold rounded-xl text-emerald-450 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Check className="h-4 w-4" />
                        Entregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: EL PATRÓN IA - CHAT & PEDIDOS */}
      {activeTab === "patron_ia" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listado de Chats */}
          <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-3xl border border-slate-850 flex flex-col gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-indigo-400" />
                Mensajes Recibidos
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Canales integrados mediante El Patrón IA
              </p>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[400px]">
              {patronChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 rounded-2xl text-left border transition-all ${
                    selectedChatId === chat.id
                      ? "bg-indigo-950/15 border-indigo-500/45 text-white"
                      : "bg-slate-950/40 border-slate-855 hover:border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-xs">
                      {chat.sender}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        chat.status === "processed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}
                    >
                      {chat.status === "processed" ? "Procesado" : "Pendiente"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    "{chat.message}"
                  </p>
                </button>
              ))}
            </div>

            {/* FASE 3: Simulador NLP de WhatsApp / Instagram */}
            <form
              onSubmit={handleParseCustomMessage}
              className="border-t border-slate-850 pt-4 mt-2 space-y-2"
            >
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Simular Mensaje Entrante (NLP Test)
              </span>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Escribe: 'Mesa para 4 a las 21hs' o 'Quiero una pizza y una cerveza'..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 min-h-[60px] resize-none"
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bot className="h-3.5 w-3.5" />
                Simular Inferencia NLP
              </button>
            </form>
          </div>

          {/* Análisis del Asistente IA */}
          <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-855 flex flex-col justify-between min-h-[460px]">
            {selectedChat ? (
              <div className="flex flex-col justify-between h-full gap-6">
                <div className="space-y-6">
                  {/* Cabecera Chat */}
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-850">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-indigo-500/25 text-indigo-400 flex items-center justify-center">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">
                        Análisis IA: El Patrón
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Conversación de {selectedChat.sender}
                      </span>
                    </div>
                  </div>

                  {/* Mensaje original */}
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">
                      Mensaje de Cliente
                    </span>
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      "{selectedChat.message}"
                    </p>
                  </div>

                  {/* Extracción de Entidades */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                      Inferencia Estructurada
                    </span>

                    {selectedChat.extractedType === "reservation" ? (
                      <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            Tipo de Inferencia
                          </span>
                          <span className="font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase text-[9px]">
                            Reserva de Mesa
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-900">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">
                              Nombre Reserva
                            </span>
                            <span className="font-bold text-slate-200 mt-0.5 block">
                              {selectedChat.extractedData.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">
                              Comensales
                            </span>
                            <span className="font-bold text-slate-200 mt-0.5 block">
                              {selectedChat.extractedData.guests} personas
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-500 uppercase block">
                              Horario Solicitado
                            </span>
                            <span className="font-bold text-slate-250 mt-0.5 block">
                              {selectedChat.extractedData.time} hs
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            Tipo de Inferencia
                          </span>
                          <span className="font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 uppercase text-[9px]">
                            {selectedChat.extractedType === "order"
                              ? "Delivery a Domicilio"
                              : "Retiro Takeaway"}
                          </span>
                        </div>

                        {/* Listado de platos extraídos */}
                        <div className="space-y-2 pt-2 border-t border-slate-900">
                          <span className="text-[9px] text-slate-500 uppercase font-bold block">
                            Platos e Insumos Detectados
                          </span>
                          {selectedChat.extractedData.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs"
                            >
                              <span className="text-slate-300">
                                {item.name}{" "}
                                <strong className="text-indigo-400">
                                  x{item.qty}
                                </strong>
                              </span>
                              <span className="font-bold text-slate-400">
                                ${(item.price * item.qty).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {selectedChat.extractedData.address && (
                          <div className="pt-3 border-t border-slate-900">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">
                              Dirección de Envío
                            </span>
                            <span className="text-xs text-slate-200 block mt-0.5">
                              {selectedChat.extractedData.address}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-3 border-t border-slate-900">
                          <span className="font-bold text-xs text-white">
                            TOTAL ESTIMADO
                          </span>
                          <span className="font-black text-cyan-400 text-sm">
                            $
                            {selectedChat.extractedData.total?.toLocaleString() ||
                              "0"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón de Acción */}
                <div>
                  {selectedChat.status === "pending" ? (
                    <button
                      onClick={() =>
                        void handleProcessPatronAction(selectedChat)
                      }
                      disabled={operationsBusy}
                      className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/15 animate-bounce-once disabled:cursor-wait disabled:opacity-50"
                    >
                      <Bot className="h-4.5 w-4.5 text-white" />
                      {selectedChat.extractedType === "reservation"
                        ? "Aprobar Reserva de Mesa"
                        : "Aprobar & Mandar Comanda a Cocina"}
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center gap-3 text-emerald-450 justify-center text-xs font-bold shadow-inner">
                      <Check className="h-5 w-5" />
                      Pedido Procesado y Agregado Exitosamente
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-28 text-slate-650 text-xs my-auto">
                <Bot className="h-10 w-10 mx-auto mb-2 text-slate-800" />
                Selecciona un chat en la lista de la izquierda para analizar la
                comanda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 4: ESTADÍSTICAS DE MOZOS */}
      {activeTab === "cash" && (
        <GastronomyCashConsole
          state={cashState}
          settlements={settlements}
          openingBalance={openingBalance}
          declaredCash={declaredCash}
          busy={operationsBusy}
          onOpeningBalanceChange={setOpeningBalance}
          onDeclaredCashChange={setDeclaredCash}
          onOpen={() => void handleOpenCash()}
          onClose={() => void handleCloseCash()}
        />
      )}

      {activeTab === "reports" && <GastronomyReportsConsole />}

      {activeTab === "waiters" && (
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-850 space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-white">
              Estadísticas del Turno de Mozos
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Control del rendimiento acumulado de ventas por personal en el
              turno actual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {waiters.map((waiter) => (
              <div
                key={waiter.id}
                className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      {waiter.name}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Mozo de Salón
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-3">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">
                      Mesas Activas
                    </span>
                    <span className="font-bold text-slate-200 text-sm mt-0.5 block">
                      {waiter.tablesActive} mesas
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">
                      Ventas Acumuladas
                    </span>
                    <span className="font-black text-cyan-400 text-sm mt-0.5 block">
                      ${waiter.totalSales.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESIONES */}
      {printModalContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={printModalContent.title}
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-900 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                {printModalContent.title}
              </h4>
              <button
                onClick={() => setPrintModalContent(null)}
                aria-label="Cerrar impresion"
                className="text-slate-400 hover:text-slate-650"
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
                  alert("Imprimiendo comanda...");
                  setPrintModalContent(null);
                }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-550 text-slate-950 font-bold rounded-xl text-xs"
              >
                Confirmar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CHECKOUT Y SIMULACIÓN TICKET FISCAL */}
      {showCheckoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Cierre de cuenta de ${showCheckoutModal.name}`}
        >
          <div className="max-h-[92vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-400" />
                <h4 className="font-black text-base text-white">
                  Cierre de Cuenta: {showCheckoutModal.name}
                </h4>
              </div>
              <button
                onClick={() => setShowCheckoutModal(null)}
                aria-label="Cerrar cobro"
                className="text-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Divisor de Cuenta (Split Bill) */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs text-left">
              <span className="text-[9px] text-indigo-400 font-bold uppercase block">
                Dividir Cuenta (Split Bill por Comensal)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">
                  Dividir cuenta entre:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSplitDinersCount(n)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${splitDinersCount === n ? "bg-indigo-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-400"}`}
                    >
                      {n}p
                    </button>
                  ))}
                </div>
              </div>
              {splitDinersCount > 1 && checkoutTax && (
                <span className="text-emerald-400 font-bold text-[10px] block pt-1">
                  Monto por Persona ({splitDinersCount}): $
                  {(checkoutTax.total / splitDinersCount).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 },
                  )}
                </span>
              )}
            </div>

            {/* Medios de Pago */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Método de Pago
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => selectPaymentMethod("cash")}
                  aria-pressed={paymentMethod === "cash"}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === "cash"
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  Efectivo
                </button>
                <button
                  onClick={() => selectPaymentMethod("card")}
                  aria-pressed={paymentMethod === "card"}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === "card"
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Tarjeta
                </button>
                <button
                  onClick={() => selectPaymentMethod("qr")}
                  aria-pressed={paymentMethod === "qr"}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === "qr"
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  QR Pago
                </button>
              </div>
            </div>

            {/* Calculadora de División de Cuenta */}
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block flex items-center gap-1.5">
                <Scale className="h-4 w-4" />
                Dividir Cuenta (Split Bill)
              </span>
              <div className="flex gap-3 items-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold">
                  Dividir en:
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  aria-label="Cantidad de pagos"
                  value={splitCount}
                  onChange={(e) =>
                    handleSplitCountChange(Number(e.target.value))
                  }
                  className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">
                  Personas
                </span>
              </div>
              {splitCount > 1 && (
                <div className="text-xs text-indigo-350 font-bold bg-indigo-950/10 border border-indigo-500/15 p-2.5 rounded-xl">
                  Promedio por Persona ({splitCount}x): $
                  {(
                    (showCheckoutModal.total + tipAmount) /
                    splitCount
                  ).toLocaleString()}
                </div>
              )}
              {splitCount > 1 && (
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  {splitPayments(showCheckoutModal.total + tipAmount).map(
                    (payment, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_110px] items-center gap-2"
                      >
                        <div>
                          <span className="block text-[10px] font-bold text-slate-500">
                            Pago {index + 1}
                          </span>
                          <span className="text-xs font-black text-white">
                            $
                            {payment.amount.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <select
                          value={splitMethods[index] ?? paymentMethod}
                          onChange={(event) =>
                            setSplitMethods((current) =>
                              current.map((method, methodIndex) =>
                                methodIndex === index
                                  ? (event.target.value as PaymentMethod)
                                  : method,
                              ),
                            )
                          }
                          className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                        >
                          <option value="cash">Efectivo</option>
                          <option value="card">Tarjeta</option>
                          <option value="qr">QR</option>
                        </select>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 border-l-2 border-emerald-500 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Propina
                  </span>
                  <span className="text-xs text-slate-500">
                    No integra la base imponible
                  </span>
                </div>
                <span className="font-black text-emerald-400">
                  ${tipAmount.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 10, 15].map((rate) => (
                  <button
                    key={rate}
                    onClick={() =>
                      setTipAmount(
                        Number(
                          ((showCheckoutModal.total * rate) / 100).toFixed(2),
                        ),
                      )
                    }
                    className={`h-8 rounded-md border text-xs font-bold ${Math.abs(tipAmount - (showCheckoutModal.total * rate) / 100) < 0.01 ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-800 text-slate-400"}`}
                  >
                    {rate}%
                  </button>
                ))}
                <input
                  aria-label="Propina personalizada"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tipAmount}
                  onChange={(event) =>
                    setTipAmount(Math.max(0, Number(event.target.value)))
                  }
                  className="h-8 min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Borrador previo a la emision fiscal real. */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4 font-mono text-[11px] text-slate-400 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-800 pb-3">
                <span className="font-extrabold text-white block">
                  BORRADOR DE CIERRE
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Los datos fiscales se completan en Facturacion
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1">
                {showCheckoutModal.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="truncate pr-4">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-bold text-slate-200 shrink-0">
                      ${(item.product.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cálculos de IVA */}
              {checkoutTax && (
                <div className="border-t border-dashed border-slate-800 pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Subtotal Neto</span>
                    <span>${checkoutTax.subtotal.toFixed(2)}</span>
                  </div>
                  {checkoutTax.breakdown
                    .filter((row) => row.gross > 0)
                    .map((row) => (
                      <div
                        key={row.rate}
                        className="flex justify-between text-slate-500 text-[10px]"
                      >
                        <span>IVA {row.rate}%</span>
                        <span>${row.tax.toFixed(2)}</span>
                      </div>
                    ))}
                  <div className="flex justify-between border-t border-dashed border-slate-800 pt-2 text-xs text-white">
                    <span>Venta</span>
                    <span>${checkoutTax.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Propina</span>
                    <span>${tipAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-800 pt-2 text-sm font-bold text-white">
                    <span>TOTAL A COBRAR</span>
                    <span className="text-cyan-400">
                      ${(checkoutTax.total + tipAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-dashed border-slate-800">
                <span className="font-bold text-amber-400">
                  Pendiente de autorizacion fiscal ARCA
                </span>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCheckoutModal(null)}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-xs font-bold text-slate-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleConfirmCheckout()}
                disabled={settlingCheckout}
                className="flex items-center justify-center gap-1.5 rounded-md bg-cyan-600 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-550 disabled:cursor-wait disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {settlingCheckout
                  ? "Registrando cobro..."
                  : "Cobrar y cerrar mesa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
