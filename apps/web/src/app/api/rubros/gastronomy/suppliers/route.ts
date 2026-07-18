import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, optionalString, readJsonObject, requiredBoundedString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listGastronomySuppliers, saveGastronomySupplier } from '@/lib/api/gastronomyRepository';

function boundedOptional(body: Record<string, unknown>, field: string, maxLength: number): string {
  const value = optionalString(body, field) ?? '';
  if (value.length > maxLength) {
    throw new ApiError(400, `${field} no puede superar ${maxLength} caracteres.`, 'VALIDATION_ERROR');
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.suppliers.read', 'gastronomy');
    const items = await listGastronomySuppliers(tenant.companyId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los proveedores.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.suppliers.write', 'gastronomy');
    const body = await readJsonObject(request);
    const id = optionalString(body, 'id');
    const name = requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 255 });
    const taxId = boundedOptional(body, 'taxId', 20);
    if (taxId && !/^\d{2}-?\d{8}-?\d$/.test(taxId)) {
      throw new ApiError(400, 'El CUIT no tiene un formato valido.', 'VALIDATION_ERROR');
    }
    const item = await saveGastronomySupplier(tenant, {
      id,
      name,
      taxId,
      phone: boundedOptional(body, 'phone', 50),
      email: boundedOptional(body, 'email', 255),
      address: boundedOptional(body, 'address', 1_000),
      active: body.active !== false,
    });
    return NextResponse.json(
      { success: true, message: id ? 'Proveedor actualizado.' : 'Proveedor creado.', item },
      { status: id ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar el proveedor.');
  }
}
