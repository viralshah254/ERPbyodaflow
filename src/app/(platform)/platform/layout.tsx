"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Header } from "@/components/layout/header";
import { AppSplashScreen } from "@/components/brand/AppSplashScreen";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isPlatformOperator } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login?redirect=/platform");
      return;
    }
    if (!isPlatformOperator) {
      router.replace("/dashboard");
      return;
    }
  }, [isLoading, isAuthenticated, isPlatformOperator, router]);

  if (isLoading || !isAuthenticated || !isPlatformOperator) {
    return <AppSplashScreen message={isLoading ? "Loading…" : "Redirecting…"} variant="fullscreen" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <PlatformSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
