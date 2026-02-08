"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect to Customizer → Modules (single entry point). */
export default function CustomizationRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/customizer/modules");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Redirecting to Customizer…
    </div>
  );
}
