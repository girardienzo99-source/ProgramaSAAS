import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { enumValue, optionalString, readJsonObject, requiredBoolean, requiredIdempotencyKey, requiredNumber, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  decideSupermarketPurchaseApproval,
  getSupermarketPurchaseApprovalPolicy,
  listSupermarketPurchaseApprovals,
  requestSupermarketPurchaseApproval,
  saveSupermarketPurchaseApprovalPolicy,
} from '@/lib/api/supermarketSupplyRepository';

const DECISIONS = ['approved', 'rejected'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchase_approvals.read', 'supermarket');
    const [policy, items] = await Promise.all([
      getSupermarketPurchaseApprovalPolicy(tenant), listSupermarketPurchaseApprovals(tenant),
    ]);
    return NextResponse.json({ success: true, policy, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las aprobaciones de compra.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchase_approvals.request', 'supermarket');
    const body = await readJsonObject(request);
    const item = await requestSupermarketPurchaseApproval(
      tenant, requiredString(body, 'orderId', 'La orden'), requiredIdempotencyKey(request),
    );
    return NextResponse.json({ success: true, message: item.status === 'auto_approved' ? 'Compra autorizada automaticamente.' : 'Compra enviada a aprobacion.', item }, { status: item.duplicate ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo solicitar la aprobacion de compra.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchase_approvals.decide', 'supermarket');
    const body = await readJsonObject(request);
    const item = await decideSupermarketPurchaseApproval(
      tenant, requiredString(body, 'requestId', 'La solicitud'),
      enumValue(body, 'decision', DECISIONS), optionalString(body, 'notes')?.slice(0, 1000) ?? '',
    );
    return NextResponse.json({ success: true, message: item.status === 'approved' ? 'Compra aprobada.' : item.status === 'rejected' ? 'Compra rechazada.' : 'Aprobacion registrada.', item });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo registrar la decision de compra.');
  }
}

export async function PUT(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'supermarket.purchase_approvals.policy', 'supermarket');
    const body = await readJsonObject(request);
    const policy = await saveSupermarketPurchaseApprovalPolicy(tenant, {
      enabled: requiredBoolean(body, 'enabled', 'El estado'),
      autoApproveLimit: requiredNumber(body, 'autoApproveLimit', { min: 0, label: 'El limite automatico' }),
      secondApprovalThreshold: requiredNumber(body, 'secondApprovalThreshold', { min: 0.01, label: 'El limite de doble aprobacion' }),
    });
    return NextResponse.json({ success: true, message: 'Politica de aprobaciones actualizada.', policy });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar la politica de aprobaciones.');
  }
}
