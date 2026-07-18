import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, isUuid, readJsonObject, requiredIdempotencyKey, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { getBillingDashboard } from '@/lib/api/billingRepository';

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'billing.create');
    const body = await readJsonObject(request, 8_192);
    requiredIdempotencyKey(request);
    const invoiceId = requiredString(body, 'invoiceId', 'El comprobante');
    if (!isUuid(invoiceId)) throw new ApiError(400, 'El comprobante no es valido.', 'INVALID_INVOICE_ID');

    const dashboard = await getBillingDashboard(tenant);
    const invoice = dashboard.invoices.find((item) => item.id === invoiceId);
    if (!invoice) throw new ApiError(404, 'El comprobante no existe.', 'INVOICE_NOT_FOUND');
    if (invoice.status === 'authorized' || invoice.status === 'observed') {
      return NextResponse.json({ success: true, duplicate: true, invoice });
    }
    if (!dashboard.config.configured) {
      throw new ApiError(
        503,
        `Falta configurar: ${dashboard.config.missing.join(', ')}.`,
        'ARCA_NOT_CONFIGURED',
      );
    }

    throw new ApiError(
      501,
      'La autorizacion SOAP ARCA permanece bloqueada hasta instalar y homologar el transporte fiscal real.',
      'ARCA_TRANSPORT_NOT_IMPLEMENTED',
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo autorizar el comprobante ante ARCA.');
  }
}
