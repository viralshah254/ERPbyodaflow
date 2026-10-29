"use client";

import { orgUsesCapsOnProduct } from "@/lib/org/product-text";
import { useAuthStore } from "@/stores/auth-store";
import { useLayoutEffect } from "react";

/** Turns product-name capitals on when this organisation's setting says so. */
export function CapsOnProduct() {
  const capsOnProduct = useAuthStore((s) => orgUsesCapsOnProduct(s.org));

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (capsOnProduct) root.dataset.capsOnProduct = "true";
    else delete root.dataset.capsOnProduct;
    return () => {
      delete root.dataset.capsOnProduct;
    };
  }, [capsOnProduct]);

  return null;
}
