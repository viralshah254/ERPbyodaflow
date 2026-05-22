"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { isApiConfigured } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_TEMPLATE_BY_ORG_TYPE: Record<string, string> = {
  MANUFACTURER: "fmcg-manufacturer",
  DISTRIBUTOR: "fmcg-distributor",
  SHOP: "retail-multi-store",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isPlatformOperator, user } = useAuthStore();
  const router = useRouter();

  const org = useAuthStore((s) => s.org);
  const { templateId, applyTemplate } = useOrgContextStore();

  useEffect(() => {
    if (!isLoading && isPlatformOperator) {
      router.replace("/platform");
    }
  }, [isLoading, isPlatformOperator, router]);

  // Redirect to login only after AuthRestore has finished and we're still not authenticated
  useEffect(() => {
    if (isLoading) return;
    if (!isApiConfigured()) {
      router.replace("/login?reason=backend");
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (org && !templateId) {
      const tid = DEFAULT_TEMPLATE_BY_ORG_TYPE[org.orgType];
      if (tid) applyTemplate(tid);
    }
  }, [org, templateId, applyTemplate]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <MainLayout>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!isApiConfigured() ? (
            <div className="shrink-0 w-full rounded-md border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs text-amber-200">
              Non-live mode: API is not configured. Critical finance/accounting
              actions are disabled.
            </div>
          ) : null}
          {isLoading ? null : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          )}
        </div>
      </MainLayout>
    </div>
  );
}
