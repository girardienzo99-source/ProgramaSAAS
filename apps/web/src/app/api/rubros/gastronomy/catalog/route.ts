import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  optionalString,
  readJsonObject,
  requiredBoolean,
  requiredBoundedString,
  requiredNumber,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listGastronomyMenu, saveGastronomyMenuItem } from '@/lib/api/gastronomyRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.catalog.read', 'gastronomy');
    const items = await listGastronomyMenu(tenant.companyId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la carta.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.catalog.write', 'gastronomy');
    const body = await readJsonObject(request);
    const id = optionalString(body, 'id');
    const name = requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 255 });
    const description = optionalString(body, 'description') ?? '';
    if (description.length > 1_000) {
      throw new ApiError(400, 'La descripcion no puede superar 1000 caracteres.', 'VALIDATION_ERROR');
    }
    const category = requiredBoundedString(body, 'category', { label: 'La categoria', maxLength: 100 });
    const sku = requiredBoundedString(body, 'sku', { label: 'El SKU', maxLength: 100 });
    const price = requiredNumber(body, 'price', { min: 0, label: 'El precio' });
    const cost = requiredNumber(body, 'cost', { min: 0, label: 'El costo' });
    const stock = requiredNumber(body, 'stock', { min: 0, label: 'El stock' });
    const minStock = requiredNumber(body, 'minStock', { min: 0, label: 'El stock minimo' });
    const vatRate = requiredNumber(body, 'vatRate', { min: 0, label: 'El IVA' });
    if (vatRate > 100) throw new ApiError(400, 'El IVA no puede superar 100%.', 'VALIDATION_ERROR');
    const active = requiredBoolean(body, 'active', 'El estado');
    const imageUrl = optionalString(body, 'imageUrl') ?? null;
    if (imageUrl && imageUrl.length > 2_048) {
      throw new ApiError(400, 'La URL de imagen es demasiado extensa.', 'VALIDATION_ERROR');
    }

    const item = await saveGastronomyMenuItem(tenant, {
      id,
      name,
      description,
      category,
      sku,
      price,
      cost,
      stock,
      minStock,
      vatRate,
      active,
      imageUrl,
    });
    return NextResponse.json(
      { success: true, message: id ? 'Producto actualizado.' : 'Producto creado.', item },
      { status: id ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar el producto de la carta.');
  }
}
