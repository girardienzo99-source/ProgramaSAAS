import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  enumValue,
  optionalString,
  readJsonObject,
  requiredArray,
  requiredIdempotencyKey,
  requiredNumber,
  requiredString,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  listGastronomySettlements,
  settleGastronomyTable,
} from '@/lib/api/gastronomyRepository';

const PAYMENT_METHODS = ['cash', 'card', 'qr'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.settlements.read', 'gastronomy');
    const items = await listGastronomySettlements(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los cierres gastronomicos.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.settlements.create', 'gastronomy');
    const idempotencyKey = requiredIdempotencyKey(request);
    const body = await readJsonObject(request);
    const splitCount = requiredNumber(body, 'splitCount', { min: 1, label: 'La cantidad de pagos' });
    if (!Number.isInteger(splitCount) || splitCount > 20) {
      throw new ApiError(400, 'La cuenta puede dividirse entre 1 y 20 pagos.', 'VALIDATION_ERROR');
    }
    const tipAmount = requiredNumber(body, 'tipAmount', { min: 0, label: 'La propina' });
    if (tipAmount > 100_000_000) throw new ApiError(400, 'La propina supera el limite permitido.', 'VALIDATION_ERROR');
    const rawPayments = requiredArray(body, 'payments', 'Los pagos');
    if (rawPayments.length !== splitCount) {
      throw new ApiError(400, 'Debe informar un pago por cada division de la cuenta.', 'VALIDATION_ERROR');
    }
    const payments = rawPayments.map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ApiError(400, `El pago ${index + 1} no es valido.`, 'VALIDATION_ERROR');
      }
      const payment = value as Record<string, unknown>;
      const reference = optionalString(payment, 'reference') ?? '';
      if (reference.length > 100) throw new ApiError(400, 'La referencia del pago es demasiado extensa.', 'VALIDATION_ERROR');
      return {
        method: enumValue(payment, 'method', PAYMENT_METHODS),
        amount: requiredNumber(payment, 'amount', { min: 0.01, label: `El importe ${index + 1}` }),
        reference,
      };
    });
    const settlement = await settleGastronomyTable(tenant, {
      tableId: requiredString(body, 'tableId', 'La mesa'),
      idempotencyKey,
      splitCount,
      tipAmount,
      payments,
    });
    return NextResponse.json({
      success: true,
      message: settlement.duplicate ? 'El cierre ya estaba registrado.' : 'Mesa cobrada y cerrada.',
      settlement,
    }, { status: settlement.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo cobrar y cerrar la mesa.');
  }
}
