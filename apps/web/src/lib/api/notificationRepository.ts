import "server-only";

import { ApiError } from "./core";
import type { TenantContext } from "./tenant";
import {
  createAdminServerClient,
  isServerSupabaseAdminConfigured,
} from "@/lib/server/supabase";

export const NOTIFICATION_CHANNELS = [
  "billing",
  "support",
  "system",
  "operations",
  "security",
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface TenantNotificationRecord {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: NotificationChannel;
  isRead: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  company_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean | null;
  created_at: string;
}

const notificationGlobal = globalThis as typeof globalThis & {
  __programaSassNotifications?: Map<string, TenantNotificationRecord[]>;
};
const localNotifications =
  notificationGlobal.__programaSassNotifications ??
  new Map<string, TenantNotificationRecord[]>();
if (process.env.NODE_ENV !== "production")
  notificationGlobal.__programaSassNotifications = localNotifications;

function mapRow(row: NotificationRow): TenantNotificationRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    message: row.message,
    type: NOTIFICATION_CHANNELS.includes(row.type as NotificationChannel)
      ? (row.type as NotificationChannel)
      : "system",
    isRead: row.is_read === true,
    createdAt: row.created_at,
  };
}

function developmentNotifications(
  companyId: string,
): TenantNotificationRecord[] {
  const current = localNotifications.get(companyId);
  if (current) return current;
  const initial: TenantNotificationRecord[] = [
    {
      id: crypto.randomUUID(),
      companyId,
      title: "Entorno de desarrollo",
      message:
        "Las notificaciones se guardan en memoria solamente fuera de producción.",
      type: "system",
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ];
  localNotifications.set(companyId, initial);
  return initial;
}

function requireProductionPersistence(): never {
  throw new ApiError(
    503,
    "La persistencia de notificaciones no está configurada.",
    "NOTIFICATION_PERSISTENCE_UNAVAILABLE",
  );
}

export async function listTenantNotifications(
  context: TenantContext,
): Promise<TenantNotificationRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient()
      .from("tenant_notifications")
      .select("id, company_id, title, message, type, is_read, created_at")
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error)
      throw new ApiError(
        503,
        "No se pudieron consultar las notificaciones.",
        "NOTIFICATION_LIST_UNAVAILABLE",
      );
    return ((data ?? []) as NotificationRow[]).map(mapRow);
  }
  if (process.env.NODE_ENV === "production")
    return requireProductionPersistence();
  return developmentNotifications(context.companyId).map((item) => ({
    ...item,
  }));
}

export async function createTenantNotification(
  context: TenantContext,
  input: { title: string; message: string; type: NotificationChannel },
): Promise<TenantNotificationRecord> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient()
      .from("tenant_notifications")
      .insert({
        company_id: context.companyId,
        title: input.title,
        message: input.message,
        type: input.type,
        is_read: false,
      })
      .select("id, company_id, title, message, type, is_read, created_at")
      .single();
    if (error || !data)
      throw new ApiError(
        503,
        "No se pudo registrar la notificación.",
        "NOTIFICATION_CREATE_UNAVAILABLE",
      );
    return mapRow(data as NotificationRow);
  }
  if (process.env.NODE_ENV === "production")
    return requireProductionPersistence();
  const notification: TenantNotificationRecord = {
    id: crypto.randomUUID(),
    companyId: context.companyId,
    title: input.title,
    message: input.message,
    type: input.type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  localNotifications.set(context.companyId, [
    notification,
    ...developmentNotifications(context.companyId),
  ]);
  return { ...notification };
}

export async function markTenantNotificationRead(
  context: TenantContext,
  notificationId: string,
): Promise<TenantNotificationRecord> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient()
      .from("tenant_notifications")
      .update({ is_read: true })
      .eq("company_id", context.companyId)
      .eq("id", notificationId)
      .select("id, company_id, title, message, type, is_read, created_at")
      .maybeSingle();
    if (error)
      throw new ApiError(
        503,
        "No se pudo actualizar la notificación.",
        "NOTIFICATION_UPDATE_UNAVAILABLE",
      );
    if (!data)
      throw new ApiError(404, "La notificación no existe.", "NOT_FOUND");
    return mapRow(data as NotificationRow);
  }
  if (process.env.NODE_ENV === "production")
    return requireProductionPersistence();
  const notifications = developmentNotifications(context.companyId);
  const current = notifications.find(
    (notification) => notification.id === notificationId,
  );
  if (!current)
    throw new ApiError(404, "La notificación no existe.", "NOT_FOUND");
  const updated = { ...current, isRead: true };
  localNotifications.set(
    context.companyId,
    notifications.map((notification) =>
      notification.id === notificationId ? updated : notification,
    ),
  );
  return updated;
}
