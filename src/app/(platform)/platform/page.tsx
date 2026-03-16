"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchPlatformSummaryApi, type PlatformSummary } from "@/lib/api/platform";
import { Users, Building2, UserCheck, LayoutDashboard, HeadphonesIcon } from "lucide-react";

export default function PlatformDashboardPage() {
  const [summary, setSummary] = React.useState<PlatformSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchPlatformSummaryApi()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const totals = summary?.totals ?? { tenants: 0, orgs: 0, users: 0, activeUsers: 0, franchiseMemberships: 0, openSupportCount: 0 };
  const recentTenants = summary?.recentTenants ?? [];
  const tenantStatus = summary?.tenantStatus ?? { ACTIVE: 0, TRIAL: 0, SUSPENDED: 0 };
  const tenantPlans = summary?.tenantPlans ?? { STARTER: 0, PROFESSIONAL: 0, ENTERPRISE: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
          <p className="text-muted-foreground">Manage customers, subscriptions, and monitor ERP usage.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/platform/customers?create=1">Create company</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/platform/customers">View all customers</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.tenants}</div>
            <p className="text-xs text-muted-foreground">
              {tenantStatus.ACTIVE ?? 0} active, {tenantStatus.TRIAL ?? 0} trial, {tenantStatus.SUSPENDED ?? 0} suspended
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.orgs}</div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.users}</div>
            <p className="text-xs text-muted-foreground">{totals.activeUsers} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Plans</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S: {tenantPlans.STARTER ?? 0} · P: {tenantPlans.PROFESSIONAL ?? 0} · E: {tenantPlans.ENTERPRISE ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Starter, Professional, Enterprise</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open support</CardTitle>
            <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.openSupportCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Open or in progress</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent tenants</CardTitle>
          <CardDescription>Latest provisioned customers</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants yet. Provision a customer to get started.</p>
          ) : (
            <ul className="space-y-2">
              {recentTenants.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <Link href={`/platform/customers/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t.plan} · {t.status}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/platform/customers/${t.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
