import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  enumValue,
  optionalString,
  readJsonObject,
  requiredBoolean,
  requiredBoundedString,
  requiredNumber,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketProducts, saveSupermarketProduct } from '@/lib/api/supermarketRepository';

const CATEGORIES = ['almacen', 'bebidas', 'lacteos', 'carniceria', 'verduleria', 'limpieza', 'panaderia'] as const;
const UNITS = ['unit', 'kg'] as const;
const PROMOS = ['none', '2x1', '30off'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.catalog.read', 'supermarket');
    const items = await listSupermarketProducts(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar el catalogo del supermercado.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.catalog.write', 'supermarket');
    const body = await readJsonObject(request);
    const imageUrl = optionalString(body, 'imageUrl') ?? null;
    if (imageUrl && imageUrl.length > 2_048) {
      throw new ApiError(400, 'La URL de imagen es demasiado extensa.', 'VALIDATION_ERROR');
    }
    const item = await saveSupermarketProduct(tenant, {
      id: optionalString(body, 'id'),
      name: requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 255 }),
      barcode: requiredBoundedString(body, 'barcode', { label: 'El codigo de barras', maxLength: 100 }),
      price: requiredNumber(body, 'price', { min: 0, label: 'El precio' }),
      cost: requiredNumber(body, 'cost', { min: 0, label: 'El costo' }),
      stock: requiredNumber(body, 'stock', { min: 0, label: 'El stock' }),
      minStock: requiredNumber(body, 'minStock', { min: 0, label: 'El stock minimo' }),
      category: enumValue(body, 'category', CATEGORIES),
      unit: enumValue(body, 'unit', UNITS),
      isWeighed: requiredBoolean(body, 'isWeighed', 'Venta por peso'),
      promo: enumValue(body, 'promo', PROMOS, 'none'),
      supplier: optionalString(body, 'supplier')?.slice(0, 255) ?? '',
      imageUrl,
      active: requiredBoolean(body, 'active', 'El estado'),
    });
    return NextResponse.json(
      { success: true, message: body.id ? 'Producto actualizado.' : 'Producto creado.', item },
      { status: body.id ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar el producto del supermercado.');
  }
}
