"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { isApiConfigured, setApiAuth } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import { getIdToken, isFirebaseConfigured } from "@/lib/firebase";
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

  // When loading, give AuthRestore time to restore from Firebase; only try session fetch if we have a token
  useEffect(() => {
    if (!isLoading) return;
    if (!isApiConfigured()) {
      useAuthStore.getState().logout();
      useAuthStore.getState().finishHydration();
      return;
    }
    let active = true;
    const tryRestoreFromToken = async () => {
      let token = await getIdToken();
      if (!token && isFirebaseConfigured()) {
        await new Promise((r) => setTimeout(r, 800));
        token = await getIdToken();
      }
      if (!active) return;
      if (!token) {
        useAuthStore.getState().finishHydration();
        return;
      }
      try {
        setApiAuth({ bearerToken: token });
        const session = await fetchRuntimeSession();
        if (!active) return;
        useAuthStore.getState().setSession({
          ...session,
          isPlatformOperator: session.isPlatformOperator,
        });
        useOrgContextStore.getState().hydrateFromBackend({
          orgType: session.org.orgType,
          templateId: session.orgContext.templateId,
          enabledModules: session.orgContext.enabledModules,
          featureFlags: session.orgContext.featureFlags,
          terminology: session.orgContext.terminology,
          defaultNav: session.orgContext.defaultNav,
          orgRole: session.orgContext.orgRole,
          parentOrgId: session.orgContext.parentOrgId,
          franchiseNetworkId: session.orgContext.franchiseNetworkId,
          franchiseCode: session.orgContext.franchiseCode,
          franchiseTerritory: session.orgContext.franchiseTerritory,
          franchiseStoreFormat: session.orgContext.franchiseStoreFormat,
          franchiseManagerName: session.orgContext.franchiseManagerName,
          franchisePersona: session.orgContext.franchisePersona,
        });
        setApiAuth({ branchId: session.currentBranch?.branchId });
      } catch (_error) {
        if (!active) return;
        useAuthStore.getState().finishHydration();
      }
    };
    void tryRestoreFromToken();
    return () => {
      active = false;
    };
  }, [isLoading, router]);

  useEffect(() => {
    if (org && !templateId) {
      const tid = DEFAULT_TEMPLATE_BY_ORG_TYPE[org.orgType];
      if (tid) applyTemplate(tid);
    }
  }, [org, templateId, applyTemplate]);

  return (
    <MainLayout>
      {!isApiConfigured() ? (
        <div className="w-full bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200">
          Non-live mode: API is not configured. Critical finance/accounting actions are disabled.
        </div>
      ) : null}
      {children}
    </MainLayout>
  );
}

