import { NextResponse } from 'next/server';
import {
  optionalString,
  readJsonObject,
  requiredBoundedString,
  requiredIdempotencyKey,
  requiredNumber,
  requiredString,
  ApiError,
} from '@/lib/api/core';
import { consumePublicRateLimit, publicRateLimitHeaders } from '@/lib/api/publicAuth';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  getSupplierShipmentDocumentUrl,
  readSupplierPortalToken,
  supplierPortalTokenHash,
  upsertSupplierPortalShipment,
} from '@/lib/api/supermarketSupplierPortalRepository';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function integerField(body: Record<string, unknown>, field: string, max: number, label: string): number {
  const value = requiredNumber(body, field, { min: 0, label });
  if (!Number.isInteger(value) || value > max) {
    throw new ApiError(400, `${label} debe ser un entero entre 0 y ${max}.`, 'VALIDATION_ERROR');
  }
  return value;
}

async function authenticate(request: Request) {
  const token = readSupplierPortalToken(request);
  const rateLimit = await consumePublicRateLimit(supplierPortalTokenHash(token));
  return { token, headers: publicRateLimitHeaders(rateLimit) };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    const shipmentId = new URL(request.url).searchParams.get('shipmentId') ?? '';
    return NextResponse.json({ success: true, item: await getSupplierShipmentDocumentUrl(auth.token, shipmentId) }, { headers: auth.headers });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo abrir el remito.');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    const body = await readJsonObject(request);
    const shippedOn = requiredString(body, 'shippedOn', 'La fecha de despacho');
    const estimatedArrival = requiredString(body, 'estimatedArrival', 'La fecha estimada');
    if (!DATE_PATTERN.test(shippedOn) || !DATE_PATTERN.test(estimatedArrival)) {
      throw new ApiError(400, 'Las fechas del despacho no son validas.', 'VALIDATION_ERROR');
    }
    const item = await upsertSupplierPortalShipment(auth.token, {
      orderId: requiredString(body, 'orderId', 'La orden'), idempotencyKey: requiredIdempotencyKey(request),
      dispatchNumber: requiredBoundedString(body, 'dispatchNumber', { label: 'El numero de remito', maxLength: 80 }),
      carrier: requiredBoundedString(body, 'carrier', { label: 'El transportista', maxLength: 120 }),
      trackingNumber: optionalString(body, 'trackingNumber')?.slice(0, 120) ?? '',
      shippedOn, estimatedArrival,
      packageCount: integerField(body, 'packageCount', 100000, 'Los bultos'),
      palletCount: integerField(body, 'palletCount', 10000, 'Los pallets'),
      notes: optionalString(body, 'notes')?.slice(0, 1000) ?? '',
    });
    return NextResponse.json({
      success: true,
      message: item.duplicate ? 'El aviso de despacho ya estaba registrado.' : 'Aviso de despacho registrado.',
      item,
    }, { status: item.duplicate ? 200 : 201, headers: auth.headers });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo registrar el aviso de despacho.');
  }
}
