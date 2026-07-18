import { NextResponse } from 'next/server';
import { ApiError, optionalString, readJsonObject, requiredArray } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { authorizeRequest } from '@/lib/api/authorization';

interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  dashboardLayout: { widgets: string[] };
}

const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: null,
  primaryColor: '#2563EB',
  secondaryColor: '#475569',
  dashboardLayout: { widgets: ['sales_chart', 'stock_alerts'] },
};
const brandingByCompany = new Map<string, BrandingConfig>();

function getBranding(companyId: string): BrandingConfig {
  const current = brandingByCompany.get(companyId);
  if (current) return current;
  const initial = { ...DEFAULT_BRANDING, dashboardLayout: { widgets: [...DEFAULT_BRANDING.dashboardLayout.widgets] } };
  brandingByCompany.set(companyId, initial);
  return initial;
}

const HEX_COLOR = /^#[A-Fa-f0-9]{6}$/;

function validateColor(value: string | undefined, label: string): string | undefined {
  if (value && !HEX_COLOR.test(value)) {
    throw new ApiError(400, `${label} debe usar el formato hexadecimal #RRGGBB.`, 'VALIDATION_ERROR');
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.settings.view');
    return NextResponse.json({ success: true, branding: getBranding(tenant.companyId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.settings.update');
    const branding = getBranding(tenant.companyId);
    const body = await readJsonObject(request);
    const logoUrl = optionalString(body, 'logoUrl');
    const primaryColor = validateColor(optionalString(body, 'primaryColor'), 'El color primario');
    const secondaryColor = validateColor(optionalString(body, 'secondaryColor'), 'El color secundario');
    if (logoUrl) {
      try {
        const url = new URL(logoUrl);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('invalid protocol');
      } catch {
        throw new ApiError(400, 'La URL del logo no es válida.', 'VALIDATION_ERROR');
      }
    }

    let widgets = branding.dashboardLayout.widgets;
    if (body.dashboardLayout !== undefined) {
      if (!body.dashboardLayout || typeof body.dashboardLayout !== 'object' || Array.isArray(body.dashboardLayout)) {
        throw new ApiError(400, 'dashboardLayout debe ser un objeto.', 'VALIDATION_ERROR');
      }
      const layout = body.dashboardLayout as Record<string, unknown>;
      widgets = requiredArray(layout, 'widgets', 'Los widgets').map((widget) => {
        if (typeof widget !== 'string' || !widget.trim()) {
          throw new ApiError(400, 'Cada widget debe tener un nombre válido.', 'VALIDATION_ERROR');
        }
        return widget.trim();
      });
    }

    const updatedBranding = {
      logoUrl: logoUrl ?? branding.logoUrl,
      primaryColor: primaryColor ?? branding.primaryColor,
      secondaryColor: secondaryColor ?? branding.secondaryColor,
      dashboardLayout: { widgets },
    };
    brandingByCompany.set(tenant.companyId, updatedBranding);
    return NextResponse.json({ success: true, message: 'Personalización actualizada.', branding: updatedBranding });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar la personalización.');
  }
}
