import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, isUuid, readJsonObject, requiredBoundedString, requiredIdempotencyKey } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { applySupermarketBulkPrices, type SupermarketPromo } from '@/lib/api/supermarketRepository';

const PROMOS = new Set<SupermarketPromo>(['none', '2x1', '30off']);

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.prices.bulk', 'supermarket');
    const body = await readJsonObject(request);
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 5000) {
      throw new ApiError(400, 'El lote debe contener entre 1 y 5000 productos.', 'VALIDATION_ERROR');
    }
    const productIds = new Set<string>();
    const items = body.items.map((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Hay un precio invalido.', 'VALIDATION_ERROR');
      const item = value as Record<string, unknown>;
      const productId = typeof item.productId === 'string' ? item.productId : '';
      const newPrice = typeof item.newPrice === 'number' ? item.newPrice : Number.NaN;
      const promo = typeof item.promo === 'string' ? item.promo as SupermarketPromo : 'none';
      if (!isUuid(productId) || productIds.has(productId) || !Number.isFinite(newPrice) || newPrice < 0 || !PROMOS.has(promo)) {
        throw new ApiError(400, 'Hay un producto, precio o promocion invalida.', 'VALIDATION_ERROR');
      }
      productIds.add(productId);
      return { productId, newPrice, promo };
    });
    const result = await applySupermarketBulkPrices(tenant, {
      idempotencyKey: requiredIdempotencyKey(request),
      description: requiredBoundedString(body, 'description', { label: 'La descripcion', maxLength: 160 }),
      items,
    });
    return NextResponse.json({ success: true, message: result.duplicate ? 'Lote de precios ya aplicado.' : 'Precios actualizados.', result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo aplicar el lote de precios.');
  }
}
