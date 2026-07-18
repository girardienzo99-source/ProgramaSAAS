import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { getSupermarketSupplyForecast } from '@/lib/api/supermarketSupplyRepository';

function integerParameter(value: string | null, fallback: number, min: number, max: number, label: string): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new ApiError(400, `${label} debe estar entre ${min} y ${max}.`, 'VALIDATION_ERROR');
  return parsed;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supply.forecast', 'supermarket');
    const params = new URL(request.url).searchParams;
    const lookbackDays = integerParameter(params.get('lookbackDays'), 30, 7, 365, 'El periodo');
    const safetyDays = integerParameter(params.get('safetyDays'), 5, 0, 60, 'El stock de seguridad');
    return NextResponse.json({ success: true, items: await getSupermarketSupplyForecast(tenant, lookbackDays, safetyDays) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo calcular el abastecimiento del supermercado.');
  }
}
