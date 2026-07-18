import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { optionalString, readJsonObject, requiredBoolean, requiredBoundedString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketLocations, saveSupermarketLocation } from '@/lib/api/supermarketRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.layout.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupermarketLocations(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las ubicaciones.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.layout.write', 'supermarket');
    const body = await readJsonObject(request);
    const item = await saveSupermarketLocation(tenant, {
      id: optionalString(body, 'id'),
      code: requiredBoundedString(body, 'code', { label: 'El codigo', maxLength: 40 }),
      zone: requiredBoundedString(body, 'zone', { label: 'La zona', maxLength: 80 }),
      aisle: optionalString(body, 'aisle')?.slice(0, 40) ?? '',
      shelf: optionalString(body, 'shelf')?.slice(0, 40) ?? '',
      bin: optionalString(body, 'bin')?.slice(0, 40) ?? '',
      description: optionalString(body, 'description')?.slice(0, 200) ?? '',
      active: requiredBoolean(body, 'active', 'El estado'),
    });
    return NextResponse.json({ success: true, message: body.id ? 'Ubicacion actualizada.' : 'Ubicacion creada.', item }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar la ubicacion.');
  }
}
