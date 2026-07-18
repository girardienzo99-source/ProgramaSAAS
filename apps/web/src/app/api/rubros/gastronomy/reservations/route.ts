import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import {
  ApiError,
  enumValue,
  optionalString,
  readJsonObject,
  requiredBoundedString,
  requiredNumber,
  requiredString,
} from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import {
  listGastronomyReservations,
  saveGastronomyReservation,
  updateGastronomyReservationStatus,
} from '@/lib/api/gastronomyRepository';

const SOURCES = ['manual', 'whatsapp', 'instagram', 'web', 'phone'] as const;
const STATUSES = ['confirmed', 'seated', 'completed', 'cancelled', 'no_show'] as const;

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.reservations.read', 'gastronomy');
    const items = await listGastronomyReservations(tenant);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo consultar la agenda de reservas.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.reservations.write', 'gastronomy');
    const body = await readJsonObject(request);
    const id = optionalString(body, 'id');
    const tableId = optionalString(body, 'tableId');
    const customerName = requiredBoundedString(body, 'customerName', { label: 'El nombre del cliente', maxLength: 255 });
    const phone = optionalString(body, 'phone') ?? '';
    const notes = optionalString(body, 'notes') ?? '';
    if (phone.length > 50 || notes.length > 1_000) {
      throw new ApiError(400, 'El telefono o las notas son demasiado extensos.', 'VALIDATION_ERROR');
    }
    const guests = requiredNumber(body, 'guests', { min: 1, label: 'Los comensales' });
    const durationMinutes = requiredNumber(body, 'durationMinutes', { min: 30, label: 'La duracion' });
    if (!Number.isInteger(guests) || guests > 100 || !Number.isInteger(durationMinutes) || durationMinutes > 480) {
      throw new ApiError(400, 'Comensales o duracion fuera de rango.', 'VALIDATION_ERROR');
    }
    const reservedFor = requiredString(body, 'reservedFor', 'La fecha y hora');
    const date = new Date(reservedFor);
    if (!Number.isFinite(date.getTime())) throw new ApiError(400, 'La fecha de reserva no es valida.', 'VALIDATION_ERROR');
    const source = enumValue(body, 'source', SOURCES, 'manual');

    const item = await saveGastronomyReservation(tenant, {
      id,
      tableId,
      customerName,
      phone,
      guests,
      reservedFor: date.toISOString(),
      durationMinutes,
      source,
      notes,
    });
    return NextResponse.json(
      { success: true, message: id ? 'Reserva actualizada.' : 'Reserva creada.', item },
      { status: id ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar la reserva.');
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.reservations.write', 'gastronomy');
    const body = await readJsonObject(request);
    const reservationId = requiredString(body, 'reservationId', 'La reserva');
    const status = enumValue(body, 'status', STATUSES);
    await updateGastronomyReservationStatus(tenant, reservationId, status);
    return NextResponse.json({ success: true, message: 'Estado de reserva actualizado.' });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar la reserva.');
  }
}
