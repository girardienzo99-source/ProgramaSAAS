import { NextResponse } from 'next/server';
import { ApiError, readJsonObject, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { authorizeRequest } from '@/lib/api/authorization';

interface Notification {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const notificationsByCompany = new Map<string, Notification[]>();

function getNotifications(companyId: string): Notification[] {
  const current = notificationsByCompany.get(companyId);
  if (current) return current;
  const initial = [
    { id: 'n1', companyId, title: 'Vencimiento de suscripción', message: 'Tu plan vence en 5 días. Verificá el medio de pago.', type: 'billing', isRead: false, createdAt: new Date().toISOString() },
    { id: 'n2', companyId, title: 'Ticket respondido', message: 'El equipo técnico respondió tu consulta sobre WebUSB.', type: 'support', isRead: true, createdAt: new Date(Date.now() - 3_600_000).toISOString() },
  ];
  notificationsByCompany.set(companyId, initial);
  return initial;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.notifications.view');
    return NextResponse.json({ success: true, notifications: getNotifications(tenant.companyId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.notifications.manage');
    const body = await readJsonObject(request);
    const notificationId = requiredString(body, 'notificationId', 'El ID de la notificación');
    const notifications = getNotifications(tenant.companyId);
    const index = notifications.findIndex((notification) => notification.id === notificationId);
    if (index < 0) throw new ApiError(404, 'La notificación no existe.', 'NOT_FOUND');

    const updated = notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, isRead: true } : notification,
    );
    notificationsByCompany.set(tenant.companyId, updated);
    return NextResponse.json({ success: true, message: 'Notificación marcada como leída.', notification: updated[index] });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo actualizar la notificación.');
  }
}
