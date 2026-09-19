"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CollectionsHoldScreen } from "@/components/collections-hold-screen";
import { useAuthStore } from "@/stores/auth-store";

export default function CollectionsHoldPage() {
  const router = useRouter();
  const { isLoading, user, collectionsHold, isPlatformOperator } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (isPlatformOperator || !collectionsHold?.enabled) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, collectionsHold, isPlatformOperator, router]);

  if (!collectionsHold?.enabled) return null;
  return <CollectionsHoldScreen initial={collectionsHold} />;
}
