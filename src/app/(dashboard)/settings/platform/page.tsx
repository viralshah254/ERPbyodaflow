"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createPlatformOrgApi,
  createPlatformTenantApi,
  fetchPlatformAuditApi,
  fetchPlatformOrgsApi,
  fetchPlatformSummaryApi,
  fetchPlatformTenantsApi,
  provisionPlatformCustomerApi,
  updatePlatformOrgApi,
  updatePlatformTenantApi,
  type PlatformAuditRow,
  type PlatformOrgRow,
  type PlatformSummary,
  type PlatformTenantRow,
} from "@/lib/api/platform";
import { toast } from "sonner";

type TenantFormState = {
  name: string;
  slug: string;
  plan: string;
  status: string;
  edition: string;
  defaultTemplateId: string;
  enabledModules: string;
  featureFlags: string;
};

type OrgFormState = {
  tenantId: string;
  name: string;
  orgType: string;
  orgRole: string;
  edition: string;
  templateId: string;
  enabledModules: string;
  featureFlags: string;
  defaultNav: string;
  parentOrgId: string;
  franchiseNetworkId: string;
  franchiseCode: string;
  franchiseTerritory: string;
  franchiseStoreFormat: string;
  franchiseManagerName: string;
  franchisePersona: string;
  isActive: boolean;
};

type ProvisionFormState = {
  tenantName: string;
  slug: string;
  plan: string;
  status: string;
  region: string;
  currency: string;
  timeZone: string;
  edition: string;
  defaultTemplateId: string;
  enabledModules: string;
  featureFlags: string;
  defaultNav: string;
  orgName: string;
  orgType: string;
  orgRole: string;
  branchName: string;
  branchCode: string;
  roleName: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
};

const emptyTenantForm = (): TenantFormState => ({
  name: "",
  slug: "",
  plan: "ENTERPRISE",
  status: "ACTIVE",
  edition: "",
  defaultTemplateId: "",
  enabledModules: "",
  featureFlags: "",
});

const emptyOrgForm = (): OrgFormState => ({
  tenantId: "",
  name: "",
  orgType: "DISTRIBUTOR",
  orgRole: "STANDARD",
  edition: "",
  templateId: "",
  enabledModules: "",
  featureFlags: "",
  defaultNav: "",
  parentOrgId: "",
  franchiseNetworkId: "",
  franchiseCode: "",
  franchiseTerritory: "",
  franchiseStoreFormat: "",
  franchiseManagerName: "",
  franchisePersona: "STANDARD",
  isActive: true,
});

const emptyProvisionForm = (): ProvisionFormState => ({
  tenantName: "",
  slug: "",
  plan: "ENTERPRISE",
  status: "ACTIVE",
  region: "KE",
  currency: "KES",
  timeZone: "Africa/Nairobi",
  edition: "",
  defaultTemplateId: "",
  enabledModules: "dashboard, docs, inventory, sales, purchasing, finance, reports, settings",
  featureFlags: "",
  defaultNav: "core, docs, inventory, sales, purchasing, finance, reports, settings",
  orgName: "",
  orgType: "DISTRIBUTOR",
  orgRole: "STANDARD",
  branchName: "Main Branch",
  branchCode: "MAIN",
  roleName: "Owner",
  adminEmail: "",
  adminFirstName: "",
  adminLastName: "",
});

function formatFlags(flags?: Record<string, boolean>): string {
  return Object.entries(flags ?? {})
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .join(", ");
}

function parseFlags(value: string): Record<string, boolean> {
  return Object.fromEntries(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((key) => [key, true])
  );
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PlatformSettingsPage() {
  const [summary, setSummary] = React.useState<PlatformSummary | null>(null);
  const [auditRows, setAuditRows] = React.useState<PlatformAuditRow[]>([]);
  const [tenants, setTenants] = React.useState<PlatformTenantRow[]>([]);
  const [orgs, setOrgs] = React.useState<PlatformOrgRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [tenantSheetOpen, setTenantSheetOpen] = React.useState(false);
  const [createTenantSheetOpen, setCreateTenantSheetOpen] = React.useState(false);
  const [orgSheetOpen, setOrgSheetOpen] = React.useState(false);
  const [createOrgSheetOpen, setCreateOrgSheetOpen] = React.useState(false);
  const [provisionSheetOpen, setProvisionSheetOpen] = React.useState(false);

  const [editingTenant, setEditingTenant] = React.useState<PlatformTenantRow | null>(null);
  const [editingOrg, setEditingOrg] = React.useState<PlatformOrgRow | null>(null);

  const [tenantForm, setTenantForm] = React.useState<TenantFormState>(emptyTenantForm);
  const [createTenantForm, setCreateTenantForm] = React.useState<TenantFormState>(emptyTenantForm);
  const [orgForm, setOrgForm] = React.useState<OrgFormState>(emptyOrgForm);
  const [createOrgForm, setCreateOrgForm] = React.useState<OrgFormState>(emptyOrgForm);
  const [provisionForm, setProvisionForm] = React.useState<ProvisionFormState>(emptyProvisionForm);
  const [lastProvisionResult, setLastProvisionResult] = React.useState<{
    adminEmail: string;
    initialPassword?: string;
    tenantId: string;
    orgId: string;
  } | null>(null);

  const refresh = React.useCallback(
    async (term?: string) => {
      const [nextSummary, nextAudit, nextTenants, nextOrgs] = await Promise.all([
        fetchPlatformSummaryApi(),
        fetchPlatformAuditApi(20),
        fetchPlatformTenantsApi(),
        fetchPlatformOrgsApi(term),
      ]);
      setSummary(nextSummary);
      setAuditRows(nextAudit);
      setTenants(nextTenants);
      setOrgs(nextOrgs);
    },
    []
  );

  React.useEffect(() => {
    setLoading(true);
    refresh()
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [refresh]);

  const openTenant = (tenant: PlatformTenantRow) => {
    setEditingTenant(tenant);
    setTenantForm({
      name: tenant.name,
      slug: tenant.slug ?? "",
      plan: tenant.plan,
      status: tenant.status,
      edition: tenant.edition ?? "",
      defaultTemplateId: tenant.defaultTemplateId ?? "",
      enabledModules: tenant.enabledModules.join(", "),
      featureFlags: formatFlags(tenant.featureFlags),
    });
    setTenantSheetOpen(true);
  };

  const openOrg = (org: PlatformOrgRow) => {
    setEditingOrg(org);
    setOrgForm({
      tenantId: org.tenantId,
      name: org.name,
      orgType: org.orgType,
      orgRole: org.orgRole ?? "STANDARD",
      edition: org.edition ?? "",
      templateId: org.templateId ?? "",
      enabledModules: org.enabledModules.join(", "),
      featureFlags: formatFlags(org.featureFlags),
      defaultNav: org.defaultNav.join(", "),
      parentOrgId: org.parentOrgId ?? "",
      franchiseNetworkId: org.franchiseNetworkId ?? "",
      franchiseCode: org.franchiseCode ?? "",
      franchiseTerritory: org.franchiseTerritory ?? "",
      franchiseStoreFormat: org.franchiseStoreFormat ?? "",
      franchiseManagerName: org.franchiseManagerName ?? "",
      franchisePersona: org.franchisePersona ?? "STANDARD",
      isActive: org.isActive,
    });
    setOrgSheetOpen(true);
  };

  const submitTenant = async () => {
    if (!editingTenant) return;
    setSaving(true);
    try {
      await updatePlatformTenantApi(editingTenant.id, {
        name: tenantForm.name,
        slug: tenantForm.slug || undefined,
        plan: tenantForm.plan,
        status: tenantForm.status,
        edition: tenantForm.edition || undefined,
        defaultTemplateId: tenantForm.defaultTemplateId || undefined,
        enabledModules: parseList(tenantForm.enabledModules),
        featureFlags: parseFlags(tenantForm.featureFlags),
      });
      await refresh(search);
      setTenantSheetOpen(false);
      toast.success("Tenant updated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitCreateTenant = async () => {
    setSaving(true);
    try {
      await createPlatformTenantApi({
        name: createTenantForm.name,
        slug: createTenantForm.slug || undefined,
        plan: createTenantForm.plan,
        status: createTenantForm.status,
        edition: createTenantForm.edition || undefined,
        defaultTemplateId: createTenantForm.defaultTemplateId || undefined,
        enabledModules: parseList(createTenantForm.enabledModules),
        featureFlags: parseFlags(createTenantForm.featureFlags),
      });
      await refresh(search);
      setCreateTenantSheetOpen(false);
      setCreateTenantForm(emptyTenantForm());
      toast.success("Tenant created.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitOrg = async () => {
    if (!editingOrg) return;
    setSaving(true);
    try {
      await updatePlatformOrgApi(editingOrg.id, {
        name: orgForm.name,
        orgType: orgForm.orgType,
        orgRole: orgForm.orgRole as PlatformOrgRow["orgRole"],
        edition: orgForm.edition || undefined,
        templateId: orgForm.templateId || undefined,
        enabledModules: parseList(orgForm.enabledModules),
        featureFlags: parseFlags(orgForm.featureFlags),
        defaultNav: parseList(orgForm.defaultNav),
        parentOrgId: orgForm.parentOrgId || undefined,
        franchiseNetworkId: orgForm.franchiseNetworkId || undefined,
        franchiseCode: orgForm.franchiseCode || undefined,
        franchiseTerritory: orgForm.franchiseTerritory || undefined,
        franchiseStoreFormat: orgForm.franchiseStoreFormat || undefined,
        franchiseManagerName: orgForm.franchiseManagerName || undefined,
        franchisePersona: orgForm.franchisePersona as PlatformOrgRow["franchisePersona"],
        isActive: orgForm.isActive,
      });
      await refresh(search);
      setOrgSheetOpen(false);
      toast.success("Organization updated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitCreateOrg = async () => {
    setSaving(true);
    try {
      await createPlatformOrgApi({
        tenantId: createOrgForm.tenantId,
        name: createOrgForm.name,
        orgType: createOrgForm.orgType,
        orgRole: createOrgForm.orgRole as PlatformOrgRow["orgRole"],
        edition: createOrgForm.edition || undefined,
        templateId: createOrgForm.templateId || undefined,
        enabledModules: parseList(createOrgForm.enabledModules),
        featureFlags: parseFlags(createOrgForm.featureFlags),
        defaultNav: parseList(createOrgForm.defaultNav),
        parentOrgId: createOrgForm.parentOrgId || undefined,
        franchiseNetworkId: createOrgForm.franchiseNetworkId || undefined,
        franchiseCode: createOrgForm.franchiseCode || undefined,
        franchiseTerritory: createOrgForm.franchiseTerritory || undefined,
        franchiseStoreFormat: createOrgForm.franchiseStoreFormat || undefined,
        franchiseManagerName: createOrgForm.franchiseManagerName || undefined,
        franchisePersona: createOrgForm.franchisePersona as PlatformOrgRow["franchisePersona"],
        isActive: createOrgForm.isActive,
      });
      await refresh(search);
      setCreateOrgSheetOpen(false);
      setCreateOrgForm(emptyOrgForm());
      toast.success("Organization created.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitProvision = async () => {
    setSaving(true);
    try {
      const result = await provisionPlatformCustomerApi({
        tenantName: provisionForm.tenantName,
        slug: provisionForm.slug || undefined,
        plan: provisionForm.plan,
        status: provisionForm.status,
        region: provisionForm.region,
        currency: provisionForm.currency,
        timeZone: provisionForm.timeZone,
        edition: provisionForm.edition || undefined,
        defaultTemplateId: provisionForm.defaultTemplateId || undefined,
        enabledModules: parseList(provisionForm.enabledModules),
        featureFlags: parseFlags(provisionForm.featureFlags),
        defaultNav: parseList(provisionForm.defaultNav),
        orgName: provisionForm.orgName,
        orgType: provisionForm.orgType,
        orgRole: provisionForm.orgRole as PlatformOrgRow["orgRole"],
        branchName: provisionForm.branchName,
        branchCode: provisionForm.branchCode,
        roleName: provisionForm.roleName,
        adminEmail: provisionForm.adminEmail,
        adminFirstName: provisionForm.adminFirstName || undefined,
        adminLastName: provisionForm.adminLastName || undefined,
      });
      setLastProvisionResult({
        adminEmail: result.adminEmail,
        initialPassword: result.initialPassword,
        tenantId: result.tenantId,
        orgId: result.orgId,
      });
      await refresh(search);
      setProvisionSheetOpen(false);
      toast.success("Customer provisioned.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Platform control plane"
        description="Operate every ERP customer from one internal console: provisioning, commercial state, entitlements, and audit."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Platform" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateTenantSheetOpen(true)}>
              New tenant
            </Button>
            <Button variant="outline" onClick={() => setCreateOrgSheetOpen(true)}>
              New org
            </Button>
            <Button onClick={() => setProvisionSheetOpen(true)}>Provision customer</Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        {lastProvisionResult ? (
          <Card>
            <CardHeader>
              <CardTitle>Latest provisioned customer</CardTitle>
              <CardDescription>
                Share credentials out of band and require first-login password rotation.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>
                Admin: <span className="font-medium">{lastProvisionResult.adminEmail}</span>
              </p>
              <p>
                Tenant ID: <span className="font-mono">{lastProvisionResult.tenantId}</span>
              </p>
              <p>
                Org ID: <span className="font-mono">{lastProvisionResult.orgId}</span>
              </p>
              <p>
                Temporary password:{" "}
                <span className="font-mono">
                  {lastProvisionResult.initialPassword ?? "Firebase not configured"}
                </span>
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orgs">Organizations</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="audit">Platform audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Tenants</CardDescription>
                  <CardTitle>{summary?.totals.tenants ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Organizations</CardDescription>
                  <CardTitle>{summary?.totals.orgs ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Users</CardDescription>
                  <CardTitle>{summary?.totals.users ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active users</CardDescription>
                  <CardTitle>{summary?.totals.activeUsers ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Franchise memberships</CardDescription>
                  <CardTitle>{summary?.totals.franchiseMemberships ?? 0}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Commercial mix</CardTitle>
                  <CardDescription>What platform owners should monitor commercially.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {Object.entries(summary?.tenantPlans ?? {}).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <span>{plan}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk state</CardTitle>
                  <CardDescription>Trial and suspension exposure across customers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {Object.entries(summary?.tenantStatus ?? {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span>{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Org topology</CardTitle>
                  <CardDescription>Standard, franchisor, and franchisee distribution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {Object.entries(summary?.orgRoles ?? {}).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span>{role}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent tenants</CardTitle>
                  <CardDescription>Newest customers added to the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(summary?.recentTenants ?? []).map((tenant) => (
                    <div key={tenant.id} className="rounded border p-3 text-sm">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-muted-foreground">
                        {tenant.plan} · {tenant.status}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent platform activity</CardTitle>
                  <CardDescription>Internal control-plane events across customers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {auditRows.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="rounded border p-3 text-sm">
                      <div className="font-medium">{entry.what}</div>
                      <div className="text-muted-foreground">
                        {entry.entityType} · {entry.entityId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.when).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orgs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>
                    Review and override template, entitlements, and franchise structure per customer org.
                  </CardDescription>
                </div>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onBlur={() => void refresh(search)}
                  placeholder="Search organizations"
                  className="max-w-xs"
                />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Modules</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && orgs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>Loading organizations...</TableCell>
                      </TableRow>
                    ) : null}
                    {orgs.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">
                          {org.name}
                          <p className="text-xs text-muted-foreground">
                            {org.isActive ? "Active" : "Inactive"} · {org.edition ?? "default"}
                          </p>
                        </TableCell>
                        <TableCell>{org.tenantName ?? org.tenantId}</TableCell>
                        <TableCell>
                          {org.orgType}
                          <p className="text-xs text-muted-foreground">{org.orgRole ?? "STANDARD"}</p>
                        </TableCell>
                        <TableCell>{org.templateId ?? "default"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {org.enabledModules.join(", ")}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => openOrg(org)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tenants">
            <Card>
              <CardHeader>
                <CardTitle>Tenants</CardTitle>
                <CardDescription>
                  Monitor plan, suspension risk, default edition, and rollout surface by customer account.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Default template</TableHead>
                      <TableHead>Org count</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && tenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>Loading tenants...</TableCell>
                      </TableRow>
                    ) : null}
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">
                          {tenant.name}
                          <p className="text-xs text-muted-foreground">
                            {tenant.edition ?? "default edition"}
                          </p>
                        </TableCell>
                        <TableCell>{tenant.plan}</TableCell>
                        <TableCell>{tenant.status}</TableCell>
                        <TableCell>{tenant.defaultTemplateId ?? "default"}</TableCell>
                        <TableCell>{tenant.orgCount}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => openTenant(tenant)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Platform audit trail</CardTitle>
                <CardDescription>
                  Every internal control-plane action should be visible here for support and compliance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.what}</TableCell>
                        <TableCell>
                          {row.entityType}
                          <p className="text-xs text-muted-foreground">{row.entityId}</p>
                        </TableCell>
                        <TableCell>{row.who}</TableCell>
                        <TableCell>{new Date(row.when).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={tenantSheetOpen} onOpenChange={setTenantSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit tenant</SheetTitle>
            <SheetDescription>Set tenant-level defaults for commercial and entitlement control.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Tenant name</Label>
              <Input id="tenant-name" value={tenantForm.name} onChange={(e) => setTenantForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input id="tenant-slug" value={tenantForm.slug} onChange={(e) => setTenantForm((prev) => ({ ...prev, slug: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenant-plan">Plan</Label>
                <Input id="tenant-plan" value={tenantForm.plan} onChange={(e) => setTenantForm((prev) => ({ ...prev, plan: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-status">Status</Label>
                <Input id="tenant-status" value={tenantForm.status} onChange={(e) => setTenantForm((prev) => ({ ...prev, status: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-edition">Edition</Label>
              <Input id="tenant-edition" value={tenantForm.edition} onChange={(e) => setTenantForm((prev) => ({ ...prev, edition: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-template">Default template ID</Label>
              <Input id="tenant-template" value={tenantForm.defaultTemplateId} onChange={(e) => setTenantForm((prev) => ({ ...prev, defaultTemplateId: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-modules">Enabled modules</Label>
              <Input id="tenant-modules" value={tenantForm.enabledModules} onChange={(e) => setTenantForm((prev) => ({ ...prev, enabledModules: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-flags">Feature flags</Label>
              <Input id="tenant-flags" value={tenantForm.featureFlags} onChange={(e) => setTenantForm((prev) => ({ ...prev, featureFlags: e.target.value }))} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setTenantSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitTenant()} disabled={saving}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={createTenantSheetOpen} onOpenChange={setCreateTenantSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create tenant</SheetTitle>
            <SheetDescription>Register a customer account before attaching organizations.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-tenant-name">Tenant name</Label>
              <Input id="create-tenant-name" value={createTenantForm.name} onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tenant-slug">Slug</Label>
              <Input id="create-tenant-slug" value={createTenantForm.slug} onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, slug: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-tenant-plan">Plan</Label>
                <Input id="create-tenant-plan" value={createTenantForm.plan} onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, plan: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tenant-status">Status</Label>
                <Input id="create-tenant-status" value={createTenantForm.status} onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, status: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tenant-edition">Edition</Label>
              <Input id="create-tenant-edition" value={createTenantForm.edition} onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, edition: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tenant-template">Default template ID</Label>
              <Input id="create-tenant-template" value={createTenantForm.defaultTemplateId} onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, defaultTemplateId: e.target.value }))} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateTenantSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreateTenant()} disabled={saving}>
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={orgSheetOpen} onOpenChange={setOrgSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit organization</SheetTitle>
            <SheetDescription>Persist org-specific template and module overrides.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input id="org-name" value={orgForm.name} onChange={(e) => setOrgForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-type">Org type</Label>
                <Input id="org-type" value={orgForm.orgType} onChange={(e) => setOrgForm((prev) => ({ ...prev, orgType: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-role">Org role</Label>
                <Input id="org-role" value={orgForm.orgRole} onChange={(e) => setOrgForm((prev) => ({ ...prev, orgRole: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-edition">Edition</Label>
              <Input id="org-edition" value={orgForm.edition} onChange={(e) => setOrgForm((prev) => ({ ...prev, edition: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-template">Template ID</Label>
              <Input id="org-template" value={orgForm.templateId} onChange={(e) => setOrgForm((prev) => ({ ...prev, templateId: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-modules">Enabled modules</Label>
              <Input id="org-modules" value={orgForm.enabledModules} onChange={(e) => setOrgForm((prev) => ({ ...prev, enabledModules: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-flags">Feature flags</Label>
              <Input id="org-flags" value={orgForm.featureFlags} onChange={(e) => setOrgForm((prev) => ({ ...prev, featureFlags: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-nav">Default nav</Label>
              <Input id="org-nav" value={orgForm.defaultNav} onChange={(e) => setOrgForm((prev) => ({ ...prev, defaultNav: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-persona">Franchise persona</Label>
              <Input id="org-persona" value={orgForm.franchisePersona} onChange={(e) => setOrgForm((prev) => ({ ...prev, franchisePersona: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="org-active"
                checked={orgForm.isActive}
                onCheckedChange={(value) => setOrgForm((prev) => ({ ...prev, isActive: value === true }))}
              />
              <Label htmlFor="org-active">Organization active</Label>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOrgSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitOrg()} disabled={saving}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={createOrgSheetOpen} onOpenChange={setCreateOrgSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create organization</SheetTitle>
            <SheetDescription>Add an organization to an existing tenant.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-org-tenant">Tenant ID</Label>
              <Input id="create-org-tenant" value={createOrgForm.tenantId} onChange={(e) => setCreateOrgForm((prev) => ({ ...prev, tenantId: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-org-name">Organization name</Label>
              <Input id="create-org-name" value={createOrgForm.name} onChange={(e) => setCreateOrgForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-org-type">Org type</Label>
                <Input id="create-org-type" value={createOrgForm.orgType} onChange={(e) => setCreateOrgForm((prev) => ({ ...prev, orgType: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-org-role">Org role</Label>
                <Input id="create-org-role" value={createOrgForm.orgRole} onChange={(e) => setCreateOrgForm((prev) => ({ ...prev, orgRole: e.target.value }))} />
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOrgSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreateOrg()} disabled={saving}>
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={provisionSheetOpen} onOpenChange={setProvisionSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Provision customer</SheetTitle>
            <SheetDescription>
              Create tenant, org, branch, owner role, owner user, and Firebase credentials in one flow.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prov-tenant-name">Tenant name</Label>
                <Input id="prov-tenant-name" value={provisionForm.tenantName} onChange={(e) => setProvisionForm((prev) => ({ ...prev, tenantName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov-slug">Slug</Label>
                <Input id="prov-slug" value={provisionForm.slug} onChange={(e) => setProvisionForm((prev) => ({ ...prev, slug: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prov-plan">Plan</Label>
                <Input id="prov-plan" value={provisionForm.plan} onChange={(e) => setProvisionForm((prev) => ({ ...prev, plan: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov-status">Status</Label>
                <Input id="prov-status" value={provisionForm.status} onChange={(e) => setProvisionForm((prev) => ({ ...prev, status: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-org-name">Organization name</Label>
              <Input id="prov-org-name" value={provisionForm.orgName} onChange={(e) => setProvisionForm((prev) => ({ ...prev, orgName: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prov-org-type">Org type</Label>
                <Input id="prov-org-type" value={provisionForm.orgType} onChange={(e) => setProvisionForm((prev) => ({ ...prev, orgType: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov-org-role">Org role</Label>
                <Input id="prov-org-role" value={provisionForm.orgRole} onChange={(e) => setProvisionForm((prev) => ({ ...prev, orgRole: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prov-email">Admin email</Label>
                <Input id="prov-email" value={provisionForm.adminEmail} onChange={(e) => setProvisionForm((prev) => ({ ...prev, adminEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov-role-name">Role name</Label>
                <Input id="prov-role-name" value={provisionForm.roleName} onChange={(e) => setProvisionForm((prev) => ({ ...prev, roleName: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prov-first-name">Admin first name</Label>
                <Input id="prov-first-name" value={provisionForm.adminFirstName} onChange={(e) => setProvisionForm((prev) => ({ ...prev, adminFirstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov-last-name">Admin last name</Label>
                <Input id="prov-last-name" value={provisionForm.adminLastName} onChange={(e) => setProvisionForm((prev) => ({ ...prev, adminLastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prov-branch-name">Branch name</Label>
                <Input id="prov-branch-name" value={provisionForm.branchName} onChange={(e) => setProvisionForm((prev) => ({ ...prev, branchName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov-branch-code">Branch code</Label>
                <Input id="prov-branch-code" value={provisionForm.branchCode} onChange={(e) => setProvisionForm((prev) => ({ ...prev, branchCode: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-modules">Enabled modules</Label>
              <Input id="prov-modules" value={provisionForm.enabledModules} onChange={(e) => setProvisionForm((prev) => ({ ...prev, enabledModules: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-flags">Feature flags</Label>
              <Input id="prov-flags" value={provisionForm.featureFlags} onChange={(e) => setProvisionForm((prev) => ({ ...prev, featureFlags: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-nav">Default nav</Label>
              <Input id="prov-nav" value={provisionForm.defaultNav} onChange={(e) => setProvisionForm((prev) => ({ ...prev, defaultNav: e.target.value }))} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setProvisionSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitProvision()} disabled={saving}>
              Provision
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
