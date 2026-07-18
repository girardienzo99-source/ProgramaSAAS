import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, enumValue, optionalString, readJsonObject, requiredIdempotencyKey, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  listSupermarketSupplierClaims,
  updateSupermarketSupplierClaim,
  type SupplierClaimStatus,
} from '@/lib/api/supermarketSupplierPortalRepository';

const CLAIM_STATUSES = ['open', 'acknowledged', 'disputed', 'resolved'] as const;
const UPDATE_STATUSES = ['acknowledged', 'disputed', 'resolved'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supplier_claims.read', 'supermarket');
    const search = new URL(request.url).searchParams;
    const rawStatus = search.get('status');
    if (rawStatus && !CLAIM_STATUSES.includes(rawStatus as SupplierClaimStatus)) {
      throw new ApiError(400, 'El estado del reclamo no es valido.', 'INVALID_CLAIM_STATUS');
    }
    const items = await listSupermarketSupplierClaims(tenant, {
      supplierId: search.get('supplierId') ?? undefined,
      status: rawStatus as SupplierClaimStatus | undefined,
    });
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los reclamos a proveedores.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supplier_claims.manage', 'supermarket');
    const body = await readJsonObject(request);
    const item = await updateSupermarketSupplierClaim(tenant, {
      claimId: requiredString(body, 'claimId', 'El reclamo'),
      idempotencyKey: requiredIdempotencyKey(request),
      status: enumValue(body, 'status', UPDATE_STATUSES),
      notes: optionalString(body, 'notes')?.slice(0, 2000) ?? '',
    });
    return NextResponse.json({
      success: true,
      message: item.duplicate ? 'El cambio ya estaba registrado.' : 'Reclamo actualizado.',
      item,
    });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar el reclamo.');
  }
}
