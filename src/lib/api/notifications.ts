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
  routeWeb?: string;
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

export async function sendTestPushNotificationApi(input?: {
  title?: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  alsoInbox?: boolean;
}): Promise<{
  sent: boolean;
  tokenCount?: number;
  successCount?: number;
  failureCount?: number;
  staleRemoved?: number;
  reason?: string;
  errors?: string[];
}> {
  requireLiveApi("Test push notification");
  return apiRequest("/api/notifications/test-push", {
    method: "POST",
    body: {
      title: input?.title,
      body: input?.body,
      entityType: input?.entityType ?? "approval",
      entityId: input?.entityId,
      alsoInbox: input?.alsoInbox ?? true,
    },
  });
}

export async function sendOrgAdminTestPushApi(input?: {
  title?: string;
  message?: string;
}): Promise<{ ok: boolean; orgIds: string[]; message: string }> {
  requireLiveApi("Org admin test push");
  return apiRequest("/api/notifications/test-push/org-admins", {
    method: "POST",
    body: {
      title: input?.title,
      message: input?.message,
    },
  });
}

export async function fetchPushTokenStatusApi(currentToken?: string): Promise<{
  registered: boolean;
  tokenCount: number;
  platforms: string[];
  currentTokenRegistered?: boolean;
}> {
  requireLiveApi("Push token status");
  const params =
    currentToken?.trim() != null && currentToken.trim() !== ""
      ? { token: currentToken.trim() }
      : undefined;
  return apiRequest("/api/me/push-token/status", { params });
}
