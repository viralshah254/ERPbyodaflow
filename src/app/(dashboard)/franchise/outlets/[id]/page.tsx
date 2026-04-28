"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchOutletSummary,
  fetchOutletCustomers,
  fetchCustomerNetworkHistory,
  assignOutletPriceList,
  fetchOutletStock,
  fetchOutletSummaryRange,
  type OutletSummary,
  type FranchiseCustomerRow,
  type CustomerHistoryItem,
  type OutletStockRow,
  type OutletInvoiceRow,
} from "@/lib/api/cool-catch";
import { fetchInboundOrders, type InboundOrderRow } from "@/lib/api/cool-catch";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import { type PriceList } from "@/lib/products/pricing-types";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Tag,
  ArrowLeft,
  ChevronRight,
  Package,
  Calendar,
  RefreshCw,
  BarChart2,
  Boxes,
} from "lucide-react";

// ─── KPI Cards ───────────────────────────────────────────────────────────────

function OutletKpiCards({ summary, loading }: { summary: OutletSummary | null; loading: boolean }) {
  const items = [
    {
      label: "Revenue (30d)",
      value: formatMoney(summary?.revenue30d ?? 0, "KES"),
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Orders (30d)",
      value: String(summary?.orderCount30d ?? 0),
      icon: ShoppingCart,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Customers",
      value: String(summary?.customerCount ?? 0),
      icon: Users,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Last order",
      value: summary?.lastOrderDate ?? "—",
      icon: Calendar,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            {loading ? (
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl font-bold">{value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Customer history slide-over ─────────────────────────────────────────────

function CustomerHistorySheet({
  customer,
  open,
  onClose,
}: {
  customer: FranchiseCustomerRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = React.useState<CustomerHistoryItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !customer?.networkCustomerId) { setItems([]); return; }
    setLoading(true);
    fetchCustomerNetworkHistory(customer.networkCustomerId)
      .then((r) => setItems(r.items))
      .catch(() => toast.error("Could not load purchase history"))
      .finally(() => setLoading(false));
  }, [open, customer]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users size={16} />
            {customer?.name ?? "Customer"}
          </SheetTitle>
          <SheetDescription>
            Full purchase history across the network
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total spend</p>
              <p className="font-semibold">{formatMoney(customer?.totalSpend ?? 0, "KES")}</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="font-semibold">{customer?.orderCount ?? 0}</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Last order</p>
              <p className="font-semibold text-xs">{customer?.lastPurchaseDate ?? "—"}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No purchase history found.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-start justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.date} · {item.outletName} · {item.docNumber}
                    </p>
                    {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold">{formatMoney(item.amount, "KES")}</p>
                    <p className="text-xs text-muted-foreground">Qty {item.qty} × {formatMoney(item.unitPrice, "KES")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Stock tab ────────────────────────────────────────────────────────────────

function StockTab({ outletOrgId }: { outletOrgId: string }) {
  const [rows, setRows] = React.useState<OutletStockRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    fetchOutletStock(outletOrgId)
      .then((r) => setRows(r.items))
      .catch(() => toast.error("Could not load outlet stock"))
      .finally(() => setLoading(false));
  }, [outletOrgId]);

  const filtered = search.trim()
    ? rows.filter((r) => r.productName.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const columns = [
    { id: "sku", header: "SKU", accessor: (r: OutletStockRow) => <span className="font-mono text-xs">{r.sku}</span> },
    { id: "product", header: "Product", accessor: (r: OutletStockRow) => r.productName },
    { id: "warehouse", header: "Warehouse", accessor: (r: OutletStockRow) => r.warehouseName },
    { id: "qty", header: "On hand", accessor: (r: OutletStockRow) => r.quantity.toLocaleString() },
    { id: "reserved", header: "Reserved", accessor: (r: OutletStockRow) => r.reservedQuantity.toLocaleString() },
    { id: "available", header: "Available", accessor: (r: OutletStockRow) => (
      <span className={r.available <= 0 ? "text-destructive font-medium" : ""}>{r.available.toLocaleString()}</span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search SKU or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground ml-auto">{rows.length} SKU{rows.length !== 1 ? "s" : ""}</span>
      </div>
      <DataTable data={filtered} columns={columns} emptyMessage={loading ? "Loading stock…" : "No stock records for this outlet."} />
    </div>
  );
}

// ─── Sales tab ────────────────────────────────────────────────────────────────

type DatePreset = "today" | "week" | "month" | "custom";

function SalesTab({ outletOrgId }: { outletOrgId: string }) {
  const [preset, setPreset] = React.useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [invoices, setInvoices] = React.useState<OutletInvoiceRow[]>([]);
  const [kpis, setKpis] = React.useState<{ revenue: number; count: number } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const dateRange = React.useMemo(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "today") return { from: fmt(today), to: fmt(today) };
    if (preset === "week") {
      const d = new Date(today); d.setDate(today.getDate() - 6);
      return { from: fmt(d), to: fmt(today) };
    }
    if (preset === "month") {
      const d = new Date(today); d.setDate(today.getDate() - 29);
      return { from: fmt(d), to: fmt(today) };
    }
    return { from: customFrom, to: customTo };
  }, [preset, customFrom, customTo]);

  React.useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    fetchOutletSummaryRange(outletOrgId, dateRange)
      .then((r) => {
        setKpis({ revenue: r.revenue30d, count: r.orderCount30d });
        setInvoices(r.invoices ?? []);
      })
      .catch(() => toast.error("Could not load sales data"))
      .finally(() => setLoading(false));
  }, [outletOrgId, dateRange]);

  const columns = [
    { id: "number", header: "Invoice", accessor: (r: OutletInvoiceRow) => <span className="font-medium">{r.number}</span> },
    { id: "date", header: "Date", accessor: (r: OutletInvoiceRow) => r.date },
    { id: "customer", header: "Customer", accessor: (r: OutletInvoiceRow) => r.customerName ?? "—" },
    { id: "total", header: "Total", accessor: (r: OutletInvoiceRow) => formatMoney(r.total, "KES") },
    { id: "status", header: "Status", accessor: (r: OutletInvoiceRow) => <StatusBadge status={r.status} /> },
  ];

  const presets: Array<{ key: DatePreset; label: string }> = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${preset === p.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
            <span className="text-muted-foreground text-sm">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </>
        )}
      </div>

      {kpis && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Revenue", value: formatMoney(kpis.revenue, "KES") },
            { label: "Invoices", value: String(kpis.count) },
            { label: "Avg order", value: kpis.count > 0 ? formatMoney(kpis.revenue / kpis.count, "KES") : "—" },
          ].map(({ label, value }) => (
            <Card key={label} className="border-none shadow-sm">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-bold">{loading ? <span className="inline-block h-5 w-20 bg-muted animate-pulse rounded" /> : value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DataTable data={invoices} columns={columns} emptyMessage={loading ? "Loading sales…" : "No invoices in this period."} />
    </div>
  );
}

// ─── Orders to HQ tab ─────────────────────────────────────────────────────────

function OrdersToHqTab({ outletOrgId }: { outletOrgId: string }) {
  const [rows, setRows] = React.useState<InboundOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchInboundOrders({ outletOrgId })
      .then((r) => setRows(r.items))
      .catch(() => toast.error("Could not load orders to HQ"))
      .finally(() => setLoading(false));
  }, [outletOrgId]);

  const columns = [
    { id: "number", header: "PR Number", accessor: (r: InboundOrderRow) => <span className="font-medium">{r.number}</span> },
    { id: "date", header: "Date", accessor: (r: InboundOrderRow) => r.date ?? "—" },
    { id: "products", header: "Products", accessor: (r: InboundOrderRow) => (
      <span className="text-xs text-muted-foreground">
        {r.lines.slice(0, 2).map((l) => l.productName ?? l.sku ?? "—").join(", ")}
        {r.lines.length > 2 ? ` +${r.lines.length - 2} more` : ""}
      </span>
    )},
    { id: "total", header: "Total", accessor: (r: InboundOrderRow) => `${r.currency} ${r.total.toLocaleString()}` },
    { id: "status", header: "Status", accessor: (r: InboundOrderRow) => <StatusBadge status={r.status} /> },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      emptyMessage={loading ? "Loading orders…" : "No purchase requests sent to HQ yet."}
    />
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ summary, loading }: { summary: OutletSummary | null; loading: boolean }) {
  return (
    <div className="space-y-6">
      <OutletKpiCards summary={summary} loading={loading} />

      {summary && summary.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={16} />
              Top products (30d)
            </CardTitle>
            <CardDescription>Best-selling products at this outlet by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatMoney(p.totalRevenue, "KES")}</p>
                    <p className="text-xs text-muted-foreground">{p.totalQty} units</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Customers tab ────────────────────────────────────────────────────────────

function CustomersTab({ outletOrgId }: { outletOrgId: string }) {
  const [customers, setCustomers] = React.useState<FranchiseCustomerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selected, setSelected] = React.useState<FranchiseCustomerRow | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    setLoading(true);
    fetchOutletCustomers(outletOrgId, { search: debouncedSearch || undefined })
      .then((r) => setCustomers(r.items))
      .catch(() => toast.error("Could not load customers"))
      .finally(() => setLoading(false));
  }, [outletOrgId, debouncedSearch]);

  const columns = [
    {
      id: "name",
      header: "Customer",
      accessor: (r: FranchiseCustomerRow) => (
        <div>
          <p className="font-medium">{r.name}</p>
          {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
        </div>
      ),
      sticky: true,
    },
    {
      id: "totalSpend",
      header: "Total spend",
      accessor: (r: FranchiseCustomerRow) => formatMoney(r.totalSpend, "KES"),
    },
    { id: "orders", header: "Orders", accessor: (r: FranchiseCustomerRow) => r.orderCount },
    {
      id: "lastOrder",
      header: "Last order",
      accessor: (r: FranchiseCustomerRow) => r.lastPurchaseDate ?? "—",
    },
    {
      id: "history",
      header: "",
      accessor: (r: FranchiseCustomerRow) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSelected(r); setHistoryOpen(true); }}
          disabled={!r.networkCustomerId}
        >
          History <ChevronRight size={12} className="ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{customers.length} customers found</p>
        <Input
          placeholder="Search customers…"
          className="w-48"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading customers…</div>
      ) : (
        <DataTable<FranchiseCustomerRow>
          data={customers}
          columns={columns}
          emptyMessage="No customers found."
        />
      )}
      <CustomerHistorySheet
        customer={selected}
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setSelected(null); }}
      />
    </>
  );
}

// ─── Price List tab ───────────────────────────────────────────────────────────

function PriceListTab({ outletOrgId }: { outletOrgId: string }) {
  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [selected, setSelected] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchPriceListsForUi()
      .then((pls) => setPriceLists(pls))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await assignOutletPriceList(outletOrgId, selected);
      toast.success("Price list assigned successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign price list");
    } finally {
      setSaving(false);
    }
  };

  const chosenList = priceLists.find((pl) => pl.id === selected);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag size={16} />
          Assigned price list
        </CardTitle>
        <CardDescription>
          The price list used when HQ creates a sales order to this outlet. Choose a derived list
          so changes to the master list propagate automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-10 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="space-y-2">
              <Label>Price list</Label>
              <Select value={selected || "__none__"} onValueChange={(v) => setSelected(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select a price list…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {priceLists.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.name}
                      {pl.parentName ? ` ← ${pl.parentName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chosenList?.parentName && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Derived price list</p>
                <p>
                  Based on <strong>{chosenList.parentName}</strong> with a{" "}
                  {chosenList.markupType === "PERCENT"
                    ? `+${chosenList.markupValue}% markup`
                    : `+${formatMoney(chosenList.markupValue ?? 0, "KES")} flat add-on`}
                  . HQ price changes cascade automatically.
                </p>
              </div>
            )}

            {selected && !chosenList?.parentName && (
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Standalone list — prices are set manually.
              </div>
            )}

            <Button onClick={() => void handleAssign()} disabled={saving || !selected}>
              {saving ? "Saving…" : "Save assignment"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OutletDetailPage() {
  const params = useParams();
  const outletOrgId = params.id as string;

  const [summary, setSummary] = React.useState<OutletSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(true);
  const [outletName, setOutletName] = React.useState("Outlet");
  const [refreshing, setRefreshing] = React.useState(false);

  const loadSummary = React.useCallback(async () => {
    try {
      const s = await fetchOutletSummary(outletOrgId);
      setSummary(s);
      if (s.outletName) setOutletName(s.outletName);
    } catch {
      // summary may fail if no permissions — silently degrade
    } finally {
      setLoadingSummary(false);
      setRefreshing(false);
    }
  }, [outletOrgId]);

  React.useEffect(() => { void loadSummary(); }, [loadSummary]);

  const handleRefresh = () => { setRefreshing(true); void loadSummary(); };

  return (
    <PageShell>
      <PageHeader
        title={outletName}
        description="Per-outlet analytics, customers, orders, and price list assignment."
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/overview" },
          { label: "Outlets", href: "/franchise/overview" },
          { label: outletName },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/franchise/overview">
                <ArrowLeft size={14} className="mr-1" /> Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "animate-spin mr-1" : "mr-1"} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="stock" className="gap-1.5">
              <Boxes size={14} />
              Stock
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1.5">
              <BarChart2 size={14} />
              Sales
            </TabsTrigger>
            <TabsTrigger value="orders">Orders to HQ</TabsTrigger>
            <TabsTrigger value="pricelist">Price List</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab summary={summary} loading={loadingSummary} />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="stock">
            <StockTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="sales">
            <SalesTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersToHqTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="pricelist">
            <PriceListTab outletOrgId={outletOrgId} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
