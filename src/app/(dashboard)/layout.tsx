"use client";

import { MainLayout } from "@/components/layout/main-layout";
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
  const { setUser, setOrg, setTenant, setCurrentBranch, setBranches } =
    useAuthStore.getState();

  // Mock data
  setUser({
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
  });

  setOrg({
    orgId: "org-1",
    tenantId: "tenant-1",
    orgType: "MANUFACTURER",
    name: "Acme Manufacturing",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  setTenant({
    tenantId: "tenant-1",
    name: "Acme Corp",
    plan: "ENTERPRISE",
    region: "US",
    currency: "USD",
    timeZone: "America/New_York",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const branch1 = {
    branchId: "branch-1",
    orgId: "org-1",
    name: "Head Office",
    isHeadOffice: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  setBranches([branch1]);
  setCurrentBranch(branch1);
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
    if (!isLoading && !isAuthenticated) {
      initializeMockAuth();
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (org && !templateId) {
      const tid = DEFAULT_TEMPLATE_BY_ORG_TYPE[org.orgType];
      if (tid) applyTemplate(tid);
    }
  }, [org, templateId, applyTemplate]);

  return <MainLayout>{children}</MainLayout>;
}

