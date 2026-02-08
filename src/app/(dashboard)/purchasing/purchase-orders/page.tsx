"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect to Purchase Orders list (single source: /purchasing/orders). */
export default function PurchaseOrdersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/purchasing/orders");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Redirecting to Purchase Orders…
    </div>
  );
}
