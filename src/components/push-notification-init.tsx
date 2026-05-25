"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { initWebPushNotifications, unregisterWebPushToken } from "@/lib/push-notifications";
import { isFirebaseConfigured } from "@/lib/firebase";

/** Registers web FCM after login; removes token on logout. */
export function PushNotificationInit() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isFirebaseConfigured()) return;

    if (!user) {
      startedRef.current = false;
      void unregisterWebPushToken();
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;
    void initWebPushNotifications().catch((err) => {
      console.warn("[push] init failed:", err);
      startedRef.current = false;
    });
  }, [user, isLoading]);

  return null;
}
