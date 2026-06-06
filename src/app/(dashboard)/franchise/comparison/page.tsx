"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { SegmentMixCard } from "@/components/operational/SegmentMixCard";
import {
  fetchFranchiseNetworkOutlets,
  fetchFranchiseNetworkPerformance,
  type FranchiseNetworkPerformance,
  type FranchisePerformanceGroupBy,
} from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";
import { RefreshCw } from "lucide-react";

type DatePreset = "today" | "7d" | "30d" | "mtd" | "custom";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForPreset(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const to = toIsoDate(now);
  if (preset === "today") return { from: to, to };
  if (preset === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: toIsoDate(from), to };
  }
  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: toIsoDate(from), to };
  }
  if (preset === "mtd") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toIsoDate(from), to };
  }
  return { from: to, to };
}

function formatGrowth(pct: number | null | undefined): { value: string; direction: "up" | "down" | "flat" } {
  if (pct == null || Number.isNaN(pct)) return { value: "—", direction: "flat" };
  const sign = pct > 0 ? "+" : "";
  return {
    value: `${sign}${pct.toFixed(1)}%`,
    direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat",
  };
}

function aggregateSeriesByPeriod(
  series: FranchiseNetworkPerformance["series"]
): Array<{ period: string; revenue: number; whatsapp: number; normal: number }> {
  const map = new Map<string, { revenue: number; whatsapp: number; normal: number }>();
  const wa = new Set(["WHATSAPP", "COOLCATCH_WA"]);
  for (const row of series) {
    if (!map.has(row.period)) map.set(row.period, { revenue: 0, whatsapp: 0, normal: 0 });
    const bucket = map.get(row.period)!;
    bucket.revenue += row.revenue;
    if (wa.has(row.channel)) bucket.whatsapp += row.revenue;
    else bucket.normal += row.revenue;
  }
  return [...map.entries()]
    .map(([period, v]) => ({ period, ...v }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export default function FranchisePerformanceHubPage() {
  const [preset, setPreset] = React.useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [outletOrgId, setOutletOrgId] = React.useState<string>("all");
  const [groupBy, setGroupBy] = React.useState<FranchisePerformanceGroupBy>("day");
  const [outletOptions, setOutletOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [data, setData] = React.useState<FranchiseNetworkPerformance | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [stockSearch, setStockSearch] = React.useState("");

  const dateRange = React.useMemo(() => {
    if (preset === "custom" && customFrom && customTo) return { from: customFrom, to: customTo };
    return rangeForPreset(preset);
  }, [preset, customFrom, customTo]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFranchiseNetworkPerformance({
        from: dateRange.from,
        to: dateRange.to,
        outletOrgId: outletOrgId === "all" ? undefined : outletOrgId,
        groupBy,
      });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to, outletOrgId, groupBy]);

  React.useEffect(() => {
    let cancelled = false;
    fetchFranchiseNetworkOutlets()
      .then((items) => {
        if (!cancelled) {
          setOutletOptions(items.map((o) => ({ id: o.id, name: o.name })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const growthTrend = formatGrowth(data?.kpis.revenueGrowthPct);
  const seriesByPeriod = React.useMemo(
    () => (data ? aggregateSeriesByPeriod(data.series) : []),
    [data]
  );
  const maxSeriesRevenue = Math.max(1, ...seriesByPeriod.map((s) => s.revenue));

  const filteredStockProducts = React.useMemo(() => {
    if (!data) return [];
    const q = stockSearch.trim().toLowerCase();
    if (!q) return data.stockByProduct;
    return data.stockByProduct.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.productId.toLowerCase().includes(q)
    );
  }, [data, stockSearch]);

  const comparisonColumns = [
    {
      id: "name",
      header: "Franchisee",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => r.outletName,
      sticky: true,
    },
    {
      id: "territory",
      header: "Territory",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => r.territory ?? "—",
    },
    {
      id: "sales",
      header: "Posted sales",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        formatMoney(r.postedRevenue, "KES"),
    },
    {
      id: "growth",
      header: "Growth",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => {
        const g = formatGrowth(r.revenueGrowthPct);
        return <span className={g.direction === "up" ? "text-emerald-600" : g.direction === "down" ? "text-rose-600" : ""}>{g.value}</span>;
      },
    },
    {
      id: "wa",
      header: "WhatsApp",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        formatMoney(r.whatsappRevenue, "KES"),
    },
    {
      id: "waShare",
      header: "WA share",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        `${r.whatsappSharePct.toFixed(0)}%`,
    },
    {
      id: "stock",
      header: "Stock qty",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => r.totalStockQty,
    },
    {
      id: "risk",
      header: "Stock risk",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => r.lowStockCount,
    },
    {
      id: "ar",
      header: "AR overdue",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        formatMoney(r.arOverdue, "KES"),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/franchise/outlets/${r.outletOrgId}`}>Open</Link>
        </Button>
      ),
    },
  ];

  const channelColumns = [
    {
      id: "outlet",
      header: "Outlet",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => r.outletName,
    },
    {
      id: "revenue",
      header: "Posted sales",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        formatMoney(r.postedRevenue, "KES"),
    },
    {
      id: "orders",
      header: "Orders",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) => r.postedOrderCount,
    },
    {
      id: "wa",
      header: "WhatsApp",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        formatMoney(r.whatsappRevenue, "KES"),
    },
    {
      id: "normal",
      header: "Normal",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        formatMoney(r.normalRevenue, "KES"),
    },
    {
      id: "growth",
      header: "Growth",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        formatGrowth(r.revenueGrowthPct).value,
    },
    {
      id: "share",
      header: "WA share",
      accessor: (r: FranchiseNetworkPerformance["outlets"][number]) =>
        `${r.whatsappSharePct.toFixed(0)}%`,
    },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Franchise Performance Hub"
        description="Track outlet sales, WhatsApp order mix, stock position, and growth across the network."
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/overview" },
          { label: "Performance Hub" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              {data
                ? `${data.from} → ${data.to} · vs ${data.previousFrom} → ${data.previousTo}`
                : "Select a date range and optional outlet filter."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="mtd">Month to date</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <Select value={outletOrgId} onValueChange={setOutletOrgId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All franchises" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All franchises</SelectItem>
                  {outletOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Trend granularity</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as FranchisePerformanceGroupBy)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="channels">Sales Channels</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 outline-none">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <OperationalKpiCard
                title="Total Sales"
                value={loading ? "…" : formatMoney(data?.kpis.postedRevenue ?? 0, "KES")}
                subtitle="Posted invoices in period"
                trend={growthTrend}
                severity="default"
              />
              <OperationalKpiCard
                title="WhatsApp Sales"
                value={loading ? "…" : formatMoney(data?.kpis.whatsappRevenue ?? 0, "KES")}
                subtitle={`${data?.kpis.whatsappOrderCount ?? 0} orders`}
              />
              <OperationalKpiCard
                title="Normal Sales"
                value={loading ? "…" : formatMoney(data?.kpis.normalRevenue ?? 0, "KES")}
                subtitle={`${data?.kpis.normalOrderCount ?? 0} orders`}
              />
              <OperationalKpiCard
                title="Network Stock"
                value={loading ? "…" : (data?.kpis.totalStockQty ?? 0).toLocaleString()}
                unit="units"
                subtitle="Current on-hand (all outlets)"
              />
              <OperationalKpiCard
                title="Growth vs Previous Period"
                value={loading ? "…" : growthTrend.value}
                subtitle={
                  data
                    ? `Prior window ${data.previousFrom} → ${data.previousTo}`
                    : "Same-length prior period"
                }
                trend={growthTrend}
                severity={
                  growthTrend.direction === "down"
                    ? "danger"
                    : growthTrend.direction === "up"
                      ? "success"
                      : "default"
                }
              />
              <OperationalKpiCard
                title="Stock Risk"
                value={loading ? "…" : String(data?.kpis.stockRiskOutlets ?? 0)}
                subtitle={`${data?.kpis.lowStockSkus ?? 0} low-stock SKUs`}
                severity={(data?.kpis.stockRiskOutlets ?? 0) > 0 ? "warning" : "default"}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SegmentMixCard
                title="Sales channel mix"
                description="Posted invoice revenue by channel."
                unit="KES"
                items={(data?.channels ?? []).slice(0, 6).map((ch, index) => ({
                  label: ch.label,
                  value: ch.revenue,
                  accentClassName: [
                    "bg-emerald-500",
                    "bg-sky-500",
                    "bg-violet-500",
                    "bg-amber-500",
                    "bg-rose-500",
                    "bg-slate-400",
                  ][index] ?? "bg-primary",
                }))}
              />
              <SegmentMixCard
                title="Stock by outlet"
                description="Network stock concentration."
                unit="units"
                items={(data?.stockByOutlet ?? []).slice(0, 5).map((row, index) => ({
                  label: row.outletName,
                  value: row.totalStockQty,
                  accentClassName: [
                    "bg-primary",
                    "bg-sky-500",
                    "bg-emerald-500",
                    "bg-amber-500",
                    "bg-rose-500",
                  ][index] ?? "bg-primary",
                }))}
              />
            </div>

            {data && data.kpis.salesOrderCount > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Order intake (not yet invoiced)</CardTitle>
                  <CardDescription>
                    Sales orders in period — includes WhatsApp demand before posting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {formatMoney(data.kpis.salesOrderRevenue, "KES")} across {data.kpis.salesOrderCount}{" "}
                  sales orders
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="channels" className="space-y-6 outline-none">
            <div className="grid gap-4 sm:grid-cols-2">
              <OperationalKpiCard
                title="WhatsApp Sales"
                value={loading ? "…" : formatMoney(data?.kpis.whatsappRevenue ?? 0, "KES")}
                subtitle="WhatsApp + Coolcatch WA channels"
              />
              <OperationalKpiCard
                title="Normal Sales"
                value={loading ? "…" : formatMoney(data?.kpis.normalRevenue ?? 0, "KES")}
                subtitle="POS, web, manual, and unknown"
              />
            </div>

            <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Channel breakdown</h3>
            <p className="text-xs text-muted-foreground">Posted invoice revenue by order channel.</p>
          </div>
          {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : (
                  <DataTable
                    data={data?.channels ?? []}
                    columns={[
                      { id: "label", header: "Channel", accessor: (r) => r.label },
                      {
                        id: "revenue",
                        header: "Revenue",
                        accessor: (r) => formatMoney(r.revenue, "KES"),
                      },
                      { id: "orders", header: "Orders", accessor: (r) => r.orderCount },
                      {
                        id: "share",
                        header: "Share",
                        accessor: (r) => `${r.sharePct.toFixed(1)}%`,
                      },
                    ]}
                    emptyMessage="No channel data for this period."
                    scrollMode="natural"
                    size="comfortable"
                    />
                )}
        </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily sales trend</CardTitle>
                <CardDescription>Posted revenue by {groupBy} — WhatsApp vs normal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Loading trend…</div>
                ) : seriesByPeriod.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales in this period.</p>
                ) : (
                  seriesByPeriod.map((row) => (
                    <div key={row.period} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{row.period}</span>
                        <span>{formatMoney(row.revenue, "KES")}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${(row.whatsapp / maxSeriesRevenue) * 100}%` }}
                        />
                        <div
                          className="bg-sky-500 h-full"
                          style={{ width: `${(row.normal / maxSeriesRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
                <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    WhatsApp
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
                    Normal
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Outlets by channel performance</h3>
            <p className="text-xs text-muted-foreground">Sortable outlet view for the selected period.</p>
          </div>
          <DataTable
                  data={data?.outlets ?? []}
                  columns={channelColumns}
                  emptyMessage="No outlet sales in this period."
                  scrollMode="natural"
                  size="comfortable"
                  />
        </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-6 outline-none">
            <div className="grid gap-4 sm:grid-cols-2">
              <OperationalKpiCard
                title="Network Stock"
                value={loading ? "…" : (data?.kpis.totalStockQty ?? 0).toLocaleString()}
                unit="units"
              />
              <OperationalKpiCard
                title="Stock Risk"
                value={loading ? "…" : String(data?.kpis.lowStockSkus ?? 0)}
                subtitle="SKUs at or below 10 units"
                severity={(data?.kpis.lowStockSkus ?? 0) > 0 ? "warning" : "default"}
              />
            </div>

            <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Stock by outlet</h3>
            <p className="text-xs text-muted-foreground">Current network stock position.</p>
          </div>
          <DataTable
                  data={data?.stockByOutlet ?? []}
                  columns={[
                    { id: "name", header: "Outlet", accessor: (r) => r.outletName },
                    { id: "qty", header: "Qty", accessor: (r) => r.totalStockQty },
                    { id: "risk", header: "Low-stock SKUs", accessor: (r) => r.lowStockCount },
                    {
                      id: "share",
                      header: "Network share",
                      accessor: (r) => `${r.sharePct.toFixed(1)}%`,
                    },
                  ]}
                  emptyMessage="No stock data."
                  scrollMode="natural"
                  size="comfortable"
                  />
        </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Stock by product</CardTitle>
                  <CardDescription>Filter by SKU or product name.</CardDescription>
                </div>
                <Input
                  placeholder="Search SKU or product…"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="max-w-xs"
                />
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  data={filteredStockProducts}
                  columns={[
                    { id: "sku", header: "SKU", accessor: (r) => r.sku },
                    { id: "name", header: "Product", accessor: (r) => r.productName },
                    { id: "qty", header: "Total qty", accessor: (r) => r.totalQty },
                    { id: "avail", header: "Available", accessor: (r) => r.totalAvailable },
                    { id: "outlets", header: "Outlets", accessor: (r) => r.outletCount },
                  ]}
                  emptyMessage="No products match your search."
                  scrollMode="natural"
                  size="comfortable"
                  />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6 outline-none">
            <SegmentMixCard
              title="Sales mix (top outlets)"
              description="Posted sales share for the selected period."
              unit="KES"
              items={(data?.outlets ?? []).slice(0, 5).map((row, index) => ({
                label: row.outletName,
                value: row.postedRevenue,
                accentClassName: [
                  "bg-primary",
                  "bg-sky-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-rose-500",
                ][index] ?? "bg-primary",
              }))}
            />
            <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Outlet comparison</h3>
            <p className="text-xs text-muted-foreground">Sales, WhatsApp mix, stock, growth, and receivables for {dateRange.from} →{" "}
                  {dateRange.to}.</p>
          </div>
          {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : (
                  <DataTable
                    data={data?.outlets ?? []}
                    columns={comparisonColumns}
                    emptyMessage="No comparison data for this period."
                    scrollMode="natural"
                    size="comfortable"
                    />
                )}
        </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
