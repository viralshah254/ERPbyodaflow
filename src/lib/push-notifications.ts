/**
 * Firebase Cloud Messaging for the web ERP (browser push + foreground toasts).
 */
import { getFirebaseConfig, getCurrentFirebaseIdTokenForApi, isFirebaseConfigured } from "@/lib/firebase";
import { getApiBase, isApiConfigured } from "@/lib/api/client";
import { drillFromNotification } from "@/lib/drill-through";

const SW_PATH = "/firebase-messaging-sw.js";
/** Narrow scope avoids clashing with other workers and Chrome version downgrade errors. */
const FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope/";
const TOKEN_STORAGE_KEY = "odaflow_web_fcm_token";

function swVersionConflict(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("requested version") && msg.includes("existing version");
}

async function getExistingFcmRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return (
    (await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE)) ??
    (await navigator.serviceWorker.getRegistration("/")) ??
    null
  );
}

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

  const existing = await getExistingFcmRegistration();
  if (existing?.active || existing?.installing || existing?.waiting) {
    return existing;
  }

  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: FCM_SW_SCOPE });
  } catch (err) {
    if (swVersionConflict(err)) {
      const fallback = await getExistingFcmRegistration();
      if (fallback) return fallback;
    }
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

  if (previous && previous !== token) {
    try {
      await fetch(`${getApiBase()}/api/me/push-token`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({ token: previous }),
      });
    } catch {
      // best-effort — replace stale token for this browser
    }
  }

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

function showForegroundPush(title: string, body: string, data: Record<string, string>): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("odaflow:push-message", {
        detail: { title, body, routeWeb: data.routeWeb },
      })
    );
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      const n = new Notification(title, { body, data, icon: "/favicon.png" });
      n.onclick = () => {
        n.close();
        navigateFromPayload(data);
      };
    } catch {
      // Chrome often blocks system notifications while the tab is focused.
    }
  }
}

function handlePushPayload(payload: {
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
}): void {
  const title = payload.notification?.title ?? payload.data?.title ?? "OdaFlow";
  const body = payload.notification?.body ?? payload.data?.body ?? "";
  const data = (payload.data ?? {}) as Record<string, string>;
  showForegroundPush(title, body, data);
}

/** Attach FCM onMessage for the open tab. Safe to call on every dashboard mount. */
export async function attachForegroundPushListener(): Promise<(() => void) | null> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;

  const { isSupported, getMessaging, onMessage } = await import("firebase/messaging");
  if (!(await isSupported())) return null;

  const app = await getMessagingApp();
  if (!app) return null;

  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    handlePushPayload(payload);
  });
}

/** Request permission, register SW, sync FCM token with backend. Idempotent per session. */
export async function initWebPushNotifications(): Promise<{
  registered: boolean;
  reason?: string;
}> {
  if (typeof window === "undefined") return { registered: false, reason: "Not in browser" };
  if (!isFirebaseConfigured() || !isApiConfigured()) {
    return { registered: false, reason: "Firebase or API not configured" };
  }
  if (!getVapidKey()) {
    console.info("[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set — web push disabled");
    return { registered: false, reason: "VAPID key not configured" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { registered: false, reason: `Notification permission: ${permission}` };
  }

  const swReg = await registerServiceWorker();
  if (!swReg) return { registered: false, reason: "Service worker registration failed" };

  const app = await getMessagingApp();
  if (!app) return { registered: false, reason: "Firebase app unavailable" };

  const { getMessaging, getToken } = await import("firebase/messaging");
  const messaging = getMessaging(app);

  let token: string | undefined;
  try {
    token = await getToken(messaging, {
      vapidKey: getVapidKey(),
      serviceWorkerRegistration: swReg,
    });
  } catch (err) {
    if (swVersionConflict(err)) {
      const fallbackReg = await getExistingFcmRegistration();
      if (fallbackReg) {
        try {
          token = await getToken(messaging, {
            vapidKey: getVapidKey(),
            serviceWorkerRegistration: fallbackReg,
          });
        } catch (retryErr) {
          return {
            registered: false,
            reason: retryErr instanceof Error ? retryErr.message : "FCM token request failed",
          };
        }
      }
    }
    if (!token) {
      return {
        registered: false,
        reason: err instanceof Error ? err.message : "FCM token request failed",
      };
    }
  }

  if (!token) return { registered: false, reason: "FCM token not returned" };

  await registerTokenWithBackend(token);

  return { registered: true };
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

  const data = (await res.json()) as {
    sent?: boolean;
    tokenCount?: number;
    successCount?: number;
    failureCount?: number;
    staleRemoved?: number;
    reason?: string;
    errors?: string[];
  };
  if (!res.ok) {
    throw new Error(data.reason ?? data.errors?.[0] ?? `Test push failed (${res.status})`);
  }
  return { ...data, sent: data.sent ?? false };
}
