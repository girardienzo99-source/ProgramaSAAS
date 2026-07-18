import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  optionalString,
  readJsonObject,
  requiredBoundedString,
  requiredNumber,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listGastronomyIngredients, saveGastronomyIngredient } from '@/lib/api/gastronomyRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.inventory.read', 'gastronomy');
    const items = await listGastronomyIngredients(tenant.companyId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar el inventario de insumos.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.inventory.write', 'gastronomy');
    const body = await readJsonObject(request);
    const id = optionalString(body, 'id');
    const name = requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 255 });
    const unit = requiredBoundedString(body, 'unit', { label: 'La unidad', maxLength: 30 });
    const supplier = optionalString(body, 'supplier') ?? '';
    if (supplier.length > 255) throw new ApiError(400, 'El proveedor no puede superar 255 caracteres.', 'VALIDATION_ERROR');
    const stock = requiredNumber(body, 'stock', { min: 0, label: 'El stock' });
    const minStock = requiredNumber(body, 'minStock', { min: 0, label: 'El stock minimo' });
    const costPerUnit = requiredNumber(body, 'costPerUnit', { min: 0, label: 'El costo unitario' });

    const item = await saveGastronomyIngredient(tenant, {
      id,
      name,
      unit,
      stock,
      minStock,
      costPerUnit,
      supplier,
      active: true,
    });
    return NextResponse.json(
      { success: true, message: id ? 'Insumo actualizado.' : 'Insumo creado.', item },
      { status: id ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar el insumo.');
  }
}
