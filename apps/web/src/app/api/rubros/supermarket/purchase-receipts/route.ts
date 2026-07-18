import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketPurchaseReceipts } from '@/lib/api/supermarketRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchase_receipts.read', 'supermarket');
    const orderId = new URL(request.url).searchParams.get('orderId') ?? undefined;
    return NextResponse.json({ success: true, items: await listSupermarketPurchaseReceipts(tenant, orderId) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar el historial de recepciones.');
  }
}
