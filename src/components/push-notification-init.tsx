"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { initWebPushNotifications, unregisterWebPushToken } from "@/lib/push-notifications";
import { isFirebaseConfigured } from "@/lib/firebase";

/** Registers web FCM after login; removes token on logout. */
export function PushNotificationInit() {
  const userId = useAuthStore((s) => s.user?.userId);
  const isLoading = useAuthStore((s) => s.isLoading);
  const startedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !isFirebaseConfigured()) return;

    if (!userId) {
      startedForUserRef.current = null;
      void unregisterWebPushToken();
      return;
    }

    if (startedForUserRef.current === userId) return;
    startedForUserRef.current = userId;
    void initWebPushNotifications().catch((err) => {
      console.warn("[push] init failed:", err);
      startedForUserRef.current = null;
    });
  }, [userId, isLoading]);

  return null;
}
