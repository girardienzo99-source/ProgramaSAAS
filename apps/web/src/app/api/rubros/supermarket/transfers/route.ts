import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { optionalString, readJsonObject, requiredBoundedString, requiredIdempotencyKey, requiredNumber } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { createSupermarketTransfer, listSupermarketTransfers } from '@/lib/api/supermarketRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.inventory.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupermarketTransfers(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las transferencias.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.inventory.transfer', 'supermarket');
    const body = await readJsonObject(request);
    const result = await createSupermarketTransfer(tenant, {
      idempotencyKey: requiredIdempotencyKey(request),
      destinationBranchId: requiredBoundedString(body, 'destinationBranchId', { label: 'La sucursal destino', maxLength: 50 }),
      productId: requiredBoundedString(body, 'productId', { label: 'El producto', maxLength: 50 }),
      quantity: requiredNumber(body, 'quantity', { min: 0.001, label: 'La cantidad' }),
      notes: optionalString(body, 'notes')?.slice(0, 200) ?? '',
    });
    return NextResponse.json({ success: true, message: result.duplicate ? 'Transferencia ya procesada.' : 'Transferencia completada.', result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo completar la transferencia.');
  }
}
