"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { AppShellScrollLock } from "@/components/layout/app-shell-scroll-lock";
import { CapsOnProduct } from "@/components/layout/caps-on-product";
import { PushNotificationInit } from "@/components/push-notification-init";
import { PushForegroundToast } from "@/components/push-foreground-toast";
import { isApiConfigured } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { odaflowHubLoginUrl } from "@/lib/auth/odaflow-hub";

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
  const { isLoading, isPlatformOperator, user, collectionsHold, permissions } = useAuthStore();
  const router = useRouter();
  const [accessReady, setAccessReady] = useState(false);

  const org = useAuthStore((s) => s.org);
  const { templateId, applyTemplate } = useOrgContextStore();

  useEffect(() => {
    if (!isLoading && isPlatformOperator) {
      router.replace("/platform");
    }
  }, [isLoading, isPlatformOperator, router]);

  useEffect(() => {
    if (!isLoading && collectionsHold?.enabled && !isPlatformOperator) {
      router.replace("/collections-hold");
    }
  }, [isLoading, collectionsHold, isPlatformOperator, router]);

  // Redirect only after AuthRestore has finished and we're still not authenticated.
  // Keep the opened path so a real resume returns here instead of the dashboard.
  useEffect(() => {
    if (isLoading) return;
    if (!isApiConfigured()) {
      router.replace("/login?reason=backend");
      return;
    }
    if (!user) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(odaflowHubLoginUrl("erp", next));
    }
  }, [isLoading, user, router]);

  // Every page waits until permissions are loaded. An empty list is refreshed once
  // before any screen can say the user has no access.
  useEffect(() => {
    if (isLoading || !user) {
      setAccessReady(false);
      return;
    }
    if (permissions.length > 0) {
      setAccessReady(true);
      return;
    }
    let cancel = false;
    void import("@/lib/auth/restore-erp-session").then(({ reloadErpPermissions }) =>
      reloadErpPermissions()
        .catch(() => false)
        .finally(() => {
          if (!cancel) setAccessReady(true);
        })
    );
    return () => {
      cancel = true;
    };
  }, [isLoading, user, permissions.length]);

  useEffect(() => {
    if (org && !templateId) {
      const tid = DEFAULT_TEMPLATE_BY_ORG_TYPE[org.orgType];
      if (tid) applyTemplate(tid);
    }
  }, [org, templateId, applyTemplate]);

  return (
    <>
      <AppShellScrollLock />
      <CapsOnProduct />
      <PushNotificationInit />
      <PushForegroundToast />
      <MainLayout>
        {!isApiConfigured() ? (
          <div className="mb-4 shrink-0 w-full rounded-md border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs text-amber-200">
            Non-live mode: API is not configured. Critical finance/accounting
            actions are disabled.
          </div>
        ) : null}
        {isLoading || !user || !accessReady ? null : children}
      </MainLayout>
    </>
  );
}
