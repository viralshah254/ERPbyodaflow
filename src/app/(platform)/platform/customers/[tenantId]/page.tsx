"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPlatformTenantDetailApi,
  setPlatformOrgAccessApi,
  updatePlatformTenantApi,
  type PlatformTenantRow,
  type PlatformTenantUserRow,
} from "@/lib/api/platform";
import { isApiConfigured } from "@/lib/api/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

export default function PlatformCustomerDetailPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [tenant, setTenant] = React.useState<PlatformTenantRow | null>(null);
  const [orgs, setOrgs] = React.useState<Array<{ id: string; name: string; orgType: string; orgRole: string; isActive: boolean; userCount?: number }>>([]);
  const [users, setUsers] = React.useState<PlatformTenantUserRow[]>([]);
  const [totalUserCount, setTotalUserCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editPlan, setEditPlan] = React.useState("");
  const [editStatus, setEditStatus] = React.useState("");
  const [updatingOrgId, setUpdatingOrgId] = React.useState<string | null>(null);
  const canOwnerManage = useAuthStore((s) => s.permissions.includes("platform.owner.manage"));

  React.useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    fetchPlatformTenantDetailApi(tenantId)
      .then((data) => {
        if (!cancelled) {
          setTenant(data.tenant);
          setEditPlan(data.tenant.plan);
          setEditStatus(data.tenant.status);
          setOrgs(
            data.orgs.map((o) => ({
              id: o.id,
              name: o.name,
              orgType: o.orgType,
              orgRole: o.orgRole ?? "STANDARD",
              isActive: o.isActive,
              userCount: o.userCount,
            }))
          );
          setUsers(data.users ?? []);
          setTotalUserCount(data.totalUserCount ?? 0);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTenant(null);
          if (!isApiConfigured()) {
            toast.error("Set NEXT_PUBLIC_API_URL to connect to the backend.");
          } else {
            toast.error(err instanceof Error ? err.message : "Failed to load tenant.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const refreshDetail = React.useCallback(async () => {
    if (!tenantId) return;
    await fetchPlatformTenantDetailApi(tenantId).then((data) => {
      setTenant(data.tenant);
      setEditPlan(data.tenant.plan);
      setEditStatus(data.tenant.status);
      setOrgs(
        data.orgs.map((o) => ({
          id: o.id,
          name: o.name,
          orgType: o.orgType,
          orgRole: o.orgRole ?? "STANDARD",
          isActive: o.isActive,
          userCount: o.userCount,
        }))
      );
      setUsers(data.users ?? []);
      setTotalUserCount(data.totalUserCount ?? 0);
    });
  }, [tenantId]);

  const toggleOrgAccess = async (orgId: string, nextActive: boolean) => {
    if (!canOwnerManage) return;
    setUpdatingOrgId(orgId);
    try {
      await setPlatformOrgAccessApi(orgId, nextActive);
      await refreshDetail();
      toast.success(nextActive ? "Organization enabled." : "Organization disabled. Access revoked.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const handleSave = async () => {
    if (!tenantId || !tenant) return;
    setSaving(true);
    try {
      await updatePlatformTenantApi(tenantId, { plan: editPlan, status: editStatus });
      setTenant((t) => (t ? { ...t, plan: editPlan, status: editStatus } : null));
      toast.success("Tenant updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Tenant not found.</p>
        <Button variant="outline" asChild>
          <Link href="/platform/customers">Back to customers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/platform/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business owner</p>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-muted-foreground">
            {tenant.slug ?? tenant.id} · {tenant.plan} · {tenant.status}
            {orgs.length > 0 && ` · ${orgs.length} org${orgs.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact & team</CardTitle>
          <CardDescription>Admin users, credentials, and team size</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organizations</p>
              <p className="text-lg font-semibold">{orgs.length} org{orgs.length !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Team size</p>
              <p className="text-lg font-semibold">{totalUserCount} user{totalUserCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {users.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Users</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.orgName ?? u.orgId}</TableCell>
                      <TableCell>{u.status}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users found for this tenant.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant details</CardTitle>
          <CardDescription>Plan, status, and region</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="STARTER">Starter</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Region: {tenant.region ?? "—"} · Currency: {tenant.currency ?? "—"} · Time zone: {tenant.timeZone ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            Platform provisions only the first organization/admin. Tenant admins manage team structure, franchise setup, and day-to-day operations in their own account.
          </p>
          <Button onClick={() => void handleSave()} disabled={saving}>
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Companies</CardTitle>
            <CardDescription>
            Organizations under this tenant ({orgs.length})
            {totalUserCount > 0 && ` · ${totalUserCount} total user${totalUserCount !== 1 ? "s" : ""}`}
          </CardDescription>
          </div>
          <p className="text-xs text-muted-foreground">Create new orgs inside customer admin</p>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Access control</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{o.orgType}</TableCell>
                    <TableCell>{o.orgRole}</TableCell>
                    <TableCell>{o.userCount ?? 0}</TableCell>
                    <TableCell>{o.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={o.isActive ? "destructive" : "default"}
                        disabled={!canOwnerManage || updatingOrgId === o.id}
                        onClick={() => void toggleOrgAccess(o.id, !o.isActive)}
                      >
                        {o.isActive ? "Disable" : "Enable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/platform/support?tenantId=${tenantId}`}>Customer service</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/platform/billing?tenantId=${tenantId}`}>View billing impact</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customer onboarding checklist</CardTitle>
          <CardDescription>Guide your customer after first provision</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Customer admin signs in with temporary password.</p>
          <p>2. Customer admin changes password at first login.</p>
          <p>3. Customer admin configures teams, franchise setup, and operations in their own workspace.</p>
          <p>4. Any additional org/users created later are linked to billing automatically.</p>
        </CardContent>
      </Card>

    </div>
  );
}
