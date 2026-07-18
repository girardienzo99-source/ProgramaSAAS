import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, enumValue, optionalString, readJsonObject, requiredBoundedString, requiredIdempotencyKey, requiredNumber, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listSupermarketSupplierDocuments, postSupermarketSupplierDocument } from '@/lib/api/supermarketSupplyRepository';

const DOCUMENT_TYPES = ['invoice', 'credit_note', 'payment'] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateField(body: Record<string, unknown>, field: string, required: boolean): string {
  const value = required ? requiredString(body, field, field) : optionalString(body, field) ?? '';
  if (value && !DATE_PATTERN.test(value)) throw new ApiError(400, `${field} no tiene una fecha valida.`, 'VALIDATION_ERROR');
  return value;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supply.read', 'supermarket');
    const supplierId = new URL(request.url).searchParams.get('supplierId') ?? undefined;
    return NextResponse.json({ success: true, items: await listSupermarketSupplierDocuments(tenant, supplierId) });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la cuenta corriente de proveedores.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.supplier_accounts.write', 'supermarket');
    const body = await readJsonObject(request);
    const documentType = enumValue(body, 'documentType', DOCUMENT_TYPES);
    const purchaseOrderId = optionalString(body, 'purchaseOrderId');
    if (purchaseOrderId && documentType !== 'invoice') throw new ApiError(400, 'Solo las facturas pueden conciliarse con una orden.', 'VALIDATION_ERROR');
    const item = await postSupermarketSupplierDocument(tenant, {
      idempotencyKey: requiredIdempotencyKey(request),
      supplierId: requiredString(body, 'supplierId', 'El proveedor'), purchaseOrderId,
      documentType, documentNumber: requiredBoundedString(body, 'documentNumber', { label: 'El numero', maxLength: 80 }),
      issueDate: dateField(body, 'issueDate', true), dueDate: dateField(body, 'dueDate', false),
      amount: requiredNumber(body, 'amount', { min: 0.01, label: 'El importe' }),
      notes: optionalString(body, 'notes')?.slice(0, 1_000) ?? '',
    });
    return NextResponse.json({ success: true, message: item.duplicate ? 'El comprobante ya estaba registrado.' : 'Comprobante registrado.', item }, { status: item.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo registrar el comprobante del proveedor.');
  }
}
