"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { FranchiseHealthCard } from "@/components/operational/FranchiseHealthCard";
import { fetchFranchiseNetworkSummary, fetchFranchiseOutletWorkspace } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import {
  fetchBranchesApi,
  createBranchApi,
  setDefaultBranchApi,
  type BranchRow,
} from "@/lib/api/branches";
import { toast } from "sonner";

type FranchiseOverviewRow = {
  franchiseeId: string;
  franchiseeName: string;
  territory?: string;
  storeFormat?: string;
  qtyOnHand: number;
  lowStockCount: number;
  invoiceCount: number;
  revenue: number;
  arOverdue: number;
};

function FranchiseeOutletOverview() {
  const permissions = useAuthStore((s) => s.permissions);
  const canManageBranches =
    permissions.includes("settings.branches.write") || permissions.includes("admin.settings");

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [workspace, setWorkspace] = React.useState<Awaited<ReturnType<typeof fetchFranchiseOutletWorkspace>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newCode, setNewCode] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([fetchBranchesApi(), fetchFranchiseOutletWorkspace()])
      .then(([b, w]) => {
        setBranches(b);
        setWorkspace(w);
      })
      .catch(() => {
        toast.error("Could not load outlet overview.");
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleAddBranch = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a branch name.");
      return;
    }
    setSaving(true);
    try {
      await createBranchApi({ name, code: newCode.trim() || undefined });
      toast.success("Branch added.");
      setNewName("");
      setNewCode("");
      setSheetOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add branch.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultBranchApi(id);
      toast.success("Default branch updated.");
      await load();
    } catch {
      toast.error("Could not set default branch.");
    }
  };

  const branchColumns = [
    {
      id: "name",
      header: "Location",
      accessor: (r: BranchRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.name}</span>
          {r.isDefault ? <Badge variant="secondary">Main</Badge> : null}
        </div>
      ),
      sticky: true,
    },
    { id: "code", header: "Code", accessor: (r: BranchRow) => r.code ?? "—" },
    {
      id: "order",
      header: "Order stock",
      accessor: (r: BranchRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href="/docs/purchase-order/new">Order from HQ</Link>
        </Button>
      ),
    },
    {
      id: "default",
      header: "",
      accessor: (r: BranchRow) =>
        !r.isDefault && canManageBranches ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => void handleSetDefault(r.id)}>
            Set as main
          </Button>
        ) : null,
    },
  ];

  const singleBranch = branches.length <= 1;

  return (
    <PageShell>
      <PageHeader
        title="Your locations"
        description={
          singleBranch
            ? "This outlet uses one main branch. Add more locations to run multiple sites under the same franchise org."
            : "Manage branches, switch the active branch in the header, and order stock from HQ per location."
        }
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: "Overview" }]}
        sticky
        showCommandHint
        actions={
          canManageBranches ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button>Add branch</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Add branch</SheetTitle>
                  <SheetDescription>
                    Create another store or depot for this franchise. Use the branch selector in the top bar to work in that location.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch-name">Name</Label>
                    <Input
                      id="branch-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Kilimani outlet"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-code">Code (optional)</Label>
                    <Input
                      id="branch-code"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="e.g. KLM-02"
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void handleAddBranch()} disabled={saving}>
                    {saving ? "Saving…" : "Create branch"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ) : null
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard
            title="Sales today"
            value={formatMoney(workspace?.salesToday ?? 0, "KES")}
            subtitle="Posted invoices today"
            href="/sales/invoices"
          />
          <OperationalKpiCard
            title="Sales MTD"
            value={formatMoney(workspace?.monthlySales ?? 0, "KES")}
            subtitle="Month to date"
            href="/sales/overview"
          />
          <OperationalKpiCard
            title="Open orders"
            value={workspace?.openSalesOrders ?? 0}
            subtitle="Sales orders open"
            href="/sales/orders"
          />
          <OperationalKpiCard
            title="Low stock"
            value={workspace?.lowStockCount ?? 0}
            subtitle="SKUs below threshold"
            severity={(workspace?.lowStockCount ?? 0) > 0 ? "warning" : "default"}
            href="/inventory/stock-levels"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <CardDescription>
              {singleBranch
                ? "You are on your main branch. Add more branches to manage multiple locations."
                : `${branches.length} locations. Switch branch in the header to order and stock per site.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading branches…</div>
            ) : (
              <DataTable<BranchRow> data={branches} columns={branchColumns} emptyMessage="No branches found." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shortcuts</CardTitle>
            <CardDescription>Common tasks for this outlet.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/franchise/outlet">Outlet workspace</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/franchise/commission">Commission</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/stock-levels">Stock levels</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export default function FranchiseOverviewPage() {
  const [rows, setRows] = React.useState<FranchiseOverviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const permissions = useAuthStore((s) => s.permissions);
  const orgRole = useOrgContextStore((s) => s.orgRole);

  const isFranchisee = orgRole === "FRANCHISEE";

  const canViewFranchisor =
    orgRole === "FRANCHISOR" ||
    permissions.includes("franchise.network.read") ||
    permissions.includes("franchise.analytics.read") ||
    permissions.includes("admin.users");

  React.useEffect(() => {
    if (isFranchisee || !canViewFranchisor) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchFranchiseNetworkSummary()
      .then((summary) => {
        if (cancelled) return;
        setRows(
          summary.outlets.map((outlet) => ({
            franchiseeId: outlet.id,
            franchiseeName: outlet.name,
            territory: outlet.territory,
            storeFormat: outlet.storeFormat,
            qtyOnHand: outlet.totalStockQty,
            lowStockCount: outlet.lowStockCount,
            invoiceCount: outlet.invoiceCount,
            revenue: outlet.revenue,
            arOverdue: outlet.arOverdue,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isFranchisee, canViewFranchisor]);

  const columns = [
    {
      id: "franchisee",
      header: "Franchisee",
      accessor: (r: FranchiseOverviewRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.franchiseeName}</span>
          {r.storeFormat ? <Badge variant="secondary">{r.storeFormat}</Badge> : null}
        </div>
      ),
      sticky: true,
    },
    { id: "territory", header: "Territory", accessor: (r: FranchiseOverviewRow) => r.territory ?? "—" },
    { id: "qty", header: "Qty on hand", accessor: (r: FranchiseOverviewRow) => r.qtyOnHand },
    { id: "lowStock", header: "Low stock alerts", accessor: (r: FranchiseOverviewRow) => r.lowStockCount },
    { id: "invoiceCount", header: "Invoices", accessor: (r: FranchiseOverviewRow) => r.invoiceCount },
    { id: "revenue", header: "Revenue", accessor: (r: FranchiseOverviewRow) => formatMoney(r.revenue, "KES") },
    { id: "arOverdue", header: "AR overdue", accessor: (r: FranchiseOverviewRow) => formatMoney(r.arOverdue, "KES") },
    {
      id: "actions",
      header: "",
      accessor: (r: FranchiseOverviewRow) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/franchise/${r.franchiseeId}`}>View</Link>
        </Button>
      ),
    },
  ];

  if (isFranchisee) {
    return <FranchiseeOutletOverview />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Franchise Overview"
        description="Health, replenishment pressure, commission and top-up exposure by franchise."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: "Overview" }]}
        sticky
        showCommandHint
        actions={
          canViewFranchisor ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/franchise/vmi">VMI & Replenishment</Link>
              </Button>
              <Button asChild>
                <Link href="/franchise/commission">Commission & Rebates</Link>
              </Button>
            </div>
          ) : null
        }
      />
      <div className="space-y-6 p-6">
        {!canViewFranchisor ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              You do not have permission to view franchise overview data.
            </CardContent>
          </Card>
        ) : null}
        {canViewFranchisor ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OperationalKpiCard
              title="Franchisees Visible"
              value={rows.length}
              subtitle="Network entities in current dataset"
              href="/franchise/comparison"
            />
            <OperationalKpiCard
              title="Low Stock Exposure"
              value={rows.reduce((a, r) => a + (r.lowStockCount > 0 ? 1 : 0), 0)}
              subtitle="Franchisees needing replenishment"
              severity="warning"
              href="/franchise/vmi"
            />
            <OperationalKpiCard
              title="Network Revenue"
              value={formatMoney(rows.reduce((a, r) => a + r.revenue, 0), "KES")}
              subtitle="Posted outlet invoices"
              href="/analytics/explore"
            />
            <OperationalKpiCard
              title="AR Overdue"
              value={formatMoney(rows.reduce((a, r) => a + r.arOverdue, 0), "KES")}
              subtitle="Collections pressure across outlets"
              severity="danger"
              href="/treasury/collections"
            />
          </div>
        ) : null}

        {canViewFranchisor ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.slice(0, 4).map((row) => (
              <FranchiseHealthCard
                key={row.franchiseeId}
                franchiseeId={row.franchiseeId}
                franchiseeName={row.franchiseeName}
                qtyOnHand={row.qtyOnHand}
                skuCount={row.invoiceCount}
                topUpExposure={row.arOverdue}
                openReplenishments={row.lowStockCount}
              />
            ))}
          </div>
        ) : null}

        {canViewFranchisor ? (
          <Card>
            <CardHeader>
              <CardTitle>Network health</CardTitle>
              <CardDescription>Operational visibility for parent company team.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading franchise overview…</div>
              ) : (
                <DataTable<FranchiseOverviewRow> data={rows} columns={columns} emptyMessage="No franchise data available." />
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
