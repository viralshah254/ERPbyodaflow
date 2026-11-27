"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { GENERAL_PAYMENTS_HREF, safeReturnTo } from "@/lib/finance/general-payment-notice";

const KNOWN_RETURNS: Array<{ prefix: string; label: string; hint: string }> = [
  {
    prefix: GENERAL_PAYMENTS_HREF,
    label: "Back to General Payments",
    hint: "Finish the setup below, then go back to record your payment.",
  },
];

/** Shown on a setup screen when the user arrived from a screen that was waiting on it. */
function ReturnToBannerInner() {
  const returnTo = safeReturnTo(useSearchParams().get("returnTo"));
  if (!returnTo) return null;
  const known = KNOWN_RETURNS.find((entry) => returnTo.startsWith(entry.prefix));
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-muted-foreground">{known?.hint ?? "Finish here, then go back to what you were doing."}</p>
      <Button size="sm" asChild>
        <Link href={returnTo}>
          <Icons.ArrowLeft className="mr-2 h-4 w-4" />
          {known?.label ?? "Go back"}
        </Link>
      </Button>
    </div>
  );
}

export function ReturnToBanner() {
  // useSearchParams needs a Suspense boundary so static pages can still build.
  return (
    <React.Suspense fallback={null}>
      <ReturnToBannerInner />
    </React.Suspense>
  );
}
