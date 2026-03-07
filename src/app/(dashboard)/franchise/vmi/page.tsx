"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
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
} from "@/lib/api/cool-catch";
import type { FranchiseeStockRow, VMIReplenishmentOrderRow } from "@/lib/mock/franchise/vmi";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function FranchiseVmiPage() {
  const [tab, setTab] = React.useState<"suggestions" | "orders" | "stock">("suggestions");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>("");
  const [franchiseeFilter, setFranchiseeFilter] = React.useState<string>("");
  const [suggestions, setSuggestions] = React.useState<FranchiseeStockRow[]>([]);
  const [orders, setOrders] = React.useState<VMIReplenishmentOrderRow[]>([]);
  const [stock, setStock] = React.useState<FranchiseeStockRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

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
    <PageShell>
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
          <Button onClick={() => toast.info("Create replenishment order: POST /api/franchise/vmi/replenishment-orders")}>
            <Icons.PackagePlus className="mr-2 h-4 w-4" />
            Create from suggestions
          </Button>
        }
      />
      <div className="p-6 space-y-6">
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
              <Card>
                <CardHeader>
                  <CardTitle>Reorder suggestions</CardTitle>
                  <CardDescription>Below reorder point; suggested order qty to bring up to max or target.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<FranchiseeStockRow & { id?: string }> data={suggestions as (FranchiseeStockRow & { id?: string })[]} columns={suggestionColumns} emptyMessage="No suggestions (all above reorder point)." />
                </CardContent>
              </Card>
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
                  <DataTable<VMIReplenishmentOrderRow> data={orders} columns={orderColumns} emptyMessage="No replenishment orders." />
                </CardContent>
              </Card>
            )}

            {tab === "stock" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Stock by franchisee</CardTitle>
                    <CardDescription>Live VMI snapshots (ingested from franchisee-facing system).</CardDescription>
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
                  <DataTable<FranchiseeStockRow & { id?: string }> data={stock as (FranchiseeStockRow & { id?: string })[]} columns={stockColumns} emptyMessage="No stock data." />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
