import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, readJsonObject, requiredBoundedString, requiredNumber, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  createSupplierPortalAccess,
  listSupplierPortalAccess,
  revokeSupplierPortalAccess,
} from '@/lib/api/supermarketSupplierPortalRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supplier_portal.read', 'supermarket');
    return NextResponse.json({ success: true, items: await listSupplierPortalAccess(tenant) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar los accesos de proveedores.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supplier_portal.manage', 'supermarket');
    const body = await readJsonObject(request);
    const expiresInDays = requiredNumber(body, 'expiresInDays', { min: 1, label: 'La vigencia' });
    if (!Number.isInteger(expiresInDays) || expiresInDays > 365) throw new ApiError(400, 'La vigencia debe ser un numero entero entre 1 y 365.', 'VALIDATION_ERROR');
    const access = await createSupplierPortalAccess(tenant, {
      supplierId: requiredString(body, 'supplierId', 'El proveedor'),
      label: requiredBoundedString(body, 'label', { label: 'La etiqueta', maxLength: 100 }),
      expiresInDays,
    });
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      success: true, message: 'Acceso de proveedor creado.',
      item: { id: access.id, expiresAt: access.expiresAt, portalUrl: `${origin}/supplier-portal#token=${encodeURIComponent(access.token)}` },
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo crear el acceso del proveedor.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supplier_portal.manage', 'supermarket');
    const body = await readJsonObject(request);
    await revokeSupplierPortalAccess(tenant, requiredString(body, 'accessId', 'El acceso'));
    return NextResponse.json({ success: true, message: 'Acceso revocado.' });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo revocar el acceso del proveedor.');
  }
}
