/**
 * Dynamic Firebase Cloud Messaging service worker.
 * Served at /firebase-messaging-sw.js (required path for FCM web push).
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  const body = `
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var title =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    "OdaFlow";
  var body =
    (payload.notification && payload.notification.body) ||
    (payload.data && payload.data.body) ||
    "";
  var routeWeb =
    (payload.data && payload.data.routeWeb) || "/automation/alerts";
  var notificationData = Object.assign({}, payload.data || {}, { routeWeb: routeWeb });

  return clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    list.forEach(function (client) {
      client.postMessage({
        type: "odaflow:push",
        title: title,
        body: body,
        routeWeb: routeWeb,
      });
    });
    return self.registration.showNotification(title, {
      body: body,
      icon: "/favicon.png",
      data: notificationData,
    });
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var routeWeb =
    (event.notification.data && event.notification.data.routeWeb) ||
    "/automation/alerts";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var client = list[i];
        if ("focus" in client) {
          client.navigate(routeWeb);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(routeWeb);
    })
  );
});
`.trim();

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
