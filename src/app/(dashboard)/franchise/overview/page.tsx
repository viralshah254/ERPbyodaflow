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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { FranchiseHealthCard } from "@/components/operational/FranchiseHealthCard";
import { fetchFranchiseNetworkSummary, fetchFranchiseOutletWorkspace, fetchNetworkSummaryV2, assignOutletPriceList, type FranchiseNetworkOutletRow } from "@/lib/api/cool-catch";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import { type PriceList } from "@/lib/products/pricing-types";
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
import { Building2, Users, TrendingUp, Clock, Tag, ArrowUpRight, RefreshCw } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type NetworkOutletRow = {
  id: string;
  name: string;
  territory: string | null;
  code: string | null;
  isActive: boolean;
  revenue30d: number;
  orderCount30d: number;
  customerCount: number;
  lastOrderDate: string | null;
  priceListId: string | null;
  priceListName: string | null;
};

type NetworkKpis = {
  totalRevenue30d: number;
  activeOutlets: number;
  totalCustomers: number;
  pendingOrdersValue: number;
};

// ─── KPI Strip ───────────────────────────────────────────────────────────────

function KpiStrip({ kpis, loading }: { kpis: NetworkKpis | null; loading: boolean }) {
  const items = [
    { label: "Network revenue (30d)", value: formatMoney(kpis?.totalRevenue30d ?? 0, "KES"), icon: TrendingUp, color: "text-emerald-500" },
    { label: "Active outlets", value: String(kpis?.activeOutlets ?? 0), icon: Building2, color: "text-blue-500" },
    { label: "Total customers", value: String(kpis?.totalCustomers ?? 0), icon: Users, color: "text-violet-500" },
    { label: "Pending orders value", value: formatMoney(kpis?.pendingOrdersValue ?? 0, "KES"), icon: Clock, color: "text-amber-500" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border-none shadow-sm bg-gradient-to-br from-card to-muted/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon size={16} className={color} />
            </div>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Price list inline assignment cell ───────────────────────────────────────

function PriceListCell({
  outlet,
  priceLists,
  onAssigned,
}: {
  outlet: NetworkOutletRow;
  priceLists: PriceList[];
  onAssigned: (outletId: string, priceListId: string, priceListName: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selected, setSelected] = React.useState(outlet.priceListId ?? "");

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await assignOutletPriceList(outlet.id, selected);
      const pl = priceLists.find((p) => p.id === selected);
      onAssigned(outlet.id, selected, pl?.name ?? selected);
      toast.success(`Price list assigned to ${outlet.name}`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign price list");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm truncate max-w-[120px]">
        {outlet.priceListName ?? <span className="text-muted-foreground italic">None</span>}
      </span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            <Tag size={12} />
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Assign Price List</SheetTitle>
            <SheetDescription>
              Set the price list used when HQ sells to <strong>{outlet.name}</strong>.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label>Price list</Label>
              <Select value={selected || "__none__"} onValueChange={(v) => setSelected(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select price list…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {priceLists.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.name}
                      {pl.parentName ? ` (based on ${pl.parentName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected && (
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {priceLists.find((p) => p.id === selected)?.parentName
                  ? `This list derives prices from ${priceLists.find((p) => p.id === selected)?.parentName} with a ${priceLists.find((p) => p.id === selected)?.markupType === "PERCENT" ? `+${priceLists.find((p) => p.id === selected)?.markupValue}%` : `+${priceLists.find((p) => p.id === selected)?.markupValue} flat`} markup.`
                  : "Standalone price list — prices are set manually."}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !selected}>
              {saving ? "Saving…" : "Assign"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Franchisor network command centre ───────────────────────────────────────

function FranchisorNetworkDashboard() {
  const [outlets, setOutlets] = React.useState<NetworkOutletRow[]>([]);
  const [kpis, setKpis] = React.useState<NetworkKpis | null>(null);
  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [outletStockMap, setOutletStockMap] = React.useState<Map<string, FranchiseNetworkOutletRow>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [summary, pls, networkSummary] = await Promise.all([
        fetchNetworkSummaryV2(),
        fetchPriceListsForUi(),
        fetchFranchiseNetworkSummary().catch(() => null),
      ]);
      setKpis(summary.kpis);
      setOutlets(summary.outlets);
      setPriceLists(pls);
      if (networkSummary?.outlets) {
        setOutletStockMap(new Map(networkSummary.outlets.map((o) => [o.id, o])));
      }
    } catch {
      toast.error("Could not load network data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const filteredOutlets = React.useMemo(
    () =>
      search
        ? outlets.filter(
            (o) =>
              o.name.toLowerCase().includes(search.toLowerCase()) ||
              o.territory?.toLowerCase().includes(search.toLowerCase()) ||
              o.code?.toLowerCase().includes(search.toLowerCase())
          )
        : outlets,
    [outlets, search]
  );

  const handlePriceListAssigned = (outletId: string, priceListId: string, priceListName: string) => {
    setOutlets((prev) =>
      prev.map((o) => (o.id === outletId ? { ...o, priceListId, priceListName } : o))
    );
  };

  const columns = [
    {
      id: "outlet",
      header: "Outlet",
      accessor: (r: NetworkOutletRow) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{r.name}</span>
            {!r.isActive && <Badge variant="secondary">Inactive</Badge>}
          </div>
          {r.code && <p className="text-xs text-muted-foreground">{r.code}</p>}
        </div>
      ),
      sticky: true,
    },
    {
      id: "territory",
      header: "Territory",
      accessor: (r: NetworkOutletRow) => r.territory ?? "—",
    },
    {
      id: "priceList",
      header: "Price List",
      accessor: (r: NetworkOutletRow) => (
        <PriceListCell outlet={r} priceLists={priceLists} onAssigned={handlePriceListAssigned} />
      ),
    },
    {
      id: "revenue",
      header: "Revenue (30d)",
      accessor: (r: NetworkOutletRow) => (
        <span className="font-semibold tabular-nums">{formatMoney(r.revenue30d, "KES")}</span>
      ),
    },
    {
      id: "customers",
      header: "Customers",
      accessor: (r: NetworkOutletRow) => (
        <div className="flex items-center gap-1">
          <Users size={13} className="text-muted-foreground" />
          <span>{r.customerCount}</span>
        </div>
      ),
    },
    {
      id: "lastOrder",
      header: "Last Order",
      accessor: (r: NetworkOutletRow) =>
        r.lastOrderDate ? (
          <span className="text-sm">{r.lastOrderDate}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: NetworkOutletRow) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/franchise/outlets/${r.id}`} className="flex items-center gap-1">
            View <ArrowUpRight size={12} />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Franchise Network"
        description="Command centre: monitor all outlets, assign price lists, and track network performance."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: "Network" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin mr-1" : "mr-1"} />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <Link href="/franchise/vmi">VMI & Replenishment</Link>
            </Button>
            <Button asChild>
              <Link href="/franchise/commission">Commission</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <KpiStrip kpis={kpis} loading={loading} />

        {/* Health cards — top 4 outlets */}
        {outlets.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {outlets.slice(0, 4).map((o) => {
              const stockData = outletStockMap.get(o.id);
              return (
                <FranchiseHealthCard
                  key={o.id}
                  franchiseeId={o.id}
                  franchiseeName={o.name}
                  qtyOnHand={stockData?.totalStockQty ?? 0}
                  skuCount={stockData?.lowStockCount !== undefined ? (stockData.lowStockCount > 0 ? stockData.lowStockCount : o.orderCount30d) : o.orderCount30d}
                  topUpExposure={stockData?.arOverdue ?? 0}
                  openReplenishments={stockData?.lowStockCount ?? 0}
                />
              );
            })}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Outlets</CardTitle>
                <CardDescription>
                  {outlets.length} outlet{outlets.length !== 1 ? "s" : ""} in this network · Click a row to view details
                </CardDescription>
              </div>
              <Input
                placeholder="Search outlets…"
                className="w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                Loading network data…
              </div>
            ) : (
              <DataTable<NetworkOutletRow>
                data={filteredOutlets}
                columns={columns}
                emptyMessage="No outlets found."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

// ─── Franchisee outlet view (unchanged) ───────────────────────────────────────

function FranchiseeOutletOverview() {
  const permissions = useAuthStore((s) => s.permissions);
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const canManageBranches =
    orgRole === "FRANCHISEE" ||
    permissions.includes("settings.branches.write") ||
    permissions.includes("admin.settings");

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [workspace, setWorkspace] = React.useState<Awaited<ReturnType<typeof fetchFranchiseOutletWorkspace>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newCode, setNewCode] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    fetchFranchiseOutletWorkspace()
      .then((w) => setWorkspace(w))
      .catch(() => {});
    fetchBranchesApi()
      .then((b) => setBranches(b))
      .catch(() => toast.error("Could not load branches."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleAddBranch = async () => {
    const name = newName.trim();
    if (!name) { toast.error("Enter a branch name."); return; }
    setSaving(true);
    try {
      await createBranchApi({ name, code: newCode.trim() || undefined });
      toast.success("Branch added.");
      setNewName(""); setNewCode(""); setSheetOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add branch.");
    } finally { setSaving(false); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultBranchApi(id);
      toast.success("Default branch updated.");
      await load();
    } catch { toast.error("Could not set default branch."); }
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
      accessor: (_r: BranchRow) => (
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
                    Create another store or depot for this franchise.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch-name">Name</Label>
                    <Input id="branch-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Kilimani outlet" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-code">Code (optional)</Label>
                    <Input id="branch-code" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. KLM-02" />
                  </div>
                </div>
                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
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
          <OperationalKpiCard title="Sales today" value={formatMoney(workspace?.salesToday ?? 0, "KES")} subtitle="Posted invoices today" href="/sales/invoices" />
          <OperationalKpiCard title="Sales MTD" value={formatMoney(workspace?.monthlySales ?? 0, "KES")} subtitle="Month to date" href="/sales/overview" />
          <OperationalKpiCard title="Open orders" value={workspace?.openSalesOrders ?? 0} subtitle="Sales orders open" href="/sales/orders" />
          <OperationalKpiCard title="Low stock" value={workspace?.lowStockCount ?? 0} subtitle="SKUs below threshold" severity={(workspace?.lowStockCount ?? 0) > 0 ? "warning" : "default"} href="/inventory/stock-levels" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <CardDescription>
              {singleBranch ? "You are on your main branch." : `${branches.length} locations.`}
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
          <CardHeader><CardTitle>Shortcuts</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href="/franchise/outlet">Outlet workspace</Link></Button>
            <Button variant="outline" asChild><Link href="/franchise/commission">Commission</Link></Button>
            <Button variant="outline" asChild><Link href="/inventory/stock-levels">Stock levels</Link></Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FranchiseOverviewPage() {
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const permissions = useAuthStore((s) => s.permissions);

  const isFranchisee = orgRole === "FRANCHISEE";
  const isFranchisor =
    orgRole === "FRANCHISOR" ||
    permissions.includes("franchise.network.read") ||
    permissions.includes("admin.users");

  if (isFranchisee) return <FranchiseeOutletOverview />;
  if (isFranchisor) return <FranchisorNetworkDashboard />;

  return (
    <PageShell>
      <PageHeader
        title="Franchise"
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: "Overview" }]}
      />
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You do not have permission to view franchise data.
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
