import { NextResponse } from 'next/server';
import { enumValue, optionalString, readJsonObject, requiredIdempotencyKey, requiredString } from '@/lib/api/core';
import { consumePublicRateLimit, publicRateLimitHeaders } from '@/lib/api/publicAuth';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  readSupplierPortalToken,
  respondSupplierPortalClaim,
  supplierPortalTokenHash,
} from '@/lib/api/supermarketSupplierPortalRepository';

const RESPONSE_STATUSES = ['acknowledged', 'disputed'] as const;

async function authenticate(request: Request) {
  const token = readSupplierPortalToken(request);
  const rateLimit = await consumePublicRateLimit(supplierPortalTokenHash(token));
  return { token, headers: publicRateLimitHeaders(rateLimit) };
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticate(request);
    const body = await readJsonObject(request);
    const item = await respondSupplierPortalClaim(auth.token, {
      claimId: requiredString(body, 'claimId', 'El reclamo'),
      idempotencyKey: requiredIdempotencyKey(request),
      status: enumValue(body, 'status', RESPONSE_STATUSES),
      notes: optionalString(body, 'notes')?.slice(0, 2000) ?? '',
    });
    return NextResponse.json({
      success: true,
      message: item.duplicate ? 'La respuesta ya estaba registrada.' : 'Respuesta enviada.',
      item,
    }, { headers: auth.headers });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo responder el reclamo.');
  }
}
