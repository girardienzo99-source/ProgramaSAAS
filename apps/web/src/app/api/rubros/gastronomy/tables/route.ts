import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, optionalString, readJsonObject, requiredBoundedString, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { deleteGastronomyTable, listGastronomyTables, saveGastronomyTable } from '@/lib/api/gastronomyRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.orders.read', 'gastronomy');
    const items = await listGastronomyTables(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar el plano de mesas.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.orders.write', 'gastronomy');
    const body = await readJsonObject(request);
    const id = optionalString(body, 'id');
    const name = requiredBoundedString(body, 'name', { label: 'El nombre de la mesa', maxLength: 50 });
    const capacity = requiredNumber(body, 'capacity', { min: 1, label: 'La capacidad' });
    if (!Number.isInteger(capacity) || capacity > 100) {
      throw new ApiError(400, 'La capacidad debe ser un entero entre 1 y 100.', 'VALIDATION_ERROR');
    }
    const item = await saveGastronomyTable(tenant, { id, name, capacity });
    return NextResponse.json(
      { success: true, message: id ? 'Mesa actualizada.' : 'Mesa creada.', item },
      { status: id ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar la mesa.');
  }
}

export async function DELETE(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.orders.write', 'gastronomy');
    const id = new URL(request.url).searchParams.get('id')?.trim();
    if (!id) throw new ApiError(400, 'La mesa es obligatoria.', 'VALIDATION_ERROR');
    await deleteGastronomyTable(tenant, id);
    return NextResponse.json({ success: true, message: 'Mesa eliminada.' });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo eliminar la mesa.');
  }
}
