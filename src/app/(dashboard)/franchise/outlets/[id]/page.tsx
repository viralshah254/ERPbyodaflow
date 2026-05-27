"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  fetchOutletStock,
  fetchOutletStockTakes,
  fetchOutletSummaryRange,
  fetchOutletInvoiceDetail,
  updateOutletGeoApi,
  type OutletSummary,
  type FranchiseCustomerRow,
  type CustomerHistoryItem,
  type OutletStockRow,
  type OutletStockTakeRow,
  type OutletInvoiceRow,
  type OutletInvoiceDetail,
  type OutletInvoiceLineDetailRow,
} from "@/lib/api/cool-catch";
import { fetchOutletEquipmentApi } from "@/lib/api/assets";
import type { AssetRow } from "@/lib/types/assets";
import { fetchInboundOrders, type InboundOrderRow } from "@/lib/api/cool-catch";
import { OutletPricingTab } from "@/components/franchise/outlet-pricing-tab";
import { OutletEconomicsVmiTab } from "@/components/franchise/outlet-economics-vmi-tab";
import { fetchFranchiseNetworkOutletById } from "@/lib/api/cool-catch";
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
  Receipt,
  Boxes,
  Cpu,
  MapPin,
  Settings2,
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
  const [latestTake, setLatestTake] = React.useState<OutletStockTakeRow | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRows([]);
    fetchOutletStock(outletOrgId)
      .then((stockRes) => {
        if (!cancelled) setRows(stockRes.items ?? []);
      })
      .catch(() => toast.error("Could not load outlet stock"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetchOutletStockTakes(outletOrgId)
      .then((takes) => {
        if (!cancelled) {
          const submitted = takes.filter((t) => t.status === "SUBMITTED");
          setLatestTake(submitted[0] ?? null);
        }
      })
      .catch(() => {
        /* Last count column is optional; HQ stock table should still render. */
        if (!cancelled) setLatestTake(null);
      });

    return () => {
      cancelled = true;
    };
  }, [outletOrgId]);

  // Build map of productId → latest counted qty from the most recent submitted take.
  const lastCountByProduct = React.useMemo(() => {
    if (!latestTake) return new Map<string, number>();
    return new Map(latestTake.lines.map((l) => [l.productId, l.countedQty]));
  }, [latestTake]);

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
    {
      id: "lastCount",
      header: latestTake ? `Last count (${latestTake.weekStart})` : "Last count",
      accessor: (r: OutletStockRow) => {
        const counted = lastCountByProduct.get(r.productId);
        if (counted == null) return <span className="text-muted-foreground">—</span>;
        const diff = counted - r.quantity;
        return (
          <span className="flex items-center gap-1.5">
            <span>{counted.toLocaleString()}</span>
            {diff !== 0 && (
              <span className={`text-xs ${diff < 0 ? "text-red-500" : "text-amber-500"}`}>
                {diff > 0 ? `+${diff}` : diff}
              </span>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {latestTake && (
        <div className="flex items-center gap-2 text-xs rounded-md border border-emerald-500/25 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="h-3.5 w-3.5 shrink-0" />
          Stock take submitted for week of <span className="font-medium">{latestTake.weekStart}</span>
          {latestTake.submittedAt ? ` on ${new Date(latestTake.submittedAt).toLocaleDateString()}` : ""}. Last count column shows counted vs current system quantity.
        </div>
      )}
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

function CheckCircle2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─── Receipts tab ─────────────────────────────────────────────────────────────

type DatePreset = "today" | "week" | "month" | "custom";

function ReceiptsTab({ outletOrgId }: { outletOrgId: string }) {
  const [preset, setPreset] = React.useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [invoices, setInvoices] = React.useState<OutletInvoiceRow[]>([]);
  const [kpis, setKpis] = React.useState<{ revenue: number; count: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [overridesOnly, setOverridesOnly] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<OutletInvoiceDetail | null>(null);

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
      .catch(() => toast.error("Could not load receipts"))
      .finally(() => setLoading(false));
  }, [outletOrgId, dateRange]);

  const visibleInvoices = React.useMemo(
    () => (overridesOnly ? invoices.filter((r) => r.hasRetailOverride) : invoices),
    [invoices, overridesOnly],
  );

  const openReceipt = (row: OutletInvoiceRow) => {
    setDetail(null);
    setSheetOpen(true);
    setDetailLoading(true);
    fetchOutletInvoiceDetail(outletOrgId, row.id)
      .then(setDetail)
      .catch(() => toast.error("Could not load receipt lines"))
      .finally(() => setDetailLoading(false));
  };

  const columns = [
    { id: "number", header: "Receipt", accessor: (r: OutletInvoiceRow) => <span className="font-medium">{r.number}</span> },
    { id: "date", header: "Date", accessor: (r: OutletInvoiceRow) => r.date },
    { id: "customer", header: "Customer", accessor: (r: OutletInvoiceRow) => r.customerName ?? "—" },
    {
      id: "variance",
      header: "",
      accessor: (r: OutletInvoiceRow) =>
        r.hasRetailOverride ? (
          <Badge variant="secondary" className="font-normal whitespace-nowrap">
            Price variance
          </Badge>
        ) : null,
    },
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
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
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

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={overridesOnly} onCheckedChange={(v) => setOverridesOnly(v === true)} />
            <span className="text-sm text-muted-foreground">Overrides only</span>
          </label>
          <span className="text-xs text-muted-foreground">Click a row for line breakdown.</span>
        </div>

        {kpis && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Revenue", value: formatMoney(kpis.revenue, "KES") },
              { label: "Receipts", value: String(kpis.count) },
              { label: "Avg receipt", value: kpis.count > 0 ? formatMoney(kpis.revenue / kpis.count, "KES") : "—" },
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

        <DataTable
          data={visibleInvoices}
          columns={columns}
          onRowClick={openReceipt}
          emptyMessage={loading ? "Loading receipts…" : "No receipts in this period."}
        />
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setDetail(null);
        }}
      >
        <SheetContent side="right" className="w-full max-w-3xl overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{detail?.number ?? "Receipt"}</SheetTitle>
            <SheetDescription>
              {detail
                ? `${detail.date ?? "—"} · ${formatMoney(detail.total, detail.currency ?? "KES")} · ${detail.customerName ?? "Customer —"}`
                : "Outlet receipt lines"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {detailLoading && <div className="text-sm text-muted-foreground">Loading lines…</div>}
            {!detailLoading && detail && (
              <>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                  <StatusBadge status={detail.status} />
                  {detail.retailPaymentMethod && <span>{detail.retailPaymentMethod}</span>}
                  {detail.retailMpesaRef && (
                    <span className="font-mono truncate max-w-full">M-Pesa ref: {detail.retailMpesaRef}</span>
                  )}
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium whitespace-nowrap">SKU</th>
                        <th className="text-left px-3 py-2 font-medium">Product</th>
                        <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Qty</th>
                        <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Ref unit</th>
                        <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Sold</th>
                        <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Total</th>
                        <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.lines.map((l: OutletInvoiceLineDetailRow) => (
                        <tr key={`${detail.id}:${l.lineNo}`} className="border-b border-border/50 last:border-none">
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{l.sku ?? "—"}</td>
                          <td className="px-3 py-2 max-w-[180px] truncate" title={l.productName ?? ""}>
                            {l.productName ?? "—"}
                          </td>
                          <td className="text-right px-2 py-2 tabular-nums">{l.quantity}</td>
                          <td className="text-right px-2 py-2 tabular-nums">
                            {l.referenceUnitPrice != null ? formatMoney(l.referenceUnitPrice, detail.currency ?? "KES") : "—"}
                          </td>
                          <td className="text-right px-2 py-2 tabular-nums font-medium">{formatMoney(l.unitPrice, detail.currency ?? "KES")}</td>
                          <td className="text-right px-2 py-2 tabular-nums">{formatMoney(l.amount, detail.currency ?? "KES")}</td>
                          <td className={`text-right px-3 py-2 tabular-nums font-medium ${l.delta > 0.01 ? "text-emerald-600" : l.delta < -0.01 ? "text-destructive" : "text-muted-foreground"}`}>
                            {formatMoney(l.delta, detail.currency ?? "KES")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Δ is (sold unit − reference unit) × quantity. Reference is HQ ladder default or POS snapshot at posting.
                </p>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Orders to HQ tab ─────────────────────────────────────────────────────────

function OrdersToHqTab({ outletOrgId }: { outletOrgId: string }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<InboundOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchInboundOrders({ outletOrgId, includeHistorical: true })
      .then((r) => setRows(r.items))
      .catch(() => toast.error("Could not load orders to HQ"))
      .finally(() => setLoading(false));
  }, [outletOrgId]);

  const inboundPrDetailHref = React.useCallback(
    (r: InboundOrderRow) =>
      `/sales/orders/franchise-inbound/${encodeURIComponent(outletOrgId)}/${encodeURIComponent(r.id)}`,
    [outletOrgId]
  );

  const columns = [
    {
      id: "number",
      header: "PR Number",
      accessor: (r: InboundOrderRow) => (
        <span className="font-medium text-primary">{r.number}</span>
      ),
    },
    { id: "date", header: "Date", accessor: (r: InboundOrderRow) => r.date ?? "—" },
    {
      id: "hqSo",
      header: "HQ Sales order",
      accessor: (r: InboundOrderRow) =>
        r.linkedHqSalesOrder ? (
          <span onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/docs/sales-order/${encodeURIComponent(r.linkedHqSalesOrder.id)}`}
              className="font-mono text-sm text-primary hover:underline"
            >
              {r.linkedHqSalesOrder.number}
            </Link>
            <span className="ml-2 text-xs text-muted-foreground">({r.linkedHqSalesOrder.status})</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "products",
      header: "Products",
      accessor: (r: InboundOrderRow) => (
        <span className="text-xs text-muted-foreground">
          {r.lines.slice(0, 2).map((l) => l.productName ?? l.sku ?? "—").join(", ")}
          {r.lines.length > 2 ? ` +${r.lines.length - 2} more` : ""}
        </span>
      ),
    },
    {
      id: "total",
      header: "Total",
      accessor: (r: InboundOrderRow) => `${r.currency} ${Number(r.total ?? 0).toLocaleString()}`,
    },
    { id: "status", header: "Status", accessor: (r: InboundOrderRow) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Purchase requests raised by this outlet. Open the linked HQ sales order to see fulfilment, delivery, and invoicing. Rows without an SO yet open the inbound review screen.
      </p>
      <DataTable
        data={rows}
        columns={columns}
        onRowClick={(r) => {
          if (r.linkedHqSalesOrder?.id) {
            router.push(`/docs/sales-order/${encodeURIComponent(r.linkedHqSalesOrder.id)}`);
          } else {
            router.push(inboundPrDetailHref(r));
          }
        }}
        emptyMessage={loading ? "Loading orders…" : "No purchase requests sent to HQ yet."}
      />
    </div>
  );
}

// ─── Equipment (HQ-owned assets in custody) ──────────────────────────────────

function EquipmentTab({ outletOrgId }: { outletOrgId: string }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<AssetRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchOutletEquipmentApi(outletOrgId)
      .then((r) => setRows(r))
      .catch(() => toast.error("Could not load equipment"))
      .finally(() => setLoading(false));
  }, [outletOrgId]);

  const columns = [
    { id: "code", header: "Code", accessor: (r: AssetRow) => <span className="font-medium">{r.code}</span> },
    { id: "name", header: "Name", accessor: (r: AssetRow) => r.name },
    { id: "category", header: "Category", accessor: (r: AssetRow) => r.category },
    {
      id: "nbv",
      header: "Book (net)",
      accessor: (r: AssetRow) =>
        formatMoney(Math.max(0, r.cost - (r.accumulatedDepreciation ?? 0)), "KES"),
    },
    {
      id: "tag",
      header: "Tag",
      accessor: (r: AssetRow) => (
        <span className="text-xs font-mono text-muted-foreground">{r.assetTag ?? r.serialNumber ?? "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Fixed assets assigned to this outlet for custody. Ownership stays with HQ; depreciation posts on the parent company books.
      </p>
      <DataTable
        data={rows}
        columns={columns}
        onRowClick={(r) => router.push(`/assets/register/${r.id}`)}
        emptyMessage={loading ? "Loading equipment…" : "No HQ assets currently assigned to this outlet."}
      />
    </div>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Geo Settings Tab ─────────────────────────────────────────────────────────

function GeoSettingsTab({
  outletOrgId,
  initialLat,
  initialLng,
}: {
  outletOrgId: string;
  initialLat?: number;
  initialLng?: number;
}) {
  const [lat, setLat] = React.useState(initialLat != null ? String(initialLat) : "");
  const [lng, setLng] = React.useState(initialLng != null ? String(initialLng) : "");
  const [saving, setSaving] = React.useState(false);

  // Sync if parent reloads
  React.useEffect(() => {
    setLat(initialLat != null ? String(initialLat) : "");
    setLng(initialLng != null ? String(initialLng) : "");
  }, [initialLat, initialLng]);

  const handleSave = async () => {
    const parsedLat = lat.trim() !== "" ? parseFloat(lat) : null;
    const parsedLng = lng.trim() !== "" ? parseFloat(lng) : null;
    if (parsedLat !== null && (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
      toast.error("Latitude must be between -90 and 90.");
      return;
    }
    if (parsedLng !== null && (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
      toast.error("Longitude must be between -180 and 180.");
      return;
    }
    setSaving(true);
    try {
      await updateOutletGeoApi(outletOrgId, { latitude: parsedLat, longitude: parsedLng });
      toast.success("GPS coordinates saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save GPS coordinates.");
    } finally {
      setSaving(false);
    }
  };

  const hasCoords = lat.trim() !== "" && lng.trim() !== "";
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin size={16} />
          GPS coordinates
        </CardTitle>
        <CardDescription>
          Used for nearest-outlet routing in WhatsApp commerce. When a retail customer shares their location,
          the system finds the closest outlet with valid coordinates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="geo-lat">Latitude</Label>
            <Input
              id="geo-lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="-1.286389"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="geo-lng">Longitude</Label>
            <Input
              id="geo-lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="36.817223"
            />
          </div>
        </div>
        {mapsUrl && (
          <p className="text-xs text-muted-foreground">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
              <MapPin size={11} /> View on Google Maps
            </a>
          </p>
        )}
        <div>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save coordinates"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OutletDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const outletOrgId = params.id as string;
  const defaultTab = searchParams.get("tab") ?? "overview";

  const [summary, setSummary] = React.useState<OutletSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(true);
  const [outletName, setOutletName] = React.useState("Outlet");
  const [refreshing, setRefreshing] = React.useState(false);
  const [outletLat, setOutletLat] = React.useState<number | undefined>(undefined);
  const [outletLng, setOutletLng] = React.useState<number | undefined>(undefined);
  const [franchiseeRegistryId, setFranchiseeRegistryId] = React.useState<string | null>(null);

  const loadSummary = React.useCallback(async () => {
    try {
      const [s, networkRow] = await Promise.allSettled([
        fetchOutletSummary(outletOrgId),
        fetchFranchiseNetworkOutletById(outletOrgId),
      ]);
      if (s.status === "fulfilled") {
        setSummary(s.value);
        if (s.value.outletName) setOutletName(s.value.outletName);
      }
      if (networkRow.status === "fulfilled" && networkRow.value) {
        setOutletLat(networkRow.value.latitude);
        setOutletLng(networkRow.value.longitude);
        setFranchiseeRegistryId(networkRow.value.franchiseeRegistryId ?? null);
      }
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
        description="Per-outlet analytics, customers, pricing, VMI, and operations."
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/network/overview" },
          { label: "Outlets", href: "/franchise/network/outlets" },
          { label: outletName },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/franchise/network/outlets">
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
        <Tabs defaultValue={defaultTab} key={defaultTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="stock" className="gap-1.5">
              <Boxes size={14} />
              Stock
            </TabsTrigger>
            <TabsTrigger value="receipts" className="gap-1.5">
              <Receipt size={14} />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="orders">Orders to HQ</TabsTrigger>
            <TabsTrigger value="equipment" className="gap-1.5">
              <Cpu size={14} />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5">
              <Tag size={14} />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="vmi">Economics & VMI</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 size={14} />
              Settings
            </TabsTrigger>
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

          <TabsContent value="receipts">
            <ReceiptsTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersToHqTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="equipment">
            <EquipmentTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="pricing">
            <OutletPricingTab
              outletOrgId={outletOrgId}
              assignedPriceListId={summary?.priceListId ?? null}
              assignedZoneId={summary?.zoneId ?? null}
              assignedZoneName={summary?.zoneName ?? null}
              franchiseeRegistryId={franchiseeRegistryId}
              onAssigned={() => void loadSummary()}
            />
          </TabsContent>

          <TabsContent value="vmi">
            <OutletEconomicsVmiTab outletOrgId={outletOrgId} />
          </TabsContent>

          <TabsContent value="settings">
            <GeoSettingsTab outletOrgId={outletOrgId} initialLat={outletLat} initialLng={outletLng} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
