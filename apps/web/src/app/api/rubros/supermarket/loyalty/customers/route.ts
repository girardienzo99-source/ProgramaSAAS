import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { optionalString, readJsonObject, requiredBoolean, requiredBoundedString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listLoyaltyCustomers, saveLoyaltyCustomer } from '@/lib/api/supermarketLoyaltyRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.loyalty.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listLoyaltyCustomers(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los socios.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.loyalty.customers.write', 'supermarket');
    const body = await readJsonObject(request);
    const item = await saveLoyaltyCustomer(tenant, {
      id: optionalString(body, 'id'),
      name: requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 255 }),
      phone: requiredBoundedString(body, 'phone', { label: 'El telefono', maxLength: 40 }),
      email: optionalString(body, 'email')?.slice(0, 100) ?? '',
      documentNumber: optionalString(body, 'documentNumber')?.slice(0, 30) ?? '',
      birthDate: optionalString(body, 'birthDate')?.slice(0, 10) ?? '',
      marketingConsent: requiredBoolean(body, 'marketingConsent', 'El consentimiento'),
      active: requiredBoolean(body, 'active', 'El estado'),
    });
    return NextResponse.json({ success: true, message: body.id ? 'Socio actualizado.' : 'Socio creado.', item }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar el socio.');
  }
}
