"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchNavCounts, type NavCounts } from "@/lib/api/nav-counts";
import { useAuthStore } from "@/stores/auth-store";
import { isApiConfigured } from "@/lib/api/client";
import { subscribeRealtimeInbox, refreshRealtimeConnection } from "@/lib/realtime-client";

const POLL_INTERVAL_MS = 60_000;

export function useNavCounts(): NavCounts {
  const [counts, setCounts] = useState<NavCounts>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isAuthenticated, isLoading } = useAuthStore();

  const load = useCallback(() => {
    fetchNavCounts()
      .then((data) => setCounts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isApiConfigured() || isLoading || !isAuthenticated) {
      return;
    }

    load();
    refreshRealtimeConnection();

    timerRef.current = setInterval(load, POLL_INTERVAL_MS);

    const unsubscribe = subscribeRealtimeInbox((event, payload) => {
      if (event === "odaflow.sync-queue.changed" && typeof payload.pendingCount === "number") {
        setCounts((prev) => ({ ...prev, "odaflow-sync-queue": payload.pendingCount as number }));
        return;
      }
      load();
    });

    return () => {
      if (timerRef.current != null) clearInterval(timerRef.current);
      unsubscribe();
    };
  }, [isAuthenticated, isLoading, load]);

  return counts;
}
