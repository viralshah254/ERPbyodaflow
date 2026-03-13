"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { isApiConfigured, setApiAuth } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_TEMPLATE_BY_ORG_TYPE: Record<string, string> = {
  MANUFACTURER: "fmcg-manufacturer",
  DISTRIBUTOR: "fmcg-distributor",
  SHOP: "retail-multi-store",
};

// Mock auth initialization
function initializeMockAuth() {
  const { setSession } = useAuthStore.getState();
  const { hydrateFromBackend } = useOrgContextStore.getState();

  // Mock data
  const branch1 = {
    branchId: "branch-1",
    orgId: "org-1",
    name: "Head Office",
    isHeadOffice: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  setSession({
    user: {
      userId: "user-1",
      orgId: "org-1",
      branchIds: ["branch-1", "branch-2"],
      roleIds: ["role-admin"],
      email: "admin@odaflow.com",
      firstName: "Admin",
      lastName: "User",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    org: {
      orgId: "org-1",
      tenantId: "tenant-1",
      orgType: "MANUFACTURER",
      name: "Acme Manufacturing",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tenant: {
      tenantId: "tenant-1",
      name: "Acme Corp",
      plan: "ENTERPRISE",
      region: "US",
      currency: "USD",
      timeZone: "America/New_York",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    currentBranch: branch1,
    branches: [branch1],
    permissions: ["*"],
  });
  hydrateFromBackend({
    orgType: "MANUFACTURER",
    templateId: "fmcg-manufacturer",
    enabledModules: [
      "dashboard",
      "masters",
      "inventory",
      "sales",
      "purchasing",
      "pricing",
      "finance",
      "manufacturing",
      "crm",
      "projects",
      "reports",
      "automation",
      "analytics",
      "settings",
      "docs",
    ],
    featureFlags: {
      approvals: true,
      batchExpiry: true,
      bomMrpWorkOrders: true,
      costing: true,
      multiWarehouse: true,
      workOrders: true,
    },
    orgRole: "STANDARD",
    franchisePersona: "STANDARD",
  });
  // So Cool Catch (and other) API requests send dev auth when backend is configured
  setApiAuth({ devUserId: "user-1", branchId: branch1.branchId });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const org = useAuthStore((s) => s.org);
  const { templateId, applyTemplate } = useOrgContextStore();

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      if (!isLoading) return;
      if (!isApiConfigured()) {
        initializeMockAuth();
        return;
      }
      try {
        const session = await fetchRuntimeSession();
        if (!active) return;
        useAuthStore.getState().setSession(session);
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
        initializeMockAuth();
      }
    };
    void bootstrap();
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

  return <MainLayout>{children}</MainLayout>;
}

