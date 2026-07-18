import { NextResponse } from 'next/server';
import { ApiError } from './core';

export function apiErrorResponse(error: unknown, fallbackMessage = 'Ocurrió un error interno.') {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error('[API] Error no controlado:', error);
  return NextResponse.json(
    { success: false, error: fallbackMessage, code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}
