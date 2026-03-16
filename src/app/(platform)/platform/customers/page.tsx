"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPlatformTenantsApi,
  type PlatformTenantRow,
} from "@/lib/api/platform";
import { fetchRuntimeSession } from "@/lib/api/context";
import { CreateCompanySheet } from "@/components/platform/CreateCompanySheet";
import { ProvisionCustomerSheet } from "@/components/platform/ProvisionCustomerSheet";
import { Plus, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";

export default function PlatformCustomersPage() {
  const searchParams = useSearchParams();
  const [tenants, setTenants] = React.useState<PlatformTenantRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [planFilter, setPlanFilter] = React.useState<string>("");
  const [createCompanyOpen, setCreateCompanyOpen] = React.useState(false);
  const [provisionOpen, setProvisionOpen] = React.useState(false);
  const [refreshingAccess, setRefreshingAccess] = React.useState(false);
  const permissions = useAuthStore((s) => s.permissions);
  const isPlatformOperator = useAuthStore((s) => s.isPlatformOperator);
  const canOwnerManage = permissions.includes("platform.owner.manage");

  React.useEffect(() => {
    const provision = searchParams.get("provision") === "1";
    const create = searchParams.get("create") === "1";
    if (provision) setProvisionOpen(true);
    if (create) setCreateCompanyOpen(true);
  }, [searchParams]);

  React.useEffect(() => {
    if (!isPlatformOperator) return;
    let cancelled = false;
    const refreshPermissions = async () => {
      setRefreshingAccess(true);
      try {
        const session = await fetchRuntimeSession();
        if (cancelled) return;
        useAuthStore.getState().setSession({
          user: session.user,
          org: session.org,
          tenant: session.tenant,
          currentBranch: session.currentBranch,
          branches: session.branches,
          permissions: session.permissions,
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
      } finally {
        if (!cancelled) setRefreshingAccess(false);
      }
    };
    void refreshPermissions();
    return () => {
      cancelled = true;
    };
  }, [isPlatformOperator]);

  React.useEffect(() => {
    let cancelled = false;
    fetchPlatformTenantsApi()
      .then((data) => {
        if (!cancelled) setTenants(data);
      })
      .catch(() => {
        if (!cancelled) setTenants([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    return tenants.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        const companyMatch = (t.primaryOrgName ?? t.orgNames?.join(" ") ?? "").toLowerCase().includes(q);
        if (!t.name.toLowerCase().includes(q) && !(t.slug ?? "").toLowerCase().includes(q) && !companyMatch) return false;
      }
      if (statusFilter && (t.status ?? "ACTIVE") !== statusFilter) return false;
      if (planFilter && (t.plan ?? "ENTERPRISE") !== planFilter) return false;
      return true;
    });
  }, [tenants, search, statusFilter, planFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Provision first organization and first admin here. Use business owner name as tenant name and company name for the org. Customer admins manage teams, franchise setup, and operations in their own workspace.
          </p>
        </div>
        <Button
          onClick={() => setCreateCompanyOpen(true)}
          disabled={!canOwnerManage || refreshingAccess}
        >
          <Plus className="mr-2 h-4 w-4" />
          {refreshingAccess ? "Checking access..." : "Create company"}
        </Button>
      </div>
      {!canOwnerManage && !refreshingAccess ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Owner role required to create customers from platform. Re-login or run platform owner seed to refresh role permissions.
          <Button
            size="sm"
            variant="outline"
            className="ml-3"
            onClick={async () => {
              setRefreshingAccess(true);
              try {
                const session = await fetchRuntimeSession();
                useAuthStore.getState().setSession({
                  user: session.user,
                  org: session.org,
                  tenant: session.tenant,
                  currentBranch: session.currentBranch,
                  branches: session.branches,
                  permissions: session.permissions,
                  isPlatformOperator: session.isPlatformOperator,
                });
              } finally {
                setRefreshingAccess(false);
              }
            }}
          >
            Re-check access
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Filter and search customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by business owner, company, or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All plans</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business owner</TableHead>
                  <TableHead>Company name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Orgs</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/platform/customers/${t.id}`} className="font-medium hover:underline">
                        {t.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.primaryOrgName ?? (t.orgNames?.length ? t.orgNames.join(", ") : "—")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.slug ?? "—"}</TableCell>
                    <TableCell>{t.plan}</TableCell>
                    <TableCell>{t.status}</TableCell>
                    <TableCell>{t.orgCount}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/platform/customers/${t.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              {tenants.length === 0 ? "No tenants yet. Provision a customer to get started." : "No tenants match the filters."}
            </p>
          )}
        </CardContent>
      </Card>

      <CreateCompanySheet
        open={createCompanyOpen}
        onOpenChange={setCreateCompanyOpen}
        onRequestFullAccount={() => setProvisionOpen(true)}
        onSuccess={() => fetchPlatformTenantsApi().then(setTenants)}
      />
      <ProvisionCustomerSheet open={provisionOpen} onOpenChange={setProvisionOpen} onSuccess={() => {
        setProvisionOpen(false);
        fetchPlatformTenantsApi().then(setTenants);
      }} />
    </div>
  );
}
