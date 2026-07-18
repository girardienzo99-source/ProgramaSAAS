import { NextResponse } from 'next/server';
import {
  ApiError,
  optionalString,
  readJsonObject,
  requiredArray,
  requiredIdempotencyKey,
  requiredNumber,
} from '@/lib/api/core';
import { validatePublicApiRequest, publicApiHeaders } from '@/lib/api/publicAuth';
import { apiErrorResponse } from '@/lib/api/responses';
import { enqueuePersistentApiEvent } from '@/lib/api/publicRepository';

interface SaleItem {
  productId?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
}

function parseSaleItems(values: unknown[]): SaleItem[] {
  if (values.length > 500) {
    throw new ApiError(400, 'La venta no puede contener mas de 500 items.', 'VALIDATION_ERROR');
  }

  return values.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ApiError(400, `El item ${index + 1} no es valido.`, 'VALIDATION_ERROR');
    }
    const item = value as Record<string, unknown>;
    const productId = typeof item.productId === 'string' ? item.productId.trim() : undefined;
    const sku = typeof item.sku === 'string' ? item.sku.trim() : undefined;
    if (!productId && !sku) {
      throw new ApiError(400, `El item ${index + 1} requiere productId o sku.`, 'VALIDATION_ERROR');
    }

    const quantity = requiredNumber(item, 'quantity', { min: 0.001, label: `Cantidad del item ${index + 1}` });
    const unitPrice = requiredNumber(item, 'unitPrice', { min: 0, label: `Precio del item ${index + 1}` });
    return { productId, sku, quantity, unitPrice };
  });
}

export async function POST(request: Request) {
  try {
    const auth = await validatePublicApiRequest(request);
    const idempotencyKey = requiredIdempotencyKey(request);
    const body = await readJsonObject(request);
    const items = parseSaleItems(requiredArray(body, 'items', 'La venta'));
    const total = requiredNumber(body, 'total', { min: 0.01, label: 'El total' });
    const calculatedTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (Math.abs(calculatedTotal - total) > 0.01) {
      throw new ApiError(400, 'El total no coincide con la suma de los items.', 'TOTAL_MISMATCH');
    }

    const paymentMethod = optionalString(body, 'paymentMethod') ?? 'api_integration';
    const clientEmail = optionalString(body, 'clientEmail') ?? 'sin_especificar';
    const event = await enqueuePersistentApiEvent(auth.companyId, 'sale.requested', idempotencyKey, {
      total,
      paymentMethod,
      clientEmail,
      items,
    });

    const headers = publicApiHeaders(auth);
    headers.set('Idempotency-Replayed', String(event.duplicate));
    return NextResponse.json(
      {
        success: true,
        message: event.duplicate ? 'La operacion ya estaba registrada.' : 'Venta aceptada para procesamiento.',
        operationId: event.id,
        status: event.status,
        duplicate: event.duplicate,
      },
      { status: event.duplicate ? 200 : 202, headers },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
