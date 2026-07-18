import { NextResponse } from 'next/server';
import { requireBusinessType, requirePermission } from '@/lib/api/authorization';
import { ApiError, enumValue, optionalString, readJsonObject, requiredBoundedString, requiredIdempotencyKey, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { adjustLoyaltyPoints, creditLoyaltyPurchase, listLoyaltyMovements, redeemLoyaltyReward } from '@/lib/api/supermarketLoyaltyRepository';
import { resolveTenantContext } from '@/lib/api/tenant';

const ACTIONS = ['earn', 'redeem', 'adjust'] as const;

export async function GET(request: Request) {
  try {
    const tenant = requirePermission(requireBusinessType(await resolveTenantContext(request), 'supermarket'), 'supermarket.loyalty.read');
    const customerId = new URL(request.url).searchParams.get('customerId') ?? undefined;
    return NextResponse.json({ success: true, items: await listLoyaltyMovements(tenant, customerId) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los movimientos.');
  }
}

export async function POST(request: Request) {
  try {
    const context = requireBusinessType(await resolveTenantContext(request), 'supermarket');
    const body = await readJsonObject(request);
    const action = enumValue(body, 'action', ACTIONS);
    const permission = action === 'earn' ? 'supermarket.loyalty.points.earn'
      : action === 'redeem' ? 'supermarket.loyalty.points.redeem'
        : 'supermarket.loyalty.points.adjust';
    const tenant = requirePermission(context, permission);
    const idempotencyKey = requiredIdempotencyKey(request);
    const customerId = requiredBoundedString(body, 'customerId', { label: 'El socio', maxLength: 50 });

    if (action === 'earn') {
      const result = await creditLoyaltyPurchase(tenant, {
        idempotencyKey, customerId,
        purchaseAmount: requiredNumber(body, 'purchaseAmount', { min: 0.01, label: 'El importe' }),
        saleId: optionalString(body, 'saleId'), campaignId: optionalString(body, 'campaignId'),
      });
      return NextResponse.json({ success: true, message: result.duplicate ? 'Los puntos ya estaban acreditados.' : 'Puntos acreditados.', result }, { status: result.duplicate ? 200 : 201 });
    }
    if (action === 'redeem') {
      const result = await redeemLoyaltyReward(tenant, {
        idempotencyKey, customerId,
        rewardId: requiredBoundedString(body, 'rewardId', { label: 'El premio', maxLength: 50 }),
      });
      return NextResponse.json({ success: true, message: result.duplicate ? 'El canje ya estaba procesado.' : 'Premio canjeado.', result }, { status: result.duplicate ? 200 : 201 });
    }
    const pointsDelta = requiredNumber(body, 'pointsDelta', { label: 'Los puntos' });
    if (!Number.isInteger(pointsDelta) || pointsDelta === 0 || Math.abs(pointsDelta) > 1_000_000) {
      throw new ApiError(400, 'El ajuste debe ser un entero distinto de cero.', 'VALIDATION_ERROR');
    }
    const result = await adjustLoyaltyPoints(tenant, {
      idempotencyKey, customerId, pointsDelta,
      reference: requiredBoundedString(body, 'reference', { label: 'El motivo', maxLength: 180 }),
    });
    return NextResponse.json({ success: true, message: result.duplicate ? 'El ajuste ya estaba procesado.' : 'Saldo ajustado.', result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo procesar el movimiento de puntos.');
  }
}
