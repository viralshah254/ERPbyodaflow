/**
 * Firebase Cloud Messaging for the web ERP (browser push + foreground toasts).
 */
import { getFirebaseConfig, getCurrentFirebaseIdTokenForApi, isFirebaseConfigured } from "@/lib/firebase";
import { getApiBase, isApiConfigured } from "@/lib/api/client";
import { drillFromNotification } from "@/lib/drill-through";

const SW_PATH = "/firebase-messaging-sw.js";
const TOKEN_STORAGE_KEY = "odaflow_web_fcm_token";

function getVapidKey(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() || undefined;
}

async function getMessagingApp() {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) return null;
  const { getApp, getApps, initializeApp } = await import("firebase/app");
  return getApps().length === 0 ? initializeApp(config) : getApp();
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch (err) {
    console.warn("[push] service worker registration failed:", err);
    return null;
  }
}

async function registerTokenWithBackend(token: string): Promise<void> {
  if (!isApiConfigured()) return;
  const bearer = await getCurrentFirebaseIdTokenForApi();
  if (!bearer) return;

  const previous = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (previous === token) return;

  const res = await fetch(`${getApiBase()}/api/me/push-token`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({ token, platform: "web" }),
  });
  if (!res.ok) {
    console.warn("[push] token register failed:", res.status, await res.text());
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export async function unregisterWebPushToken(): Promise<void> {
  if (typeof window === "undefined" || !isApiConfigured()) return;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return;
  const bearer = await getCurrentFirebaseIdTokenForApi();
  if (!bearer) return;
  try {
    await fetch(`${getApiBase()}/api/me/push-token`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ token: stored }),
    });
  } catch {
    // best-effort on logout
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function navigateFromPayload(data: Record<string, string>): void {
  const routeWeb = data.routeWeb?.trim();
  if (routeWeb) {
    window.location.assign(routeWeb);
    return;
  }
  const link = drillFromNotification({
    entityType: data.entityType,
    entityId: data.entityId,
    dedupeKey: data.dedupeKey,
  });
  window.location.assign(link.href);
}

/** Request permission, register SW, sync FCM token with backend. Idempotent per session. */
export async function initWebPushNotifications(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isFirebaseConfigured() || !isApiConfigured()) return;
  if (!getVapidKey()) {
    console.info("[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set — web push disabled");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const swReg = await registerServiceWorker();
  if (!swReg) return;

  const app = await getMessagingApp();
  if (!app) return;

  const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: getVapidKey(),
    serviceWorkerRegistration: swReg,
  });
  if (token) {
    await registerTokenWithBackend(token);
  }

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? payload.data?.title ?? "OdaFlow";
    const body = payload.notification?.body ?? payload.data?.body ?? "";
    const data = (payload.data ?? {}) as Record<string, string>;

    if (Notification.permission === "granted") {
      const n = new Notification(title, {
        body,
        data,
      });
      n.onclick = () => {
        n.close();
        navigateFromPayload(data);
      };
    }
  });
}

export async function sendTestPushNotification(input?: {
  title?: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  alsoInbox?: boolean;
}): Promise<{ sent: boolean; tokenCount?: number; reason?: string }> {
  if (!isApiConfigured()) throw new Error("API is not configured");
  const bearer = await getCurrentFirebaseIdTokenForApi();
  if (!bearer) throw new Error("Not signed in");

  const res = await fetch(`${getApiBase()}/api/notifications/test-push`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      title: input?.title ?? "OdaFlow test notification",
      body: input?.body ?? "Web push is configured. Tap to open the linked screen.",
      entityType: input?.entityType ?? "approval",
      entityId: input?.entityId,
      alsoInbox: input?.alsoInbox ?? true,
    }),
  });

  const data = (await res.json()) as { sent?: boolean; tokenCount?: number; reason?: string };
  if (!res.ok) {
    throw new Error(data.reason ?? `Test push failed (${res.status})`);
  }
  return data;
}
