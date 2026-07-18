import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { getBillingConfigSummary } from '@/lib/api/billingRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'billing.read');
    return NextResponse.json({ success: true, config: await getBillingConfigSummary(tenant.companyId) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la configuracion ARCA.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'billing.manage');
    const config = await getBillingConfigSummary(tenant.companyId);
    if (!config.configured) {
      throw new ApiError(503, `Falta configurar: ${config.missing.join(', ')}.`, 'ARCA_NOT_CONFIGURED');
    }
    throw new ApiError(
      501,
      'La prueba WSAA real se habilitara junto con el transporte SOAP homologado. No se simularon token ni firma.',
      'ARCA_TRANSPORT_NOT_IMPLEMENTED',
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo verificar la conexion con ARCA.');
  }
}
