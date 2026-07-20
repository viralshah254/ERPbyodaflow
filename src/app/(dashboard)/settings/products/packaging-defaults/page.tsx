"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Moved under Pricing → Packs for FMCG discoverability. */
export default function PackagingDefaultsSettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pricing/workspace/packs");
  }, [router]);
  return null;
}
