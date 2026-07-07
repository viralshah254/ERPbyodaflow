"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { attachForegroundPushListener } from "@/lib/push-notifications";

type PushDetail = { title?: string; body?: string; routeWeb?: string };

function showPushToast(detail: PushDetail): void {
  const title = detail.title?.trim() || "OdaFlow";
  const body = detail.body?.trim() || "";
  const routeWeb = detail.routeWeb?.trim();

  toast(title, {
    description: body || undefined,
    action: routeWeb
      ? {
          label: "Open",
          onClick: () => {
            window.location.assign(routeWeb);
          },
        }
      : undefined,
  });
}

/** In-app toast when a push arrives while the ERP tab is open (foreground). */
export function PushForegroundToast() {
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    void attachForegroundPushListener().then((unsub) => {
      unsubscribe = unsub;
    });

    const onCustomEvent = (event: Event) => {
      showPushToast((event as CustomEvent<PushDetail>).detail ?? {});
    };

    const onServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; title?: string; body?: string; routeWeb?: string };
      if (data?.type !== "odaflow:push") return;
      showPushToast(data);
    };

    window.addEventListener("odaflow:push-message", onCustomEvent);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    return () => {
      unsubscribe?.();
      window.removeEventListener("odaflow:push-message", onCustomEvent);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, []);

  return null;
}
