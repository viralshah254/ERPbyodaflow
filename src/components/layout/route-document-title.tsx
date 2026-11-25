"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { pageTitleFor } from "@/lib/navigation/page-title";
import { useTerminology } from "@/stores/orgContextStore";

/** Names each browser tab after its screen, e.g. "Work Orders · Manufacturing · ERP by OdaFlow". */
export function RouteDocumentTitle() {
  const pathname = usePathname();
  const area = manufacturingAreaLabel(useTerminology());

  useEffect(() => {
    if (!pathname) return;
    const title = pageTitleFor(pathname, area);
    document.title = title;
    // Next applies the root metadata title during client navigation; set ours after it.
    const frame = window.requestAnimationFrame(() => {
      if (document.title !== title) document.title = title;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, area]);

  return null;
}
