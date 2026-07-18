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
  commitGastronomyOrder,
  listGastronomyKdsOrders,
  updateGastronomyKdsStatus,
} from '@/lib/api/gastronomyRepository';

const CHANNELS = ['dine_in', 'takeaway', 'delivery'] as const;
const KDS_STATUSES = ['preparing', 'ready', 'served'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.orders.read', 'gastronomy');
    const items = await listGastronomyKdsOrders(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la cola de cocina.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.orders.write', 'gastronomy');
    const body = await readJsonObject(request);
    const channel = enumValue(body, 'channel', CHANNELS, 'dine_in');
    const tableId = optionalString(body, 'tableId');
    const tableName = optionalString(body, 'tableName');
    const waiterName = optionalString(body, 'waiterName');
    const notes = optionalString(body, 'notes');
    if ((tableName?.length ?? 0) > 100 || (waiterName?.length ?? 0) > 255 || (notes?.length ?? 0) > 1_000) {
      throw new ApiError(400, 'Los datos de la comanda son demasiado extensos.', 'VALIDATION_ERROR');
    }
    const rawItems = requiredArray(body, 'items', 'La comanda');
    if (rawItems.length > 100) throw new ApiError(400, 'La comanda no puede superar 100 renglones.', 'VALIDATION_ERROR');
    const items = rawItems.map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ApiError(400, `El renglon ${index + 1} no es valido.`, 'VALIDATION_ERROR');
      }
      const item = value as Record<string, unknown>;
      return {
        productId: requiredString(item, 'productId', `El producto ${index + 1}`),
        quantity: requiredNumber(item, 'quantity', { min: 0.001, label: `La cantidad ${index + 1}` }),
      };
    });

    const order = await commitGastronomyOrder(tenant, {
      tableId,
      tableName,
      waiterName,
      channel,
      notes,
      items,
    });
    return NextResponse.json({ success: true, message: 'Comanda enviada.', order }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo enviar la comanda.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.orders.write', 'gastronomy');
    const body = await readJsonObject(request);
    const orderId = requiredString(body, 'orderId', 'La comanda');
    const status = enumValue(body, 'status', KDS_STATUSES);
    await updateGastronomyKdsStatus(tenant, orderId, status);
    return NextResponse.json({ success: true, message: status === 'served' ? 'Comanda entregada.' : 'Estado de cocina actualizado.' });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar la comanda.');
  }
}
