"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeOdaflowHandoff } from "@/lib/auth/complete-odaflow-handoff";
import { SsoContinuityScreen } from "@/components/auth/sso-continuity-screen";
import { odaflowHubWebUrl } from "@/lib/auth/odaflow-hub";

function HandoffContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const code = params.get("code")?.trim();
    const next = params.get("next") || "";
    if (!code) {
      setError("Missing handoff code.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fallback = await completeOdaflowHandoff(code);
        if (cancelled) return;
        const dest = next.startsWith("/") ? next : fallback;
        router.replace(dest);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not continue into ERP.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <SsoContinuityScreen
      title="Opening ERP"
      message="Continuing your session"
      error={error}
      actionHref={`${odaflowHubWebUrl()}/auth/sso?client=erp`}
      actionLabel="Back to Odaflow"
    />
  );
}

export default function ErpHandoffPage() {
  return (
    <React.Suspense fallback={<SsoContinuityScreen title="Opening ERP" message="Continuing your session" />}>
      <HandoffContent />
    </React.Suspense>
  );
}
