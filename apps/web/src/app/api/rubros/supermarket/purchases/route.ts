import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  enumValue,
  optionalString,
  readJsonObject,
  requiredBoundedString,
  requiredIdempotencyKey,
  requiredNumber,
  requiredString,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  listSupermarketPurchases,
  receiveSupermarketPurchase,
  saveSupermarketPurchase,
} from '@/lib/api/supermarketRepository';

const STATUSES = ['draft'] as const;

function optionalDate(body: Record<string, unknown>, field: string): string {
  const value = optionalString(body, field) ?? '';
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `${field} no tiene una fecha valida.`, 'VALIDATION_ERROR');
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchases.read', 'supermarket');
    const items = await listSupermarketPurchases(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las compras del supermercado.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchases.write', 'supermarket');
    const body = await readJsonObject(request);
    const item = await saveSupermarketPurchase(tenant, {
      id: optionalString(body, 'id'),
      supplier: requiredBoundedString(body, 'supplier', { label: 'El proveedor', maxLength: 255 }),
      productId: requiredString(body, 'productId', 'El producto'),
      quantity: requiredNumber(body, 'quantity', { min: 0.001, label: 'La cantidad' }),
      unitCost: requiredNumber(body, 'unitCost', { min: 0, label: 'El costo unitario' }),
      expectedDate: optionalDate(body, 'expectedDate'),
      status: enumValue(body, 'status', STATUSES, 'draft'),
      lotCode: optionalString(body, 'lotCode')?.slice(0, 100) ?? '',
      expirationDate: optionalDate(body, 'expirationDate'),
    });
    return NextResponse.json({ success: true, message: 'Orden de compra guardada.', item }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar la compra del supermercado.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchases.receive', 'supermarket');
    const body = await readJsonObject(request);
    const item = await receiveSupermarketPurchase(tenant, {
      orderId: requiredString(body, 'orderId', 'La orden'), idempotencyKey: requiredIdempotencyKey(request),
      acceptedQuantity: requiredNumber(body, 'acceptedQuantity', { min: 0, label: 'La cantidad aceptada' }),
      rejectedQuantity: requiredNumber(body, 'rejectedQuantity', { min: 0, label: 'La cantidad rechazada' }),
      lotCode: optionalString(body, 'lotCode')?.slice(0, 100) ?? '',
      expirationDate: optionalDate(body, 'expirationDate'),
      receivedOn: optionalDate(body, 'receivedOn') || new Date().toISOString().slice(0, 10),
      deliveryNoteNumber: optionalString(body, 'deliveryNoteNumber')?.slice(0, 80) ?? '',
      notes: optionalString(body, 'notes')?.slice(0, 1000) ?? '',
    });
    return NextResponse.json({
      success: true,
      message: item.duplicate ? 'La recepcion ya estaba registrada.'
        : item.orderStatus === 'received' ? 'Orden recibida completamente.' : 'Recepcion parcial registrada.',
      item,
    }, { status: item.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo recibir la compra del supermercado.');
  }
}
