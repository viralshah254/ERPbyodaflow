"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ReplenishmentSuggestionCard } from "@/components/operational/ReplenishmentSuggestionCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchVMISuggestions,
  fetchVMIReplenishmentOrders,
  fetchFranchiseeStock,
  confirmReplenishmentOrder,
  autoReplenish,
  syncVmIFranchiseSnapshotsFromLedger,
} from "@/lib/api/cool-catch";
import { fetchWarehousesApi } from "@/lib/api/warehouses";
import type { FranchiseeStockRow, VMIReplenishmentOrderRow } from "@/lib/mock/franchise/vmi";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const VMI_SOURCE_WAREHOUSE_LS_KEY = "odaflow_vmi_source_warehouse_id";

export default function FranchiseVmiPage() {
  const [tab, setTab] = React.useState<"suggestions" | "orders" | "stock">("suggestions");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>("");
  const [franchiseeFilter, setFranchiseeFilter] = React.useState<string>("");
  const [suggestions, setSuggestions] = React.useState<FranchiseeStockRow[]>([]);
  const [orders, setOrders] = React.useState<VMIReplenishmentOrderRow[]>([]);
  const [stock, setStock] = React.useState<FranchiseeStockRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [autoReplenishing, setAutoReplenishing] = React.useState(false);
  const [syncingLedger, setSyncingLedger] = React.useState(false);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    void fetchWarehousesApi()
      .then((list) => {
        if (cancelled) return;
        setWarehouses(list);
        const saved = typeof localStorage !== "undefined" ? localStorage.getItem(VMI_SOURCE_WAREHOUSE_LS_KEY) : null;
        if (saved && list.some((w) => w.id === saved)) {
          setSourceWarehouseId(saved);
        } else if (list.length === 1) {
          setSourceWarehouseId(list[0].id);
          localStorage.setItem(VMI_SOURCE_WAREHOUSE_LS_KEY, list[0].id);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchVMISuggestions(franchiseeFilter || undefined).then(setSuggestions),
      fetchVMIReplenishmentOrders({
        ...(orderStatusFilter ? { status: orderStatusFilter } : {}),
        ...(franchiseeFilter ? { franchiseeId: franchiseeFilter } : {}),
      }).then(setOrders),
      fetchFranchiseeStock(franchiseeFilter || undefined).then(setStock),
    ])
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        toast.error(e?.message ?? "Failed to load data");
      });
  }, [orderStatusFilter, franchiseeFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const franchiseeOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const s of suggestions) {
      if (!seen.has(s.franchiseeId)) {
        seen.add(s.franchiseeId);
        out.push({ id: s.franchiseeId, name: s.franchiseeName });
      }
    }
    for (const o of orders) {
      if (!seen.has(o.franchiseeId)) {
        seen.add(o.franchiseeId);
        out.push({ id: o.franchiseeId, name: o.franchiseeName });
      }
    }
    return out;
  }, [suggestions, orders]);

  const handleConfirm = async (order: VMIReplenishmentOrderRow) => {
    if (order.status !== "DRAFT") return;
    setConfirmingId(order.id);
    try {
      await confirmReplenishmentOrder(order.id);
      toast.success("Order confirmed.");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Confirm failed");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleAutoReplenish = async () => {
    if (!sourceWarehouseId) {
      toast.error("Select a Cold Hub (source) warehouse first.");
      return;
    }
    setAutoReplenishing(true);
    try {
      const res = await autoReplenish({
        franchiseeId: franchiseeFilter || undefined,
        sourceWarehouseId,
      });
      toast.success(`Created ${res.created} replenishment order(s).`);
      await load();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Auto-replenish failed";
      toast.error(msg === "STUB" ? "Configure API to run auto-replenish." : msg);
    } finally {
      setAutoReplenishing(false);
    }
  };

  const handleSyncFromLedger = async () => {
    setSyncingLedger(true);
    try {
      const res = await syncVmIFranchiseSnapshotsFromLedger({
        franchiseeId: franchiseeFilter || undefined,
      });
      toast.success(
        `Synced ${res.snapshotRowsUpserted} snapshot row(s) across ${res.franchiseesProcessed} franchisee(s).`
      );
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Sync from ledger failed");
    } finally {
      setSyncingLedger(false);
    }
  };

  const suggestionColumns = [
    { id: "franchisee", header: "Franchisee", accessor: (r: FranchiseeStockRow) => <span className="font-medium">{r.franchiseeName}</span>, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: FranchiseeStockRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: FranchiseeStockRow) => r.productName },
    { id: "qty", header: "Qty", accessor: (r: FranchiseeStockRow) => r.qty },
    { id: "reorder", header: "Reorder pt", accessor: (r: FranchiseeStockRow) => r.reorderPoint },
    { id: "suggested", header: "Suggested order", accessor: (r: FranchiseeStockRow) => <span className="font-medium text-primary">{r.suggestedOrder}</span> },
  ];

  const orderColumns = [
    { id: "number", header: "Order", accessor: (r: VMIReplenishmentOrderRow) => <span className="font-medium">{r.number}</span>, sticky: true },
    { id: "franchisee", header: "Franchisee", accessor: (r: VMIReplenishmentOrderRow) => r.franchiseeName },
    { id: "source", header: "From", accessor: (r: VMIReplenishmentOrderRow) => r.sourceWarehouse },
    { id: "transfer", header: "Transfer", accessor: (r: VMIReplenishmentOrderRow) => r.transferNumber ?? "—" },
    { id: "transferStatus", header: "Transfer status", accessor: (r: VMIReplenishmentOrderRow) => r.transferStatus ?? "—" },
    { id: "status", header: "Status", accessor: (r: VMIReplenishmentOrderRow) => <Badge variant={r.status === "RECEIVED" ? "default" : r.status === "SENT" ? "secondary" : "outline"}>{r.status}</Badge> },
    { id: "totalQty", header: "Total qty", accessor: (r: VMIReplenishmentOrderRow) => r.totalQty },
    { id: "actions", header: "", accessor: (r: VMIReplenishmentOrderRow) =>
      r.status === "DRAFT" ? (
        <Button size="sm" variant="outline" disabled={confirmingId === r.id} onClick={() => handleConfirm(r)}>
          {confirmingId === r.id ? "Confirming…" : "Confirm"}
        </Button>
      ) : null,
    },
  ];

  const stockColumns = [
    { id: "franchisee", header: "Franchisee", accessor: (r: FranchiseeStockRow) => r.franchiseeName, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: FranchiseeStockRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: FranchiseeStockRow) => r.productName },
    { id: "qty", header: "Qty", accessor: (r: FranchiseeStockRow) => r.qty },
    { id: "min", header: "Min", accessor: (r: FranchiseeStockRow) => r.minQty },
    { id: "max", header: "Max", accessor: (r: FranchiseeStockRow) => r.maxQty },
    { id: "updated", header: "Updated", accessor: (r: FranchiseeStockRow) => new Date(r.lastUpdated).toLocaleString() },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="VMI & Replenishment"
        description="Franchisee stock visibility and auto-replenishment from Cold Hub"
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/vmi" },
          { label: "VMI & Replenishment" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
              value={sourceWarehouseId || "__none__"}
              onValueChange={(v) => {
                const id = v === "__none__" ? "" : v;
                setSourceWarehouseId(id);
                if (id) localStorage.setItem(VMI_SOURCE_WAREHOUSE_LS_KEY, id);
                else localStorage.removeItem(VMI_SOURCE_WAREHOUSE_LS_KEY);
              }}
            >
              <SelectTrigger className="w-[min(100vw-2rem,260px)]">
                <SelectValue placeholder="Cold Hub (source)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Cold Hub warehouse…</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                    {w.code ? ` (${w.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => void handleSyncFromLedger()} disabled={syncingLedger || loading}>
              <Icons.RefreshCw className={`mr-2 h-4 w-4 ${syncingLedger ? "animate-spin" : ""}`} />
              {syncingLedger ? "Syncing…" : "Sync snapshots from outlets"}
            </Button>
            <Button type="button" onClick={() => void handleAutoReplenish()} disabled={autoReplenishing || !sourceWarehouseId}>
              <Icons.PackagePlus className="mr-2 h-4 w-4" />
              {autoReplenishing ? "Creating…" : "Create from suggestions"}
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <p className="text-muted-foreground text-sm max-w-4xl">
          Select the HQ warehouse stock ships from (Cold Hub). Required for &quot;Create from suggestions&quot;. Use &quot;Sync snapshots
          from outlets&quot; to pull posted inventory from each franchisee&apos;s linked outlet org into VMI (after{" "}
          <code className="text-xs">PATCH /franchise/franchisees/:id</code> with <code className="text-xs">outletOrgId</code>
          ).
        </p>
        <div className="flex gap-2 border-b">
          {(["suggestions", "orders", "stock"] as const).map((t) => (
            <Button key={t} variant={tab === t ? "secondary" : "ghost"} size="sm" onClick={() => setTab(t)}>
              {t === "suggestions" ? "Reorder suggestions" : t === "orders" ? "Replenishment orders" : "Stock by franchisee"}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            {tab === "suggestions" && (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  {suggestions.slice(0, 4).map((suggestion) => (
                    <ReplenishmentSuggestionCard
                      key={`${suggestion.franchiseeId}-${suggestion.sku}`}
                      title={`${suggestion.franchiseeName} · ${suggestion.sku}`}
                      subtitle={suggestion.productName}
                      suggestedQty={suggestion.suggestedOrder}
                      urgency={suggestion.qty <= suggestion.minQty ? "high" : "normal"}
                      reasons={[
                        `On hand ${suggestion.qty} below reorder point ${suggestion.reorderPoint}`,
                        `Target max ${suggestion.maxQty}`,
                      ]}
                      primaryAction={{
                        label: "Create replenishment",
                        onClick: () => void handleAutoReplenish(),
                      }}
                      secondaryAction={{
                        label: "Review stock",
                        onClick: () => setTab("stock"),
                      }}
                    />
                  ))}
                </div>
                <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Reorder suggestions</h3>
            <p className="text-xs text-muted-foreground">Below reorder point; suggested order qty to bring up to max or target.</p>
          </div>
          <DataTable<FranchiseeStockRow & { id?: string }> data={suggestions as (FranchiseeStockRow & { id?: string })[]} columns={suggestionColumns} emptyMessage="No suggestions (all above reorder point)."
            scrollMode="natural"
            size="comfortable"
            />
        </div>
              </div>
            )}

            {tab === "orders" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Replenishment orders</CardTitle>
                    <CardDescription>Transfer orders from Cold Hub to franchisee.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={franchiseeFilter || "ALL"} onValueChange={(v) => setFranchiseeFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Franchisee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All franchisees</SelectItem>
                        {franchiseeOptions.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={orderStatusFilter || "ALL"} onValueChange={(v) => setOrderStatusFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="RECEIVED">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<VMIReplenishmentOrderRow> data={orders} columns={orderColumns} emptyMessage="No replenishment orders."
            scrollMode="natural"
            size="comfortable"
            />
                </CardContent>
              </Card>
            )}

            {tab === "stock" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Stock by franchisee</CardTitle>
                    <CardDescription>
                      VMI snapshots (webhook ingest or &quot;Sync snapshots from outlets&quot;). Not the same as posted Sell
                      on-hand unless you sync.
                    </CardDescription>
                  </div>
                  <Select value={franchiseeFilter || "ALL"} onValueChange={(v) => setFranchiseeFilter(v === "ALL" ? "" : v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Franchisee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All franchisees</SelectItem>
                      {franchiseeOptions.map((f) => (
                        <SelectItem value={f.id} key={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<FranchiseeStockRow & { id?: string }> data={stock as (FranchiseeStockRow & { id?: string })[]} columns={stockColumns} emptyMessage="No stock data."
            scrollMode="natural"
            size="comfortable"
            />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
