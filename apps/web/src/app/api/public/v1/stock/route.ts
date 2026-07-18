import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/core';
import { validatePublicApiRequest, publicApiHeaders } from '@/lib/api/publicAuth';
import { apiErrorResponse } from '@/lib/api/responses';
import { findPersistentCompanyProductBySku } from '@/lib/api/publicRepository';

export async function GET(request: Request) {
  try {
    const auth = await validatePublicApiRequest(request);
    const sku = new URL(request.url).searchParams.get('sku')?.trim();
    if (!sku) throw new ApiError(400, 'Se requiere el parámetro SKU (?sku=...).', 'VALIDATION_ERROR');
    const product = await findPersistentCompanyProductBySku(auth.companyId, sku);
    if (!product) throw new ApiError(404, 'El SKU no existe en el catálogo de esta empresa.', 'PRODUCT_NOT_FOUND');

    return NextResponse.json(
      {
        success: true,
        inventory: {
          sku,
          totalStock: product.stock,
          branches: [
            { branchName: 'Casa Central', stock: product.stock },
          ],
        },
      },
      { headers: publicApiHeaders(auth) },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
