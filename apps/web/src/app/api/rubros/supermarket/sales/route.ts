import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, enumValue, isUuid, readJsonObject, requiredIdempotencyKey } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { commitSupermarketSale } from '@/lib/api/supermarketRepository';

const PAYMENT_METHODS = ['cash', 'qr'] as const;

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.sales.create', 'supermarket');
    const body = await readJsonObject(request);
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
      throw new ApiError(400, 'La venta debe incluir entre 1 y 100 productos.', 'VALIDATION_ERROR');
    }
    const productIds = new Set<string>();
    const items = body.items.map((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Hay un renglon de venta invalido.', 'VALIDATION_ERROR');
      const item = value as Record<string, unknown>;
      const productId = typeof item.productId === 'string' ? item.productId : '';
      const quantity = typeof item.quantity === 'number' ? item.quantity : Number.NaN;
      if (!isUuid(productId) || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) {
        throw new ApiError(400, 'Hay un producto o cantidad invalida.', 'VALIDATION_ERROR');
      }
      if (productIds.has(productId)) throw new ApiError(400, 'Cada producto debe aparecer una sola vez.', 'DUPLICATE_SALE_ITEM');
      productIds.add(productId);
      return { productId, quantity };
    });
    const sale = await commitSupermarketSale(tenant, {
      idempotencyKey: requiredIdempotencyKey(request),
      paymentMethod: enumValue(body, 'paymentMethod', PAYMENT_METHODS),
      items,
    });
    return NextResponse.json({ success: true, message: sale.duplicate ? 'Venta ya confirmada.' : 'Venta confirmada.', sale }, { status: sale.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo confirmar la venta del supermercado.');
  }
}
