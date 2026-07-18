import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, readJsonObject, requiredBoundedString, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketPlacements, saveSupermarketPlacement } from '@/lib/api/supermarketRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.layout.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupermarketPlacements(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la distribucion de productos.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.layout.write', 'supermarket');
    const body = await readJsonObject(request);
    const facingCount = requiredNumber(body, 'facingCount', { min: 0, label: 'Los frentes' });
    const capacity = requiredNumber(body, 'capacity', { min: 0, label: 'La capacidad' });
    const reorderPoint = requiredNumber(body, 'reorderPoint', { min: 0, label: 'El punto de reposicion' });
    if (!Number.isInteger(facingCount) || facingCount > 1000 || reorderPoint > capacity) {
      throw new ApiError(400, 'Los frentes deben ser enteros y el punto de reposicion no puede superar la capacidad.', 'VALIDATION_ERROR');
    }
    const item = await saveSupermarketPlacement(tenant, {
      productId: requiredBoundedString(body, 'productId', { label: 'El producto', maxLength: 50 }),
      locationId: requiredBoundedString(body, 'locationId', { label: 'La ubicacion', maxLength: 50 }),
      facingCount, capacity, reorderPoint,
    });
    return NextResponse.json({ success: true, message: 'Producto asignado a la gondola.', item });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo asignar el producto.');
  }
}
