import { NextResponse } from 'next/server';
import { getActivatedModuleCodes, getBusinessType, isBusinessTypeCode } from '@/config/businessTypes';
import { ApiError, readJsonObject, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const companyName = requiredString(body, 'companyName', 'El nombre de la empresa');
    const businessTypeCode = requiredString(body, 'businessTypeCode', 'El rubro');
    const planId = requiredString(body, 'planId', 'El plan');
    if (!isBusinessTypeCode(businessTypeCode)) {
      throw new ApiError(400, 'El código de rubro no existe.', 'INVALID_BUSINESS_TYPE');
    }

    const businessType = getBusinessType(businessTypeCode);
    const companyId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      message: 'Onboarding dinámico completado con éxito.',
      company: {
        id: companyId,
        name: companyName,
        businessTypeCode: businessType.code,
        planId,
        status: 'active',
      },
      branch: {
        id: crypto.randomUUID(),
        name: 'Casa Central',
        isMain: true,
        arcaPuntoVenta: 1,
      },
      roles: [
        { id: crypto.randomUUID(), name: 'Administrador / Propietario', isSystem: true },
        { id: crypto.randomUUID(), name: 'Cajero', isSystem: false },
      ],
      activatedModules: getActivatedModuleCodes(businessType.code),
      subscription: {
        companyId,
        planId,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo completar el onboarding.');
  }
}
