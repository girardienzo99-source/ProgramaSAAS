import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, optionalNumber, optionalString, readJsonObject, requiredBoundedString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketSuppliers, saveSupermarketSupplier } from '@/lib/api/supermarketSupplyRepository';

function boundedOptional(body: Record<string, unknown>, field: string, maxLength: number): string {
  const value = optionalString(body, field) ?? '';
  if (value.length > maxLength) throw new ApiError(400, `${field} no puede superar ${maxLength} caracteres.`, 'VALIDATION_ERROR');
  return value;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supply.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupermarketSuppliers(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los proveedores del supermercado.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.suppliers.write', 'supermarket');
    const body = await readJsonObject(request);
    const taxId = boundedOptional(body, 'taxId', 20);
    if (taxId && !/^\d{2}-?\d{8}-?\d$/.test(taxId)) throw new ApiError(400, 'El CUIT no tiene un formato valido.', 'VALIDATION_ERROR');
    const leadDays = optionalNumber(body, 'leadDays', 7, { min: 0, label: 'Los dias de entrega' });
    if (!Number.isInteger(leadDays) || leadDays > 365) throw new ApiError(400, 'Los dias de entrega deben ser un entero entre 0 y 365.', 'VALIDATION_ERROR');
    const id = optionalString(body, 'id');
    const item = await saveSupermarketSupplier(tenant, {
      id, name: requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 255 }), taxId,
      phone: boundedOptional(body, 'phone', 50), email: boundedOptional(body, 'email', 255),
      address: boundedOptional(body, 'address', 1_000), leadDays,
      creditLimit: optionalNumber(body, 'creditLimit', 0, { min: 0, label: 'El limite de credito' }),
      active: body.active !== false,
    });
    return NextResponse.json({ success: true, message: id ? 'Proveedor actualizado.' : 'Proveedor creado.', item }, { status: id ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar el proveedor del supermercado.');
  }
}
