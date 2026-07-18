import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketLots } from '@/lib/api/supermarketRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.inventory.read', 'supermarket');
    const items = await listSupermarketLots(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los lotes del supermercado.');
  }
}
