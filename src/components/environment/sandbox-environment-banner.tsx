"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";

export function SandboxEnvironmentBanner() {
  const tenant = useAuthStore((s) => s.tenant);
  if (tenant?.environmentMode !== "SANDBOX") return null;

  return (
    <div className="shrink-0 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
      <span className="font-medium">Sandbox</span>
      {" — dummy data. Go Live to start empty real books. "}
      <Link href="/settings/environment" className="font-medium underline underline-offset-2">
        Environment settings
      </Link>
    </div>
  );
}
