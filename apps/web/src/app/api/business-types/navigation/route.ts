import { NextResponse } from 'next/server';
import { getBusinessNavigation, getBusinessType, isBusinessTypeCode } from '@/config/businessTypes';
import { ApiError } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get('type')?.trim();
    if (!code || !isBusinessTypeCode(code)) {
      throw new ApiError(400, 'Se requiere un código de rubro válido.', 'INVALID_BUSINESS_TYPE');
    }
    const businessType = getBusinessType(code);
    return NextResponse.json({
      success: true,
      menu: { businessType: businessType.code, navigation: getBusinessNavigation(businessType.code) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
