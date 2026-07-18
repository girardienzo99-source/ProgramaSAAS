import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { enumValue, readJsonObject, requiredBoundedString, requiredIdempotencyKey, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { adjustSupermarketInventory, listSupermarketInventoryEvents } from '@/lib/api/supermarketRepository';

const OPERATIONS = ['count', 'waste'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.inventory.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupermarketInventoryEvents(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar el historial de inventario.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const operation = enumValue(body, 'operation', OPERATIONS);
    const permission = operation === 'count' ? 'supermarket.inventory.count' : 'supermarket.inventory.waste';
    const tenant = await authorizeRequest(request, permission, 'supermarket');
    const result = await adjustSupermarketInventory(tenant, {
      idempotencyKey: requiredIdempotencyKey(request),
      productId: requiredBoundedString(body, 'productId', { label: 'El producto', maxLength: 50 }),
      operation,
      quantity: requiredNumber(body, 'quantity', { min: 0, label: 'La cantidad' }),
      reason: requiredBoundedString(body, 'reason', { label: 'El motivo', maxLength: 160 }),
    });
    return NextResponse.json({ success: true, message: result.duplicate ? 'Control ya registrado.' : 'Control de inventario registrado.', result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo registrar el control de inventario.');
  }
}
