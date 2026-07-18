import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { enumValue, readJsonObject, requiredBoundedString, requiredIdempotencyKey, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { registerSupermarketReturn } from '@/lib/api/supermarketRepository';

const DISPOSITIONS = ['restock', 'waste'] as const;

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.returns.create', 'supermarket');
    const body = await readJsonObject(request);
    const item = await registerSupermarketReturn(tenant, {
      idempotencyKey: requiredIdempotencyKey(request),
      barcode: requiredBoundedString(body, 'barcode', { label: 'El codigo de barras', maxLength: 100 }),
      quantity: requiredNumber(body, 'quantity', { min: 0.001, label: 'La cantidad' }),
      reason: requiredBoundedString(body, 'reason', { label: 'El motivo', maxLength: 120 }),
      disposition: enumValue(body, 'disposition', DISPOSITIONS),
    });
    return NextResponse.json({ success: true, message: item.duplicate ? 'Devolucion ya registrada.' : 'Devolucion registrada.', item }, { status: item.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo registrar la devolucion.');
  }
}
