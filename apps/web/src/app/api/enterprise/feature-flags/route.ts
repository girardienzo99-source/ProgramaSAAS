import { NextResponse } from 'next/server';
import { ApiError, readJsonObject, requiredBoolean, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { authorizeRequest } from '@/lib/api/authorization';

const DEFAULT_FEATURE_FLAGS = [
  { flagName: 'enable-ai-copilot', isEnabled: true },
  { flagName: 'enable-public-api', isEnabled: true },
  { flagName: 'enable-point-terminal', isEnabled: false },
];
const flagsByCompany = new Map<string, typeof DEFAULT_FEATURE_FLAGS>();

function getFlags(companyId: string) {
  const current = flagsByCompany.get(companyId);
  if (current) return current;
  const initial = DEFAULT_FEATURE_FLAGS.map((flag) => ({ ...flag }));
  flagsByCompany.set(companyId, initial);
  return initial;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.settings.view');
    return NextResponse.json({ success: true, featureFlags: getFlags(tenant.companyId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.settings.update');
    const body = await readJsonObject(request);
    const flagName = requiredString(body, 'flagName', 'El nombre del feature flag');
    const isEnabled = requiredBoolean(body, 'isEnabled', 'isEnabled');
    const featureFlags = getFlags(tenant.companyId);
    if (!featureFlags.some((flag) => flag.flagName === flagName)) {
      throw new ApiError(404, 'El feature flag no existe.', 'NOT_FOUND');
    }
    flagsByCompany.set(
      tenant.companyId,
      featureFlags.map((flag) => flag.flagName === flagName ? { ...flag, isEnabled } : flag),
    );
    return NextResponse.json({ success: true, message: 'Feature flag actualizado.', flag: { flagName, isEnabled } });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar el feature flag.');
  }
}
