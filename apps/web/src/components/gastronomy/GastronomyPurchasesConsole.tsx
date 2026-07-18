'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardList,
  PackageCheck,
  Pencil,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/client/apiFetch';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  costPerUnit: number;
}

interface Supplier {
  id: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
}

type PurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

interface PurchaseLine {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: number;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  expectedAt: string | null;
  notes: string;
  totalEstimated: number;
  createdAt: string;
  lines: PurchaseLine[];
}

interface OrderDraft {
  supplierId: string;
  status: 'draft' | 'ordered';
  expectedAt: string;
  notes: string;
  lines: Array<{ ingredientId: string; quantity: number; unitCost: number }>;
}

interface ReceiptDraft {
  order: PurchaseOrder;
  notes: string;
  lines: Array<{ ingredientId: string; quantity: number; unitCost: number }>;
}

const EMPTY_SUPPLIER: Omit<Supplier, 'id'> = {
  name: '', taxId: '', phone: '', email: '', address: '', active: true,
};

const money = (value: number) => `$${Math.round(value).toLocaleString('es-AR')}`;

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: 'Borrador',
  ordered: 'Enviada',
  partially_received: 'Recepcion parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
};

export default function GastronomyPurchasesConsole({
  ingredients,
  onInventoryChanged,
}: {
  ingredients: Ingredient[];
  onInventoryChanged: () => Promise<void>;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [supplierDraft, setSupplierDraft] = useState<Supplier | Omit<Supplier, 'id'> | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supplierResponse, orderResponse] = await Promise.all([
        apiFetch<{ items: Supplier[] }>('/api/rubros/gastronomy/suppliers'),
        apiFetch<{ items: PurchaseOrder[] }>('/api/rubros/gastronomy/purchases'),
      ]);
      setSuppliers(supplierResponse.items);
      setOrders(orderResponse.items);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo cargar el circuito de compras.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3500);
  };

  const activeSuppliers = suppliers.filter((item) => item.active);
  const openOrders = orders.filter((item) => ['ordered', 'partially_received'].includes(item.status));
  const pendingUnits = openOrders.reduce((sum, order) => sum + order.lines.reduce(
    (lineSum, line) => lineSum + line.quantityOrdered - line.quantityReceived,
    0,
  ), 0);
  const committed = openOrders.reduce((sum, order) => sum + order.totalEstimated, 0);
  const lowStock = ingredients.filter((item) => item.stock <= item.minStock).length;

  const suggestedLines = useMemo(() => ingredients
    .filter((item) => item.stock <= item.minStock)
    .map((item) => ({
      ingredientId: item.id,
      quantity: Math.max(1, Number((item.minStock * 2 - item.stock).toFixed(3))),
      unitCost: item.costPerUnit,
    })), [ingredients]);

  const newOrder = () => {
    const fallback = ingredients[0];
    setOrderDraft({
      supplierId: activeSuppliers[0]?.id ?? '',
      status: 'ordered',
      expectedAt: '',
      notes: '',
      lines: suggestedLines.length ? suggestedLines : fallback
        ? [{ ingredientId: fallback.id, quantity: 1, unitCost: fallback.costPerUnit }]
        : [],
    });
  };

  const saveSupplier = async () => {
    if (!supplierDraft?.name.trim()) return;
    setSaving(true);
    try {
      const response = await apiFetch<{ item: Supplier }>('/api/rubros/gastronomy/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplierDraft),
      });
      setSuppliers((current) => 'id' in supplierDraft
        ? current.map((item) => item.id === response.item.id ? response.item : item)
        : [response.item, ...current]);
      setSupplierDraft(null);
      notify('Proveedor guardado.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const saveOrder = async () => {
    if (!orderDraft?.supplierId || !orderDraft.lines.length) return;
    setSaving(true);
    try {
      const response = await apiFetch<{ item: PurchaseOrder }>('/api/rubros/gastronomy/purchases', {
        method: 'POST',
        body: JSON.stringify(orderDraft),
      });
      setOrders((current) => [response.item, ...current]);
      setOrderDraft(null);
      notify(`Orden #${response.item.orderNumber} creada.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo crear la orden.');
    } finally {
      setSaving(false);
    }
  };

  const beginReceipt = (order: PurchaseOrder) => {
    setReceiptDraft({
      order,
      notes: '',
      lines: order.lines.filter((line) => line.quantityReceived < line.quantityOrdered).map((line) => ({
        ingredientId: line.ingredientId,
        quantity: Number((line.quantityOrdered - line.quantityReceived).toFixed(3)),
        unitCost: line.unitCost,
      })),
    });
  };

  const receiveOrder = async () => {
    if (!receiptDraft) return;
    const lines = receiptDraft.lines.filter((line) => line.quantity > 0);
    if (!lines.length) return;
    setSaving(true);
    try {
      await apiFetch('/api/rubros/gastronomy/purchases', {
        method: 'PATCH',
        body: JSON.stringify({ orderId: receiptDraft.order.id, notes: receiptDraft.notes, lines }),
      });
      await Promise.all([load(), onInventoryChanged()]);
      setReceiptDraft(null);
      notify('Recepcion aplicada al stock de insumos.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo registrar la recepcion.');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderLine = (index: number, field: 'ingredientId' | 'quantity' | 'unitCost', value: string) => {
    setOrderDraft((current) => current ? {
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        if (field === 'ingredientId') {
          const ingredient = ingredients.find((item) => item.id === value);
          return { ...line, ingredientId: value, unitCost: ingredient?.costPerUnit ?? 0 };
        }
        return { ...line, [field]: Math.max(0, Number(value)) };
      }),
    } : current);
  };

  const orderTotal = orderDraft?.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0) ?? 0;

  return (
    <section className="space-y-4" aria-label="Compras y proveedores gastronomicos">
      {feedback && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{feedback}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Ordenes abiertas" value={String(openOrders.length)} detail={`${pendingUnits.toFixed(2)} unidades pendientes`} />
        <Metric label="Compras comprometidas" value={money(committed)} detail="Valor estimado abierto" />
        <Metric label="Proveedores activos" value={String(activeSuppliers.length)} detail={`${suppliers.length} registrados`} />
        <Metric label="Reposicion requerida" value={String(lowStock)} detail="Insumos bajo minimo" warning={lowStock > 0} />
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold text-slate-900">Ordenes de compra</h2><p className="text-sm text-slate-500">Recepciones parciales, costos y stock trazable por insumo.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSupplierDraft({ ...EMPTY_SUPPLIER })} className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700"><Users className="h-4 w-4" />Nuevo proveedor</button>
          <button onClick={newOrder} disabled={!activeSuppliers.length || !ingredients.length} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Nueva orden</button>
        </div>
      </div>

      {loading ? <p role="status" className="py-8 text-center text-sm text-slate-500">Cargando compras...</p> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Orden</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Entrega</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Avance</th><th className="px-4 py-3">Total</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const ordered = order.lines.reduce((sum, line) => sum + line.quantityOrdered, 0);
                const received = order.lines.reduce((sum, line) => sum + line.quantityReceived, 0);
                const percent = ordered ? Math.round(received / ordered * 100) : 0;
                return (
                  <tr key={order.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-bold text-slate-900">OC #{order.orderNumber}</p><details className="mt-1 text-xs text-slate-500"><summary className="flex cursor-pointer items-center gap-1 font-semibold"><ChevronDown className="h-3.5 w-3.5" />{order.lines.length} renglones</summary><div className="mt-2 space-y-1">{order.lines.map((line) => <p key={line.id}>{line.ingredientName}: {line.quantityReceived}/{line.quantityOrdered} {line.unit}</p>)}</div></details></td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{order.supplierName}</td>
                    <td className="px-4 py-3 text-slate-600">{order.expectedAt || 'Sin fecha'}</td>
                    <td className="px-4 py-3"><Status value={order.status} /></td>
                    <td className="px-4 py-3"><div className="h-2 w-24 overflow-hidden rounded bg-slate-200"><div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} /></div><span className="mt-1 block text-xs text-slate-500">{percent}% recibido</span></td>
                    <td className="px-4 py-3 font-bold text-slate-900">{money(order.totalEstimated)}</td>
                    <td className="px-4 py-3 text-right">{['ordered', 'partially_received'].includes(order.status) && <button onClick={() => beginReceipt(order)} className="inline-flex h-8 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white"><PackageCheck className="h-4 w-4" />Recibir</button>}</td>
                  </tr>
                );
              })}
              {!orders.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No hay ordenes de compra. Crea la primera desde este modulo.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Directorio de proveedores</h3><p className="text-sm text-slate-500">Datos comerciales exclusivos de Gastronomia.</p></div></div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => <div key={supplier.id} className="flex items-start justify-between gap-3 border-b border-slate-200 py-3"><div className="min-w-0"><p className="truncate font-bold text-slate-900">{supplier.name}</p><p className="truncate text-xs text-slate-500">{supplier.taxId || 'CUIT pendiente'} {supplier.phone ? ` | ${supplier.phone}` : ''}</p></div><button onClick={() => setSupplierDraft({ ...supplier })} aria-label={`Editar ${supplier.name}`} className="rounded-md border border-slate-200 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button></div>)}
        </div>
      </div>

      {supplierDraft && <Modal title={'id' in supplierDraft ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setSupplierDraft(null)} footer={<><SecondaryButton onClick={() => setSupplierDraft(null)}>Cancelar</SecondaryButton><PrimaryButton onClick={() => void saveSupplier()} disabled={saving || !supplierDraft.name.trim()}><Check className="h-4 w-4" />Guardar</PrimaryButton></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Razon social" value={supplierDraft.name} onChange={(name) => setSupplierDraft({ ...supplierDraft, name })} wide />
          <TextField label="CUIT" value={supplierDraft.taxId} onChange={(taxId) => setSupplierDraft({ ...supplierDraft, taxId })} />
          <TextField label="Telefono" value={supplierDraft.phone} onChange={(phone) => setSupplierDraft({ ...supplierDraft, phone })} />
          <TextField label="Email" value={supplierDraft.email} onChange={(email) => setSupplierDraft({ ...supplierDraft, email })} />
          <TextField label="Direccion" value={supplierDraft.address} onChange={(address) => setSupplierDraft({ ...supplierDraft, address })} wide />
        </div>
      </Modal>}

      {orderDraft && <Modal title="Nueva orden de compra" onClose={() => setOrderDraft(null)} footer={<><SecondaryButton onClick={() => setOrderDraft(null)}>Cancelar</SecondaryButton><PrimaryButton onClick={() => void saveOrder()} disabled={saving || !orderDraft.supplierId || !orderDraft.lines.length}><ClipboardList className="h-4 w-4" />Crear orden</PrimaryButton></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><FieldLabel text="Proveedor" /><select value={orderDraft.supplierId} onChange={(event) => setOrderDraft({ ...orderDraft, supplierId: event.target.value })} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{activeSuppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><FieldLabel text="Entrega esperada" /><input type="date" value={orderDraft.expectedAt} onChange={(event) => setOrderDraft({ ...orderDraft, expectedAt: event.target.value })} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
          <label><FieldLabel text="Estado inicial" /><select value={orderDraft.status} onChange={(event) => setOrderDraft({ ...orderDraft, status: event.target.value as OrderDraft['status'] })} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="ordered">Enviar al proveedor</option><option value="draft">Guardar borrador</option></select></label>
          <TextField label="Notas" value={orderDraft.notes} onChange={(notes) => setOrderDraft({ ...orderDraft, notes })} />
        </div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="pb-2">Insumo</th><th className="pb-2">Cantidad</th><th className="pb-2">Costo unitario</th><th className="pb-2">Subtotal</th><th></th></tr></thead><tbody className="divide-y divide-slate-100">{orderDraft.lines.map((line, index) => <tr key={`${line.ingredientId}-${index}`}><td className="py-2 pr-2"><select value={line.ingredientId} onChange={(event) => updateOrderLine(index, 'ingredientId', event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2">{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></td><td className="py-2 pr-2"><input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateOrderLine(index, 'quantity', event.target.value)} className="h-9 w-28 rounded-md border border-slate-300 px-2" /></td><td className="py-2 pr-2"><input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateOrderLine(index, 'unitCost', event.target.value)} className="h-9 w-32 rounded-md border border-slate-300 px-2" /></td><td className="py-2 pr-2 font-bold">{money(line.quantity * line.unitCost)}</td><td><button onClick={() => setOrderDraft({ ...orderDraft, lines: orderDraft.lines.filter((_, lineIndex) => lineIndex !== index) })} aria-label="Quitar renglon" className="rounded-md p-2 text-rose-600"><X className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3"><button onClick={() => { const ingredient = ingredients.find((item) => !orderDraft.lines.some((line) => line.ingredientId === item.id)); if (ingredient) setOrderDraft({ ...orderDraft, lines: [...orderDraft.lines, { ingredientId: ingredient.id, quantity: 1, unitCost: ingredient.costPerUnit }] }); }} className="flex items-center gap-2 text-sm font-bold text-blue-700"><Plus className="h-4 w-4" />Agregar insumo</button><p className="text-lg font-bold text-slate-900">Total {money(orderTotal)}</p></div>
      </Modal>}

      {receiptDraft && <Modal title={`Recibir OC #${receiptDraft.order.orderNumber}`} onClose={() => setReceiptDraft(null)} footer={<><SecondaryButton onClick={() => setReceiptDraft(null)}>Cancelar</SecondaryButton><PrimaryButton onClick={() => void receiveOrder()} disabled={saving || !receiptDraft.lines.some((line) => line.quantity > 0)}><PackageCheck className="h-4 w-4" />Aplicar recepcion</PrimaryButton></>}>
        <p className="mb-4 text-sm text-slate-600">Puedes recibir una parte ahora. El saldo quedara abierto para una proxima entrega.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="pb-2">Insumo</th><th className="pb-2">Pendiente</th><th className="pb-2">Recibir</th><th className="pb-2">Costo real</th></tr></thead><tbody className="divide-y divide-slate-100">{receiptDraft.lines.map((line, index) => { const orderLine = receiptDraft.order.lines.find((item) => item.ingredientId === line.ingredientId)!; const pending = orderLine.quantityOrdered - orderLine.quantityReceived; return <tr key={line.ingredientId}><td className="py-3 font-bold text-slate-900">{orderLine.ingredientName}</td><td className="py-3 text-slate-600">{pending} {orderLine.unit}</td><td className="py-3"><input type="number" min="0" max={pending} step="0.001" value={line.quantity} onChange={(event) => setReceiptDraft({ ...receiptDraft, lines: receiptDraft.lines.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: Math.max(0, Number(event.target.value)) } : item) })} className="h-9 w-28 rounded-md border border-slate-300 px-2" /></td><td className="py-3"><input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => setReceiptDraft({ ...receiptDraft, lines: receiptDraft.lines.map((item, lineIndex) => lineIndex === index ? { ...item, unitCost: Math.max(0, Number(event.target.value)) } : item) })} className="h-9 w-32 rounded-md border border-slate-300 px-2" /></td></tr>; })}</tbody></table></div>
        <div className="mt-4"><TextField label="Nota de recepcion" value={receiptDraft.notes} onChange={(notes) => setReceiptDraft({ ...receiptDraft, notes })} wide /></div>
      </Modal>}
    </section>
  );
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <div className="border-l-2 border-slate-200 bg-white px-4 py-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${warning ? 'text-amber-700' : 'text-slate-900'}`}>{warning && <AlertTriangle className="mr-2 inline h-5 w-5" />}{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Status({ value }: { value: PurchaseStatus }) {
  const tone = value === 'received' ? 'bg-emerald-100 text-emerald-700' : value === 'partially_received' ? 'bg-amber-100 text-amber-800' : value === 'ordered' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700';
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-bold ${tone}`}>{STATUS_LABELS[value]}</span>;
}

function FieldLabel({ text }: { text: string }) { return <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{text}</span>; }

function TextField({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><FieldLabel text={label} /><input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" /></label>;
}

function Modal({ title, children, footer, onClose }: { title: string; children: ReactNode; footer: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="font-bold text-slate-900">{title}</h3><button onClick={onClose} aria-label="Cerrar" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header><div className="p-5">{children}</div><footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</footer></div></div>;
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) { return <button onClick={onClick} disabled={disabled} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40">{children}</button>; }
function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button onClick={onClick} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700">{children}</button>; }
