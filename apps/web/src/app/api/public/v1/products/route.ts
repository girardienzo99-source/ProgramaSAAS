import { NextResponse } from 'next/server';
import { readJsonObject, requiredBoundedString, requiredNumber } from '@/lib/api/core';
import { validatePublicApiRequest, publicApiHeaders } from '@/lib/api/publicAuth';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  createPersistentCompanyProduct,
  listPersistentCompanyProducts,
  parseProductPage,
} from '@/lib/api/publicRepository';

export async function GET(request: Request) {
  try {
    const auth = await validatePublicApiRequest(request);
    const page = await listPersistentCompanyProducts(auth.companyId, parseProductPage(request.url));
    return NextResponse.json(
      { success: true, companyId: auth.companyId, ...page },
      { headers: publicApiHeaders(auth) },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validatePublicApiRequest(request);
    const body = await readJsonObject(request);
    const name = requiredBoundedString(body, 'name', { label: 'El nombre', maxLength: 255 });
    const sku = requiredBoundedString(body, 'sku', { label: 'El SKU', maxLength: 100 });
    const price = requiredNumber(body, 'price', { min: 0, label: 'El precio' });
    const stock = body.stock === undefined
      ? 0
      : requiredNumber(body, 'stock', { min: 0, label: 'El stock' });

    const product = await createPersistentCompanyProduct(auth.companyId, { name, price, sku, stock });
    return NextResponse.json(
      {
        success: true,
        message: 'Producto creado mediante API pública.',
        product,
      },
      { status: 201, headers: publicApiHeaders(auth) },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
