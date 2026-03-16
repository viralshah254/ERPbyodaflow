"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { Header } from "@/components/layout/header";

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
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <PlatformSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
