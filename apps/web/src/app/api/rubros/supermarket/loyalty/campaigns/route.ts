import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, enumValue, optionalString, readJsonObject, requiredBoolean, requiredBoundedString, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listLoyaltyCampaigns, saveLoyaltyCampaign } from '@/lib/api/supermarketLoyaltyRepository';

const BENEFITS = ['points_multiplier', 'fixed_points', 'percent_discount'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.loyalty.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listLoyaltyCampaigns(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las campanas.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.loyalty.campaigns.manage', 'supermarket');
    const body = await readJsonObject(request);
    const benefitType = enumValue(body, 'benefitType', BENEFITS);
    const benefitValue = requiredNumber(body, 'benefitValue', { min: 0.01, label: 'El beneficio' });
    const startsOn = requiredBoundedString(body, 'startsOn', { label: 'La fecha de inicio', maxLength: 10 });
    const endsOn = requiredBoundedString(body, 'endsOn', { label: 'La fecha de fin', maxLength: 10 });
    if ((benefitType === 'points_multiplier' && benefitValue < 1)
      || (benefitType === 'percent_discount' && benefitValue > 100) || endsOn < startsOn) {
      throw new ApiError(400, 'El valor del beneficio o el rango de fechas no es valido.', 'VALIDATION_ERROR');
    }
    const item = await saveLoyaltyCampaign(tenant, {
      id: optionalString(body, 'id'),
      name: requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 120 }),
      benefitType,
      benefitValue,
      minimumPurchase: requiredNumber(body, 'minimumPurchase', { min: 0, label: 'La compra minima' }),
      startsOn,
      endsOn,
      active: requiredBoolean(body, 'active', 'El estado'),
    });
    return NextResponse.json({ success: true, message: body.id ? 'Campana actualizada.' : 'Campana creada.', item }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar la campana.');
  }
}
