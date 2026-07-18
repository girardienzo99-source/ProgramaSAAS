import { NextResponse } from 'next/server';
import { ApiError, enumValue, optionalString, readJsonObject, requiredIdempotencyKey, requiredString } from '@/lib/api/core';
import { consumePublicRateLimit, publicRateLimitHeaders } from '@/lib/api/publicAuth';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  confirmSupplierPortalDelivery,
  getSupplierPortalSnapshot,
  readSupplierPortalToken,
  supplierPortalTokenHash,
} from '@/lib/api/supermarketSupplierPortalRepository';

const DELIVERY_STATUSES = ['confirmed', 'rescheduled', 'unavailable'] as const;

async function authenticate(request: Request) {
  const token = readSupplierPortalToken(request);
  const tokenHash = supplierPortalTokenHash(token);
  const rateLimit = await consumePublicRateLimit(tokenHash);
  return { token, headers: publicRateLimitHeaders(rateLimit) };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    return NextResponse.json({ success: true, portal: await getSupplierPortalSnapshot(auth.token) }, { headers: auth.headers });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo abrir el portal del proveedor.');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    const body = await readJsonObject(request);
    const status = enumValue(body, 'status', DELIVERY_STATUSES);
    const promisedDate = optionalString(body, 'promisedDate') ?? '';
    if (promisedDate && !/^\d{4}-\d{2}-\d{2}$/.test(promisedDate)) {
      throw new ApiError(400, 'La fecha comprometida no es valida.', 'VALIDATION_ERROR');
    }
    if (status !== 'unavailable' && !promisedDate) {
      throw new ApiError(400, 'Debe indicar la fecha comprometida.', 'VALIDATION_ERROR');
    }
    const item = await confirmSupplierPortalDelivery(auth.token, {
      orderId: requiredString(body, 'orderId', 'La orden'), idempotencyKey: requiredIdempotencyKey(request),
      status, promisedDate, notes: optionalString(body, 'notes')?.slice(0, 1000) ?? '',
    });
    return NextResponse.json({ success: true, message: item.duplicate ? 'La confirmacion ya estaba registrada.' : 'Entrega actualizada.', item }, { status: item.duplicate ? 200 : 201, headers: auth.headers });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar la entrega.');
  }
}
