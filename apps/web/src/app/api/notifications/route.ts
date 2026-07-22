import { NextResponse } from "next/server";
import { enumValue, readJsonObject, requiredString } from "@/lib/api/core";
import { apiErrorResponse } from "@/lib/api/responses";
import { authorizeRequest } from "@/lib/api/authorization";
import {
  NOTIFICATION_CHANNELS,
  createTenantNotification,
  listTenantNotifications,
  markTenantNotificationRead,
} from "@/lib/api/notificationRepository";

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(
      request,
      "platform.notifications.view",
    );
    return NextResponse.json({
      success: true,
      notifications: await listTenantNotifications(tenant),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const tenant = await authorizeRequest(
      request,
      "platform.notifications.manage",
    );
    const body = await readJsonObject(request);
    const notificationId = requiredString(
      body,
      "notificationId",
      "El ID de la notificación",
    );
    const notification = await markTenantNotificationRead(
      tenant,
      notificationId,
    );
    return NextResponse.json({
      success: true,
      message: "Notificación marcada como leída.",
      notification,
    });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo actualizar la notificación.");
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(
      request,
      "platform.notifications.manage",
    );
    const body = await readJsonObject(request);
    const title = requiredString(body, "title", "El título");
    const message = requiredString(body, "message", "El mensaje");
    const channel = enumValue(
      body,
      "channel",
      NOTIFICATION_CHANNELS,
      "operations",
    );
    const notification = await createTenantNotification(tenant, {
      title,
      message,
      type: channel,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Notificación interna registrada.",
        notification,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      "No se pudo despachar la notificación omnicanal.",
    );
  }
}
