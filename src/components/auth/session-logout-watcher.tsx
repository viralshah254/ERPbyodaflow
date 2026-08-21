"use client";

import { useEffect } from "react";
import { setApiAuth } from "@/lib/api/client";
import { odaflowHubLoggedOutUrl } from "@/lib/auth/odaflow-hub";
import { onOdaflowLogout, shouldDropLocalSession } from "@/lib/auth/sso-logout-sync";
import { useAuthStore } from "@/stores/auth-store";

function dropErpSessionIfLoggedOutElsewhere() {
  if (!useAuthStore.getState().user) return;
  if (!shouldDropLocalSession()) return;
  setApiAuth({ bearerToken: undefined });
  useAuthStore.getState().logout();
  const path = window.location.pathname;
  if (path.startsWith("/auth/") || path.startsWith("/login")) return;
  window.location.replace(odaflowHubLoggedOutUrl("erp"));
}

export function SessionLogoutWatcher() {
  useEffect(() => {
    const tick = () => dropErpSessionIfLoggedOutElsewhere();
    const id = window.setInterval(tick, 4000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    const stop = onOdaflowLogout(tick);
    tick();
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
      stop();
    };
  }, []);

  return null;
}
