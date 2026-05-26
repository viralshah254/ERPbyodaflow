"use client";

import { useState, useEffect, useRef } from "react";
import { fetchNavCounts, type NavCounts } from "@/lib/api/nav-counts";
import { useAuthStore } from "@/stores/auth-store";
import { isApiConfigured } from "@/lib/api/client";

const POLL_INTERVAL_MS = 60_000;

export function useNavCounts(): NavCounts {
  const [counts, setCounts] = useState<NavCounts>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isApiConfigured() || isLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    const load = () => {
      fetchNavCounts()
        .then((data) => { if (!cancelled) setCounts(data); })
        .catch(() => {});
    };

    load();

    timerRef.current = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timerRef.current != null) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, isLoading]);

  return counts;
}
