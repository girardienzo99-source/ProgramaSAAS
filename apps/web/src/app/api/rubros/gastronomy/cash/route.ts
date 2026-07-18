import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { enumValue, readJsonObject, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  closeGastronomyCash,
  getGastronomyCashState,
  openGastronomyCash,
} from '@/lib/api/gastronomyRepository';

const ACTIONS = ['open', 'close'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.cash.read', 'gastronomy');
    const state = await getGastronomyCashState(tenant);
    return NextResponse.json({ success: true, state });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la caja gastronomica.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.cash.manage', 'gastronomy');
    const body = await readJsonObject(request);
    const action = enumValue(body, 'action', ACTIONS);
    if (action === 'open') {
      const state = await openGastronomyCash(
        tenant,
        requiredNumber(body, 'openingBalance', { min: 0, label: 'El fondo inicial' }),
      );
      return NextResponse.json({ success: true, message: 'Caja abierta.', state }, { status: 201 });
    }
    const result = await closeGastronomyCash(
      tenant,
      requiredNumber(body, 'declaredCash', { min: 0, label: 'El efectivo declarado' }),
    );
    return NextResponse.json({ success: true, message: 'Caja cerrada.', result });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar la caja gastronomica.');
  }
}
