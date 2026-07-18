import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  enumValue,
  optionalString,
  readJsonObject,
  requiredArray,
  requiredNumber,
  requiredString,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  listGastronomyPurchaseOrders,
  receiveGastronomyPurchaseOrder,
  saveGastronomyPurchaseOrder,
} from '@/lib/api/gastronomyRepository';

const ORDER_STATUSES = ['draft', 'ordered'] as const;

function purchaseLines(body: Record<string, unknown>) {
  const rawLines = requiredArray(body, 'lines', 'La orden');
  if (!rawLines.length || rawLines.length > 100) {
    throw new ApiError(400, 'La orden debe tener entre 1 y 100 renglones.', 'VALIDATION_ERROR');
  }
  return rawLines.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ApiError(400, `El renglon ${index + 1} no es valido.`, 'VALIDATION_ERROR');
    }
    const line = value as Record<string, unknown>;
    return {
      ingredientId: requiredString(line, 'ingredientId', `El insumo ${index + 1}`),
      quantity: requiredNumber(line, 'quantity', { min: 0.001, label: `La cantidad ${index + 1}` }),
      unitCost: requiredNumber(line, 'unitCost', { min: 0, label: `El costo ${index + 1}` }),
    };
  });
}

function notesAndDate(body: Record<string, unknown>) {
  const notes = optionalString(body, 'notes') ?? '';
  if (notes.length > 1_000) throw new ApiError(400, 'Las notas no pueden superar 1000 caracteres.', 'VALIDATION_ERROR');
  const expectedAt = optionalString(body, 'expectedAt');
  if (expectedAt && !/^\d{4}-\d{2}-\d{2}$/.test(expectedAt)) {
    throw new ApiError(400, 'La fecha esperada no es valida.', 'VALIDATION_ERROR');
  }
  return { notes, expectedAt };
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.purchases.read', 'gastronomy');
    const items = await listGastronomyPurchaseOrders(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las ordenes de compra.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.purchases.write', 'gastronomy');
    const body = await readJsonObject(request);
    const { notes, expectedAt } = notesAndDate(body);
    const item = await saveGastronomyPurchaseOrder(tenant, {
      id: optionalString(body, 'id'),
      supplierId: requiredString(body, 'supplierId', 'El proveedor'),
      status: enumValue(body, 'status', ORDER_STATUSES, 'ordered'),
      expectedAt,
      notes,
      lines: purchaseLines(body),
    });
    return NextResponse.json({ success: true, message: 'Orden de compra guardada.', item }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar la orden de compra.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.purchases.receive', 'gastronomy');
    const body = await readJsonObject(request);
    const notes = optionalString(body, 'notes') ?? '';
    if (notes.length > 1_000) throw new ApiError(400, 'Las notas no pueden superar 1000 caracteres.', 'VALIDATION_ERROR');
    const receipt = await receiveGastronomyPurchaseOrder(tenant, {
      orderId: requiredString(body, 'orderId', 'La orden'),
      notes,
      lines: purchaseLines(body),
    });
    return NextResponse.json({ success: true, message: 'Recepcion aplicada al inventario.', receipt });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo registrar la recepcion.');
  }
}
