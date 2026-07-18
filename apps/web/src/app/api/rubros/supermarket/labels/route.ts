import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, enumValue, readJsonObject, requiredBoundedString, requiredIdempotencyKey } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  createSupermarketLabelJob,
  listSupermarketLabelJobs,
  markSupermarketLabelJobPrinted,
  type SupermarketLabelSize,
} from '@/lib/api/supermarketRepository';

const LABEL_SIZES = ['shelf_60x30', 'promo_80x40'] as const satisfies readonly SupermarketLabelSize[];

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.layout.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupermarketLabelJobs(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las etiquetas.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.labels.create', 'supermarket');
    const body = await readJsonObject(request);
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 500) {
      throw new ApiError(400, 'Debe seleccionar entre 1 y 500 productos.', 'VALIDATION_ERROR');
    }
    const productIds = new Set<string>();
    const items = body.items.map((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Hay una etiqueta invalida.', 'VALIDATION_ERROR');
      const item = value as Record<string, unknown>;
      const productId = typeof item.productId === 'string' ? item.productId : '';
      const copies = typeof item.copies === 'number' ? item.copies : Number.NaN;
      if (!productId || productId.length > 50 || productIds.has(productId) || !Number.isInteger(copies) || copies < 1 || copies > 100) {
        throw new ApiError(400, 'Hay un producto o cantidad de copias invalida.', 'VALIDATION_ERROR');
      }
      productIds.add(productId);
      return { productId, copies };
    });
    const result = await createSupermarketLabelJob(tenant, {
      idempotencyKey: requiredIdempotencyKey(request),
      labelSize: enumValue(body, 'labelSize', LABEL_SIZES),
      items,
    });
    return NextResponse.json({ success: true, message: result.duplicate ? 'El trabajo ya existia.' : 'Etiquetas preparadas.', item: result.job }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo crear el trabajo de etiquetas.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.labels.print', 'supermarket');
    const body = await readJsonObject(request);
    const result = await markSupermarketLabelJobPrinted(tenant, requiredBoundedString(body, 'jobId', { label: 'El trabajo', maxLength: 50 }));
    return NextResponse.json({ success: true, message: result.duplicate ? 'La impresion ya estaba confirmada.' : 'Impresion confirmada.', result });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo confirmar la impresion.');
  }
}
