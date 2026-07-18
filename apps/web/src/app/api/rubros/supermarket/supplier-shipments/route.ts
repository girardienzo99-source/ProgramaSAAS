import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  getInternalSupplierShipmentDocumentUrl,
  listSupplierShipments,
} from '@/lib/api/supermarketSupplierPortalRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supplier_shipments.read', 'supermarket');
    const search = new URL(request.url).searchParams;
    const shipmentId = search.get('shipmentId');
    if (shipmentId) {
      return NextResponse.json({ success: true, item: await getInternalSupplierShipmentDocumentUrl(tenant, shipmentId) });
    }
    const supplierId = search.get('supplierId') ?? undefined;
    return NextResponse.json({ success: true, items: await listSupplierShipments(tenant, supplierId) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los avisos de despacho.');
  }
}
