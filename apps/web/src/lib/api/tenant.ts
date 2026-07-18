import { ApiError, isUuid } from './core';
import { createAuthenticatedServerClient, isServerSupabaseConfigured } from '@/lib/server/supabase';
import {
  isBusinessTypeCode,
  type BusinessTypeCode,
} from '@/config/businessTypes';

export interface TenantContext {
  companyId: string;
  userId: string;
  businessTypeCode: BusinessTypeCode;
  branchId: string | null;
  permissions: ReadonlySet<string>;
  source: 'supabase' | 'development';
}

interface CompanyContextRow {
  status?: string;
  business_types?: { code?: string } | Array<{ code?: string }> | null;
}

interface MembershipContextRow {
  active?: boolean;
  main_branch_id?: string | null;
  roles?: {
    role_permissions?: Array<{ permissions?: { name?: string } | Array<{ name?: string }> | null }>;
  } | Array<{
    role_permissions?: Array<{ permissions?: { name?: string } | Array<{ name?: string }> | null }>;
  }> | null;
}

export const DEVELOPMENT_COMPANY_ID = '00000000-0000-4000-8000-000000000001';
export const DEVELOPMENT_USER_ID = '00000000-0000-4000-8000-000000000002';

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function developmentContext(request: Request): TenantContext {
  const companyId = request.headers.get('x-company-id')?.trim() || DEVELOPMENT_COMPANY_ID;
  const userId = request.headers.get('x-user-id')?.trim() || DEVELOPMENT_USER_ID;
  const requestedBusinessType = request.headers.get('x-business-type')?.trim() || 'gastronomy';
  if (!isUuid(companyId) || !isUuid(userId)) {
    throw new ApiError(400, 'Los identificadores de desarrollo deben ser UUID validos.', 'INVALID_TENANT_CONTEXT');
  }
  if (!isBusinessTypeCode(requestedBusinessType)) {
    throw new ApiError(400, 'El rubro de desarrollo no es valido.', 'INVALID_BUSINESS_TYPE');
  }

  const rawPermissions = request.headers.get('x-permissions')?.trim();
  const permissions = new Set(
    rawPermissions === 'none'
      ? []
      : (rawPermissions || '*').split(',').map((permission) => permission.trim()).filter(Boolean),
  );
  const branchId = request.headers.get('x-branch-id')?.trim() || null;
  if (branchId && !isUuid(branchId)) {
    throw new ApiError(400, 'La sucursal de desarrollo debe ser un UUID valido.', 'INVALID_BRANCH_CONTEXT');
  }

  return {
    companyId,
    userId,
    businessTypeCode: requestedBusinessType,
    branchId,
    permissions,
    source: 'development',
  };
}

function extractPermissions(membership: MembershipContextRow): Set<string> {
  const role = firstRelation(membership.roles);
  const names = role?.role_permissions?.flatMap((entry) => {
    const permission = firstRelation(entry.permissions);
    return permission?.name ? [permission.name] : [];
  }) ?? [];
  return new Set(names);
}

export async function resolveTenantContext(request: Request): Promise<TenantContext> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (token && isServerSupabaseConfigured) {
    const supabase = createAuthenticatedServerClient(token);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      throw new ApiError(401, 'La sesion no es valida o expiro.', 'UNAUTHORIZED');
    }

    const companyId = authData.user.app_metadata.company_id;
    if (typeof companyId !== 'string' || !isUuid(companyId)) {
      throw new ApiError(403, 'La sesion no tiene una empresa valida asociada.', 'TENANT_REQUIRED');
    }

    const [companyResult, membershipResult] = await Promise.all([
      supabase
        .from('companies')
        .select('status, business_types(code)')
        .eq('id', companyId)
        .single(),
      supabase
        .from('company_users')
        .select('active, main_branch_id, roles(role_permissions(permissions(name)))')
        .eq('company_id', companyId)
        .eq('user_id', authData.user.id)
        .single(),
    ]);

    if (companyResult.error || membershipResult.error) {
      throw new ApiError(403, 'La membresia de la empresa no es valida.', 'MEMBERSHIP_REQUIRED');
    }

    const company = companyResult.data as CompanyContextRow;
    const membership = membershipResult.data as MembershipContextRow;
    if (company.status !== 'active' || membership.active !== true) {
      throw new ApiError(403, 'La empresa o la membresia se encuentra inactiva.', 'TENANT_INACTIVE');
    }

    const businessTypeCode = firstRelation(company.business_types)?.code;
    if (!businessTypeCode || !isBusinessTypeCode(businessTypeCode)) {
      throw new ApiError(403, 'La empresa no tiene un rubro valido asociado.', 'BUSINESS_TYPE_REQUIRED');
    }

    return {
      companyId,
      userId: authData.user.id,
      businessTypeCode,
      branchId: membership.main_branch_id ?? null,
      permissions: extractPermissions(membership),
      source: 'supabase',
    };
  }

  if (process.env.NODE_ENV !== 'production') return developmentContext(request);
  if (!isServerSupabaseConfigured) {
    throw new ApiError(503, 'La autenticacion del servidor no esta configurada.', 'AUTH_NOT_CONFIGURED');
  }
  throw new ApiError(401, 'Se requiere una sesion autenticada.', 'UNAUTHORIZED');
}
