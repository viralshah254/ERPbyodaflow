"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { SsoContinuityScreen } from "@/components/auth/sso-continuity-screen";
import { useAuthStore } from "@/stores/auth-store";
import { setApiAuth } from "@/lib/api/client";
import { odaflowHubLoggedOutUrl } from "@/lib/auth/odaflow-hub";
import { broadcastOdaflowLogout } from "@/lib/auth/sso-logout-sync";

function safeReturnTo(raw: string | null): string {
  const fallback = odaflowHubLoggedOutUrl("erp");
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const allowed =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "odaflow.com" ||
      host.endsWith(".odaflow.com");
    if (!allowed || (url.protocol !== "http:" && url.protocol !== "https:")) {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

function SignOutContent() {
  const params = useSearchParams();
  const embed = params.get("embed") === "1";

  React.useEffect(() => {
    const dest = safeReturnTo(params.get("return"));
    void (async () => {
      setApiAuth({ bearerToken: undefined });
      useAuthStore.getState().logout();
      broadcastOdaflowLogout();
      try {
        const { signOut } = await import("@/lib/firebase");
        await signOut();
      } catch {
        // already signed out
      }
      if (!embed) window.location.replace(dest);
    })();
  }, [embed, params]);

  return (
    <SsoContinuityScreen
      title="Signing out"
      message="Ending your Odaflow session"
    />
  );
}

export default function SignOutPage() {
  return (
    <React.Suspense fallback={<SsoContinuityScreen title="Signing out" message="Ending your Odaflow session" />}>
      <SignOutContent />
    </React.Suspense>
  );
}
