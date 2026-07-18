import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  enumValue,
  readJsonObject,
  requiredBoundedString,
  requiredIdempotencyKey,
  requiredString,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { getBillingDashboard, prepareBillingInvoice } from '@/lib/api/billingRepository';

const INVOICE_TYPES = ['FA', 'FB', 'FC'] as const;
const DOCUMENT_TYPES = ['99', 'DNI', 'CUIT', 'CUIL'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'billing.read');
    return NextResponse.json({ success: true, ...(await getBillingDashboard(tenant)) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la cola fiscal.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'billing.create');
    const body = await readJsonObject(request, 32_768);
    const invoiceType = enumValue(body, 'invoiceType', INVOICE_TYPES);
    const recipientDocumentType = enumValue(body, 'recipientDocumentType', DOCUMENT_TYPES, '99');
    const recipientDocumentNumber = requiredBoundedString(body, 'recipientDocumentNumber', {
      label: 'El documento del receptor',
      maxLength: 20,
    });
    if (recipientDocumentType === '99' && recipientDocumentNumber !== '0') {
      throw new ApiError(422, 'El consumidor final sin documento debe usar el numero 0.', 'INVALID_RECIPIENT_DOCUMENT');
    }
    if (recipientDocumentType !== '99' && !/^\d{7,11}$/.test(recipientDocumentNumber)) {
      throw new ApiError(422, 'El documento del receptor debe contener entre 7 y 11 digitos.', 'INVALID_RECIPIENT_DOCUMENT');
    }
    const result = await prepareBillingInvoice(tenant, {
      saleId: requiredString(body, 'saleId', 'La venta'),
      settlementId: typeof body.settlementId === 'string' && body.settlementId.trim() ? body.settlementId.trim() : undefined,
      invoiceType,
      recipientName: typeof body.recipientName === 'string' ? body.recipientName.trim().slice(0, 255) : '',
      recipientDocumentType,
      recipientDocumentNumber,
      recipientVatCondition: requiredBoundedString(body, 'recipientVatCondition', {
        label: 'La condicion IVA del receptor',
        maxLength: 50,
      }),
      idempotencyKey: requiredIdempotencyKey(request),
    });
    return NextResponse.json({ success: true, ...result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo preparar el comprobante fiscal.');
  }
}
