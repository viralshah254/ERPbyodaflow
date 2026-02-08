"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect to Stock Levels (single source of truth). */
export default function StockRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/inventory/stock-levels");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Redirecting to Stock Levels…
    </div>
  );
}
