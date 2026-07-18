import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { readJsonObject, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { closeSupermarketCash, getSupermarketCashState, openSupermarketCash } from '@/lib/api/supermarketRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.cash.read', 'supermarket');
    return NextResponse.json({ success: true, state: await getSupermarketCashState(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la caja del supermercado.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.cash.manage', 'supermarket');
    const body = await readJsonObject(request);
    const state = await openSupermarketCash(tenant, requiredNumber(body, 'openingBalance', { min: 0, label: 'El saldo inicial' }));
    return NextResponse.json({ success: true, message: 'Caja abierta.', state }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo abrir la caja del supermercado.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.cash.manage', 'supermarket');
    const body = await readJsonObject(request);
    const result = await closeSupermarketCash(tenant, requiredNumber(body, 'declaredCash', { min: 0, label: 'El efectivo contado' }));
    return NextResponse.json({ success: true, message: 'Caja cerrada.', result });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo cerrar la caja del supermercado.');
  }
}
