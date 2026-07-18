import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketBranches } from '@/lib/api/supermarketRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.inventory.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupermarketBranches(tenant), currentBranchId: tenant.branchId });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las sucursales del supermercado.');
  }
}
