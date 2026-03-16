import { apiRequest, requireLiveApi } from "./client";

export type NotificationSettings = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  overdueThresholdDays: number;
  recipientPermission: string;
};

export type InboxNotification = {
  id: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
  status: "OPEN" | "ACKNOWLEDGED";
  userId?: string;
  dedupeKey?: string;
  permission?: string;
  entityType?: string;
  entityId?: string;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  inApp: true,
  email: false,
  sms: false,
  whatsapp: false,
  overdueThresholdDays: 0,
  recipientPermission: "finance.ar.read",
};

export async function fetchNotificationSettingsApi(): Promise<NotificationSettings> {
  requireLiveApi("Notification settings");
  const data = await apiRequest<Partial<NotificationSettings>>("/api/settings/notifications");
  return { ...DEFAULT_SETTINGS, ...data };
}

export async function updateNotificationSettingsApi(
  patch: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  requireLiveApi("Update notification settings");
  const data = await apiRequest<Partial<NotificationSettings>>("/api/settings/notifications", {
    method: "PATCH",
    body: patch,
  });
  return { ...DEFAULT_SETTINGS, ...data };
}

export async function fetchInboxNotificationsApi(): Promise<InboxNotification[]> {
  requireLiveApi("Inbox notifications");
  const payload = await apiRequest<{ items: InboxNotification[] }>("/api/notifications/inbox");
  return payload.items ?? [];
}

export async function syncOverdueAlertsApi(): Promise<{ created: number }> {
  requireLiveApi("Overdue alerts sync");
  return apiRequest<{ created: number }>("/api/automation/alerts/sync-overdue", { method: "POST" });
}

export async function acknowledgeNotificationApi(id: string): Promise<void> {
  requireLiveApi("Acknowledge notification");
  await apiRequest(`/api/notifications/inbox/${encodeURIComponent(id)}/ack`, { method: "POST" });
}
