import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, optionalString, readJsonObject, requiredBoolean, requiredBoundedString, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listLoyaltyRewards, saveLoyaltyReward } from '@/lib/api/supermarketLoyaltyRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.loyalty.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listLoyaltyRewards(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los premios.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.loyalty.rewards.manage', 'supermarket');
    const body = await readJsonObject(request);
    const stockLimit = body.stockLimit === null || body.stockLimit === '' || body.stockLimit === undefined
      ? null
      : requiredNumber(body, 'stockLimit', { min: 0, label: 'El stock limite' });
    const pointsCost = requiredNumber(body, 'pointsCost', { min: 1, label: 'El costo en puntos' });
    if ((stockLimit !== null && !Number.isInteger(stockLimit)) || !Number.isInteger(pointsCost)) {
      throw new ApiError(400, 'El stock limite y el costo en puntos deben ser enteros.', 'VALIDATION_ERROR');
    }
    const item = await saveLoyaltyReward(tenant, {
      id: optionalString(body, 'id'),
      name: requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 120 }),
      description: optionalString(body, 'description')?.slice(0, 240) ?? '',
      pointsCost,
      stockLimit,
      imageUrl: optionalString(body, 'imageUrl')?.slice(0, 2048) ?? null,
      active: requiredBoolean(body, 'active', 'El estado'),
    });
    return NextResponse.json({ success: true, message: body.id ? 'Premio actualizado.' : 'Premio creado.', item }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar el premio.');
  }
}
