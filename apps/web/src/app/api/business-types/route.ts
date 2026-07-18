import { NextResponse } from 'next/server';
import { BUSINESS_TYPES } from '@/config/businessTypes';
import { ApiError, optionalString, readJsonObject, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';

interface CustomBusinessType {
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
}

const customBusinessTypes: CustomBusinessType[] = [];
const CODE_PATTERN = /^[a-z][a-z0-9_]{2,39}$/;

export async function GET() {
  const configured = BUSINESS_TYPES.map(({ code, fullName, description }) => ({
    code,
    name: fullName,
    description,
  }));
  return NextResponse.json({ success: true, businessTypes: [...configured, ...customBusinessTypes] });
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const code = requiredString(body, 'code', 'El código').toLowerCase();
    const name = requiredString(body, 'name', 'El nombre');
    const description = optionalString(body, 'description') ?? null;
    if (!CODE_PATTERN.test(code)) {
      throw new ApiError(400, 'El código debe tener entre 3 y 40 caracteres: letras minúsculas, números o guion bajo.', 'VALIDATION_ERROR');
    }
    if (BUSINESS_TYPES.some((type) => type.code === code) || customBusinessTypes.some((type) => type.code === code)) {
      throw new ApiError(409, 'Ya existe un rubro con ese código.', 'BUSINESS_TYPE_EXISTS');
    }

    const businessType = { code, name, description, createdAt: new Date().toISOString() };
    customBusinessTypes.push(businessType);
    return NextResponse.json(
      { success: true, message: 'Rubro registrado. Requiere configurar sus módulos y navegación.', businessType },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo crear el rubro.');
  }
}
