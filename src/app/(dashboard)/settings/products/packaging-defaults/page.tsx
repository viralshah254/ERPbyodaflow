"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Org packaging defaults removed — set packing on each product. */
export default function PackagingDefaultsSettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/master/products");
  }, [router]);
  return null;
}
