import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/core';
import { consumePublicRateLimit, publicRateLimitHeaders } from '@/lib/api/publicAuth';
import { apiErrorResponse } from '@/lib/api/responses';
import { MAX_SUPPLIER_DOCUMENT_BYTES, validateSupplierPdf } from '@/lib/api/supplierDocumentUpload';
import {
  attachSupplierShipmentPdf,
  readSupplierPortalToken,
  supplierPortalTokenHash,
} from '@/lib/api/supermarketSupplierPortalRepository';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const token = readSupplierPortalToken(request);
    const rateLimit = await consumePublicRateLimit(supplierPortalTokenHash(token));
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_SUPPLIER_DOCUMENT_BYTES + 256 * 1024) {
      throw new ApiError(413, 'La solicitud supera el limite permitido.', 'PAYLOAD_TOO_LARGE');
    }
    const formData = await request.formData();
    const shipmentId = formData.get('shipmentId');
    const document = formData.get('document');
    if (typeof shipmentId !== 'string' || !(document instanceof File)) {
      throw new ApiError(400, 'Debe indicar el despacho y adjuntar un PDF.', 'SUPPLIER_DOCUMENT_REQUIRED');
    }
    const bytes = new Uint8Array(await document.arrayBuffer());
    const validated = validateSupplierPdf(document, bytes);
    const item = await attachSupplierShipmentPdf(token, shipmentId, {
      bytes, safeName: validated.safeName, digest: validated.digest, size: document.size,
    });
    return NextResponse.json({ success: true, message: 'Remito adjuntado.', item }, {
      status: 201, headers: publicRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo adjuntar el remito.');
  }
}
