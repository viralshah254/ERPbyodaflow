/**
 * Firebase Cloud Messaging for the web ERP (browser push + foreground toasts).
 */
import { getFirebaseConfig, getCurrentFirebaseIdTokenForApi, isFirebaseConfigured } from "@/lib/firebase";
import { getApiBase, isApiConfigured } from "@/lib/api/client";
import {
  drillFromNotification,
  isPasswordResetNotification,
  normalizeNotificationWebRoute,
  passwordResetRequestsWebRoute,
  passwordResetUserIdFromNotification,
} from "@/lib/drill-through";

const SW_PATH = "/firebase-messaging-sw.js";
/** Legacy narrow scope from earlier builds — migrated to default `/` for reliable FCM delivery. */
const LEGACY_FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope/";
const TOKEN_STORAGE_KEY = "odaflow_web_fcm_token";

function swVersionConflict(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("requested version") && msg.includes("existing version");
}

async function unregisterLegacyFcmScope(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const legacy = await navigator.serviceWorker.getRegistration(LEGACY_FCM_SW_SCOPE);
  if (legacy) await legacy.unregister();
}

async function getExistingFcmRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return (
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration(LEGACY_FCM_SW_SCOPE)) ??
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
  if (existing?.active?.scriptURL?.includes("firebase-messaging-sw.js")) {
    return existing;
  }
  if (existing?.installing || existing?.waiting) {
    return existing;
  }

  try {
    await unregisterLegacyFcmScope();
    return await navigator.serviceWorker.register(SW_PATH);
  } catch (err) {
    if (swVersionConflict(err)) {
      const fallback = await getExistingFcmRegistration();
      if (fallback) return fallback;
    }
    console.warn("[push] service worker registration failed:", err);
    return null;
  }
}

type FcmMessagingContext = {
  messaging: import("firebase/messaging").Messaging;
  token: string;
  swReg: ServiceWorkerRegistration;
};

let fcmReadyPromise: Promise<FcmMessagingContext | null> | null = null;

/** Register SW + obtain FCM token before foreground listeners attach. */
async function ensureFcmMessagingReady(): Promise<FcmMessagingContext | null> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;
  if (!getVapidKey()) return null;

  if (!fcmReadyPromise) {
    fcmReadyPromise = (async () => {
      const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
      if (!(await isSupported())) return null;

      const swReg = await registerServiceWorker();
      if (!swReg) return null;

      const app = await getMessagingApp();
      if (!app) return null;

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
            token = await getToken(messaging, {
              vapidKey: getVapidKey(),
              serviceWorkerRegistration: fallbackReg,
            });
          }
        }
        if (!token) throw err;
      }
      if (!token) return null;

      return { messaging, token, swReg };
    })().catch((err) => {
      fcmReadyPromise = null;
      console.warn("[push] FCM setup failed:", err);
      return null;
    });
  }

  return fcmReadyPromise;
}

async function registerTokenWithBackend(token: string, force = false): Promise<void> {
  if (!isApiConfigured()) {
    throw new Error("API is not configured");
  }
  const bearer = await getCurrentFirebaseIdTokenForApi();
  if (!bearer) {
    throw new Error("Not signed in — cannot register push token with server");
  }

  const previous = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!force && previous === token) return;

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
    const detail = await res.text();
    throw new Error(`Server rejected push token (${res.status}): ${detail || "unknown error"}`);
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

/** Clear SW + local token so Register this browser starts fresh (fixes stale localhost tokens). */
export async function resetWebPushClient(): Promise<void> {
  if (typeof window === "undefined") return;
  fcmReadyPromise = null;
  await unregisterWebPushToken();
  await unregisterLegacyFcmScope();
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (reg.active?.scriptURL?.includes("firebase-messaging-sw.js")) {
        await reg.unregister();
      }
    }
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function navigateFromPayload(data: Record<string, string>): void {
  if (isPasswordResetNotification(data)) {
    const userId = passwordResetUserIdFromNotification(data);
    const listRoute = passwordResetRequestsWebRoute();
    const detailRoute = passwordResetRequestsWebRoute(userId);
    const routeWeb = data.routeWeb?.trim();
    window.location.assign(
      routeWeb?.startsWith(passwordResetRequestsWebRoute()) ? routeWeb : detailRoute || listRoute
    );
    return;
  }

  const routeWeb = normalizeNotificationWebRoute(data.routeWeb?.trim());
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
  const ctx = await ensureFcmMessagingReady();
  if (!ctx) return null;

  const { onMessage } = await import("firebase/messaging");
  return onMessage(ctx.messaging, (payload) => {
    handlePushPayload(payload);
  });
}

/** Request permission, register SW, sync FCM token with backend. Idempotent per session. */
export async function initWebPushNotifications(options?: {
  force?: boolean;
}): Promise<{
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

  if (options?.force) {
    fcmReadyPromise = null;
    await unregisterLegacyFcmScope();
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { registered: false, reason: `Notification permission: ${permission}` };
  }

  let ctx: FcmMessagingContext | null;
  try {
    ctx = await ensureFcmMessagingReady();
  } catch (err) {
    return {
      registered: false,
      reason: err instanceof Error ? err.message : "FCM token request failed",
    };
  }

  if (!ctx) return { registered: false, reason: "FCM token not returned" };

  try {
    await registerTokenWithBackend(ctx.token, options?.force === true);
  } catch (err) {
    return {
      registered: false,
      reason: err instanceof Error ? err.message : "Failed to save push token on server",
    };
  }

  return { registered: true };
}

/** Client-side push diagnostics for Settings → Notifications. */
export function getLocalWebFcmToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function getWebPushDiagnostics(): Promise<{
  origin: string;
  permission: string;
  localToken: boolean;
  serviceWorkerScopes: string[];
  serviceWorkerScript?: string;
}> {
  if (typeof window === "undefined") {
    return { origin: "", permission: "unsupported", localToken: false, serviceWorkerScopes: [] };
  }

  const registrations =
    "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];

  return {
    origin: window.location.origin,
    permission:
      typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    localToken: !!localStorage.getItem(TOKEN_STORAGE_KEY),
    serviceWorkerScopes: registrations.map((reg) => reg.scope),
    serviceWorkerScript: registrations[0]?.active?.scriptURL,
  };
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
