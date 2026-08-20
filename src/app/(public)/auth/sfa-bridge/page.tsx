"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { SsoContinuityScreen } from "@/components/auth/sso-continuity-screen";
import { attachSfaFromErp } from "@/lib/auth/attach-sfa-from-erp";
import { odaflowHubWebUrl } from "@/lib/auth/odaflow-hub";

function SfaBridgeContent() {
  const params = useSearchParams();
  const existingUser = useAuthStore((s) => s.user);
  const hydrating = useAuthStore((s) => s.isLoading);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hydrating) return;
    const next = params.get("next") || "/";
    const returnTo = params.get("return") || "";
    const hub = `${odaflowHubWebUrl()}/auth/sso?client=sfa&erpTried=1&next=${encodeURIComponent(next)}`;

    let cancelled = false;
    (async () => {
      if (!existingUser) {
        window.location.replace(hub);
        return;
      }
      const result = await attachSfaFromErp({ next, returnTo });
      if (cancelled) return;
      if (result.attached && result.redirectUrl) {
        window.location.replace(result.redirectUrl);
        return;
      }
      setError(
        result.message ||
          "This ERP account is not linked to SFA. Sign in on Odaflow with the SFA phone number."
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [existingUser, hydrating, params]);

  return (
    <SsoContinuityScreen
      title="Opening SFA"
      message="Continuing from your ERP session"
      error={error}
      actionHref={`${odaflowHubWebUrl()}/login?sso=1&client=sfa&erpTried=1`}
      actionLabel="Sign in on Odaflow"
    />
  );
}

export default function SfaBridgePage() {
  return (
    <React.Suspense fallback={<SsoContinuityScreen title="Opening SFA" message="Continuing from your ERP session" />}>
      <SfaBridgeContent />
    </React.Suspense>
  );
}
