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
  fetchPlatformOrgsApi,
  fetchPlatformTenantsApi,
  updatePlatformOrgApi,
  updatePlatformTenantApi,
  type PlatformOrgRow,
  type PlatformTenantRow,
} from "@/lib/api/platform";
import { toast } from "sonner";

export default function PlatformSettingsPage() {
  const formatFlags = React.useCallback(
    (flags?: Record<string, boolean>) =>
      Object.entries(flags ?? {})
        .filter(([, value]) => value === true)
        .map(([key]) => key)
        .join(", "),
    []
  );
  const parseFlags = React.useCallback(
    (value: string) =>
      Object.fromEntries(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((key) => [key, true])
      ),
    []
  );
  const [tenants, setTenants] = React.useState<PlatformTenantRow[]>([]);
  const [orgs, setOrgs] = React.useState<PlatformOrgRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [tenantSheetOpen, setTenantSheetOpen] = React.useState(false);
  const [orgSheetOpen, setOrgSheetOpen] = React.useState(false);
  const [editingTenant, setEditingTenant] = React.useState<PlatformTenantRow | null>(null);
  const [editingOrg, setEditingOrg] = React.useState<PlatformOrgRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [tenantForm, setTenantForm] = React.useState({
    edition: "",
    defaultTemplateId: "",
    enabledModules: "",
    featureFlags: "",
    status: "ACTIVE",
  });
  const [orgForm, setOrgForm] = React.useState({
    edition: "",
    templateId: "",
    enabledModules: "",
    featureFlags: "",
    defaultNav: "",
    orgRole: "STANDARD",
    parentOrgId: "",
    franchiseNetworkId: "",
    franchiseCode: "",
    franchiseTerritory: "",
    franchiseStoreFormat: "",
    franchiseManagerName: "",
    franchisePersona: "STANDARD",
    isActive: true,
  });

  const refresh = React.useCallback(async (term?: string) => {
    const [nextTenants, nextOrgs] = await Promise.all([
      fetchPlatformTenantsApi(),
      fetchPlatformOrgsApi(term),
    ]);
    setTenants(nextTenants);
    setOrgs(nextOrgs);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh()
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [refresh]);

  const openTenant = (tenant: PlatformTenantRow) => {
    setEditingTenant(tenant);
    setTenantForm({
      edition: tenant.edition ?? "",
      defaultTemplateId: tenant.defaultTemplateId ?? "",
      enabledModules: tenant.enabledModules.join(", "),
      featureFlags: formatFlags(tenant.featureFlags),
      status: tenant.status,
    });
    setTenantSheetOpen(true);
  };

  const openOrg = (org: PlatformOrgRow) => {
    setEditingOrg(org);
    setOrgForm({
      edition: org.edition ?? "",
      templateId: org.templateId ?? "",
      enabledModules: org.enabledModules.join(", "),
      featureFlags: formatFlags(org.featureFlags),
      defaultNav: org.defaultNav.join(", "),
      orgRole: org.orgRole ?? "STANDARD",
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
        edition: tenantForm.edition,
        defaultTemplateId: tenantForm.defaultTemplateId,
        enabledModules: tenantForm.enabledModules
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        featureFlags: parseFlags(tenantForm.featureFlags),
        status: tenantForm.status,
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

  const submitOrg = async () => {
    if (!editingOrg) return;
    setSaving(true);
    try {
      await updatePlatformOrgApi(editingOrg.id, {
        edition: orgForm.edition,
        templateId: orgForm.templateId,
        enabledModules: orgForm.enabledModules
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        featureFlags: parseFlags(orgForm.featureFlags),
        defaultNav: orgForm.defaultNav
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        orgRole: orgForm.orgRole as "STANDARD" | "FRANCHISOR" | "FRANCHISEE",
        parentOrgId: orgForm.parentOrgId || undefined,
        franchiseNetworkId: orgForm.franchiseNetworkId || undefined,
        franchiseCode: orgForm.franchiseCode || undefined,
        franchiseTerritory: orgForm.franchiseTerritory || undefined,
        franchiseStoreFormat: orgForm.franchiseStoreFormat || undefined,
        franchiseManagerName: orgForm.franchiseManagerName || undefined,
        franchisePersona: orgForm.franchisePersona as "STANDARD" | "LIGHT_ERP",
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

  return (
    <PageShell>
      <PageHeader
        title="Platform control plane"
        description="Manage tenant editions, org entitlements, and backend-driven module rollout."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Platform" },
        ]}
        sticky
        showCommandHint
      />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Resellable ERP controls</CardTitle>
            <CardDescription>
              Tenant defaults define the commercial edition. Each organization can override template and enabled modules.
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="orgs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orgs">Organizations</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
          </TabsList>

          <TabsContent value="orgs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>
                    Override edition, template, and module entitlements per customer org.
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
                  Default plan, edition, and feature surface shared by tenant orgs.
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
                          <p className="text-xs text-muted-foreground">{tenant.edition ?? "default edition"}</p>
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
        </Tabs>
      </div>

      <Sheet open={orgSheetOpen} onOpenChange={setOrgSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit organization</SheetTitle>
            <SheetDescription>Persist org-specific template and module overrides.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
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
              <Input id="org-modules" value={orgForm.enabledModules} onChange={(e) => setOrgForm((prev) => ({ ...prev, enabledModules: e.target.value }))} placeholder="dashboard, inventory, finance" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-flags">Feature flags</Label>
              <Input id="org-flags" value={orgForm.featureFlags} onChange={(e) => setOrgForm((prev) => ({ ...prev, featureFlags: e.target.value }))} placeholder="franchiseLightErp, franchiseNetworkMonitoring" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-nav">Default nav</Label>
              <Input id="org-nav" value={orgForm.defaultNav} onChange={(e) => setOrgForm((prev) => ({ ...prev, defaultNav: e.target.value }))} placeholder="core, docs, franchise, finance, inventory" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-role">Org role</Label>
                <Input id="org-role" value={orgForm.orgRole} onChange={(e) => setOrgForm((prev) => ({ ...prev, orgRole: e.target.value as "STANDARD" | "FRANCHISOR" | "FRANCHISEE" }))} placeholder="STANDARD | FRANCHISOR | FRANCHISEE" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-persona">Franchise persona</Label>
                <Input id="org-persona" value={orgForm.franchisePersona} onChange={(e) => setOrgForm((prev) => ({ ...prev, franchisePersona: e.target.value as "STANDARD" | "LIGHT_ERP" }))} placeholder="STANDARD | LIGHT_ERP" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-parent">Parent org ID</Label>
                <Input id="org-parent" value={orgForm.parentOrgId} onChange={(e) => setOrgForm((prev) => ({ ...prev, parentOrgId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-network">Network ID</Label>
                <Input id="org-network" value={orgForm.franchiseNetworkId} onChange={(e) => setOrgForm((prev) => ({ ...prev, franchiseNetworkId: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-code">Franchise code</Label>
                <Input id="org-code" value={orgForm.franchiseCode} onChange={(e) => setOrgForm((prev) => ({ ...prev, franchiseCode: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-territory">Territory</Label>
                <Input id="org-territory" value={orgForm.franchiseTerritory} onChange={(e) => setOrgForm((prev) => ({ ...prev, franchiseTerritory: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-format">Store format</Label>
                <Input id="org-format" value={orgForm.franchiseStoreFormat} onChange={(e) => setOrgForm((prev) => ({ ...prev, franchiseStoreFormat: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-manager">Manager name</Label>
                <Input id="org-manager" value={orgForm.franchiseManagerName} onChange={(e) => setOrgForm((prev) => ({ ...prev, franchiseManagerName: e.target.value }))} />
              </div>
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

      <Sheet open={tenantSheetOpen} onOpenChange={setTenantSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit tenant</SheetTitle>
            <SheetDescription>Set tenant-level defaults for new and existing orgs.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
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
              <Input id="tenant-modules" value={tenantForm.enabledModules} onChange={(e) => setTenantForm((prev) => ({ ...prev, enabledModules: e.target.value }))} placeholder="dashboard, inventory, finance" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-flags">Feature flags</Label>
              <Input id="tenant-flags" value={tenantForm.featureFlags} onChange={(e) => setTenantForm((prev) => ({ ...prev, featureFlags: e.target.value }))} placeholder="franchiseLightErp, franchiseNetworkMonitoring" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-status">Status</Label>
              <Input id="tenant-status" value={tenantForm.status} onChange={(e) => setTenantForm((prev) => ({ ...prev, status: e.target.value }))} />
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
    </PageShell>
  );
}
