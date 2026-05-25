import { NextResponse } from "next/server";
import { getFirebaseConfig } from "@/lib/firebase";

export const dynamic = "force-static";

export async function GET() {
  const config = getFirebaseConfig();
  const body = `
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? "OdaFlow";
  const body = payload.notification?.body ?? payload.data?.body ?? "";
  const link = payload.fcmOptions?.link ?? payload.data?.routeWeb ?? "/automation/alerts";

  self.registration.showNotification(title, {
    body,
    data: { ...(payload.data || {}), routeWeb: link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.routeWeb ?? "/automation/alerts";
  event.waitUntil(clients.openWindow(route));
});
`.trim();

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
