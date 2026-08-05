"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Org-wide manufacturer packs removed — packing is set per product only
 * (Master → Products → Packs tab, or on create / import).
 */
export default function PricingManufacturerPacksRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/master/products");
  }, [router]);
  return null;
}
