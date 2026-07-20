import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, enumValue, optionalString, readJsonObject, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  listSupermarketEdiMessages,
  retrySupermarketEdiMessage,
  summarizeSupermarketEdiMessages,
  type SupermarketEdiStatus,
} from '@/lib/api/supermarketSupplyRepository';

const EDI_STATUSES = ['pending', 'processing', 'sent', 'failed', 'dead_letter'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.edi.read', 'supermarket');
    const rawStatus = new URL(request.url).searchParams.get('status');
    if (rawStatus && !EDI_STATUSES.includes(rawStatus as SupermarketEdiStatus)) {
      throw new ApiError(400, 'El estado EDI no es valido.', 'INVALID_EDI_STATUS');
    }
    const items = await listSupermarketEdiMessages(tenant, rawStatus as SupermarketEdiStatus | undefined);
    return NextResponse.json({ success: true, summary: summarizeSupermarketEdiMessages(items), items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la cola EDI.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.edi.manage', 'supermarket');
    const body = await readJsonObject(request);
    const action = enumValue(body, 'action', ['retry'] as const);
    if (action !== 'retry') throw new ApiError(400, 'La accion EDI no es valida.', 'INVALID_EDI_ACTION');
    const item = await retrySupermarketEdiMessage(tenant, requiredString(body, 'messageId', 'El mensaje EDI'), optionalString(body, 'reason')?.slice(0, 1000) ?? '');
    return NextResponse.json({ success: true, message: 'Mensaje EDI reprogramado para envio.', item });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo operar la cola EDI.');
  }
}
