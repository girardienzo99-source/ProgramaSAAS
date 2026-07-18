import { ApiError } from './core';
import { resolveTenantContext, type TenantContext } from './tenant';
import { hasPermission } from './permissionRules';
import type { BusinessTypeCode } from '@/config/businessTypes';

export type PermissionName = string;

export function requirePermission(context: TenantContext, required: PermissionName): TenantContext {
  if (!hasPermission(context.permissions, required)) {
    throw new ApiError(403, 'No tiene permisos para realizar esta operacion.', 'FORBIDDEN');
  }
  return context;
}

export function requireBusinessType(
  context: TenantContext,
  expected: BusinessTypeCode,
): TenantContext {
  if (context.businessTypeCode !== expected) {
    throw new ApiError(403, 'La operacion no corresponde al rubro de esta empresa.', 'BUSINESS_TYPE_MISMATCH');
  }
  return context;
}

export async function authorizeRequest(
  request: Request,
  required: PermissionName,
  expectedBusinessType?: BusinessTypeCode,
): Promise<TenantContext> {
  const context = requirePermission(await resolveTenantContext(request), required);
  return expectedBusinessType ? requireBusinessType(context, expectedBusinessType) : context;
}
