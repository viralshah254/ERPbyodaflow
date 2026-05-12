"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createStockAdjustmentApi,
  fetchStockLevelsApi,
  fetchFranchiseNetworkStockAggregate,
  type InventoryStockRow,
  type FranchiseNetworkStockItem,
  type FranchiseOutletStockRow,
} from "@/lib/api/inventory-stock";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function StockLevelsPage() {
  const router = useRouter();
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const isFranchisor = orgRole === "FRANCHISOR";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [stockItems, setStockItems] = React.useState<InventoryStockRow[]>([]);
  const [networkAgg, setNetworkAgg] = React.useState<FranchiseNetworkStockItem[]>([]);
  const [networkAggByProduct, setNetworkAggByProduct] = React.useState<Map<string, FranchiseNetworkStockItem>>(new Map());
  const [loading, setLoading] = React.useState(true);

  // Stock adjustment state
  const [savingAdjustment, setSavingAdjustment] = React.useState(false);
  const [adjusting, setAdjusting] = React.useState<InventoryStockRow | null>(null);
  const [adjustDelta, setAdjustDelta] = React.useState<string>("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [adjustMode, setAdjustMode] = React.useState<"INCREASE" | "DECREASE">("DECREASE");

  // Franchise drill-down sheet state
  const [franchiseDrillRow, setFranchiseDrillRow] = React.useState<FranchiseNetworkStockItem | null>(null);

  const refreshStock = React.useCallback(async () => {
    setLoading(true);
    try {
      const requests: [Promise<InventoryStockRow[]>, Promise<{ items: FranchiseNetworkStockItem[] } | null>] = [
        fetchStockLevelsApi({
          warehouseId: warehouseFilter === "all" ? undefined : warehouseFilter,
          status: statusFilter as "In Stock" | "Low Stock" | "Out of Stock" | "all",
          search: searchQuery,
        }),
        isFranchisor
          ? fetchFranchiseNetworkStockAggregate({ search: searchQuery })
          : Promise.resolve(null),
      ];

      const [hqItems, aggResult] = await Promise.all(requests);
      setStockItems(hqItems);

      const aggItems = aggResult?.items ?? [];
      setNetworkAgg(aggItems);
      setNetworkAggByProduct(new Map(aggItems.map((i) => [i.productId, i])));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, warehouseFilter, isFranchisor]);

  React.useEffect(() => {
    void refreshStock();
  }, [refreshStock]);

  const filteredItems = React.useMemo(() => {
    const arr = [...stockItems];
    const famKey = (f: string | null | undefined) => {
      const t = f?.trim();
      return t ? t.toLowerCase() : "\uFFFF";
    };
    arr.sort((a, b) => {
      const c = famKey(a.productFamily).localeCompare(famKey(b.productFamily));
      if (c !== 0) return c;
      return (a.sku ?? "").localeCompare(b.sku ?? "", undefined, { numeric: true });
    });
    return arr;
  }, [stockItems]);

  const warehouseOptions = React.useMemo(() => {
    const options = new Map<string, string>();
    stockItems.forEach((item) => {
      options.set(item.warehouseId ?? item.warehouse, item.warehouse);
    });
    return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
  }, [stockItems]);

  const openStockDetail = (row: InventoryStockRow) => {
    router.push(`/inventory/stock-levels/${row.id}`);
  };

  const openAdjust = (row: InventoryStockRow) => {
    setAdjusting(row);
    setAdjustDelta("");
    setAdjustReason("");
  };

  const handleApplyAdjustment = async () => {
    if (!adjusting) {
      setAdjusting(null);
      return;
    }

    const numeric = parseFloat(adjustDelta);
    if (!numeric || Number.isNaN(numeric)) {
      toast.error("Enter a valid quantity.");
      return;
    }
    const magnitude = Math.abs(numeric);
    const signedDelta = adjustMode === "INCREASE" ? magnitude : -magnitude;
    try {
      setSavingAdjustment(true);
      await createStockAdjustmentApi({
        stockLevelId: adjusting.id,
        quantityDelta: signedDelta,
        reason: adjustReason.trim() || undefined,
      });
      toast.success("Stock adjustment posted.");
      setAdjusting(null);
      await refreshStock();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  const franchiseNetworkTotalQty = React.useMemo(
    () => networkAgg.reduce((s, i) => s + i.totalAvailable, 0),
    [networkAgg]
  );
  const franchiseNetworkTotalValue = React.useMemo(
    () => networkAgg.reduce((s, i) => s + i.networkValueKes, 0),
    [networkAgg]
  );

  const columns = [
    {
      id: "productFamily",
      header: "Product",
      accessor: (row: InventoryStockRow) => row.productFamily?.trim() || "—",
      sticky: true,
    },
    {
      id: "sku",
      header: "SKU",
      accessor: (row: InventoryStockRow) => (
        <div>
          <div className="font-medium font-mono">{row.sku}</div>
          <div className="text-xs text-muted-foreground">{row.name}</div>
        </div>
      ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      accessor: (row: InventoryStockRow) => row.warehouse,
    },
    {
      id: "location",
      header: "Location",
      accessor: (row: InventoryStockRow) => row.location ?? "—",
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right font-medium">
          {row.quantity.toLocaleString()}
          {row.uom ? <span className="ml-1 text-muted-foreground text-xs">{row.uom}</span> : null}
        </div>
      ),
    },
    {
      id: "reserved",
      header: "Reserved",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right text-muted-foreground">{row.reserved}</div>
      ),
    },
    {
      id: "available",
      header: "Available",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right font-semibold">{row.available}</div>
      ),
    },
    ...(isFranchisor
      ? [
          {
            id: "franchiseNetwork",
            header: "Franchise network",
            accessor: (row: InventoryStockRow) => {
              const agg = row.productId ? networkAggByProduct.get(row.productId) : undefined;
              if (!agg) {
                return <div className="text-right text-muted-foreground text-xs">—</div>;
              }
              return (
                <button
                  type="button"
                  className="text-right w-full group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFranchiseDrillRow(agg);
                  }}
                >
                  <div className="font-semibold tabular-nums group-hover:underline">
                    {agg.totalAvailable.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {agg.byOutlet.length} outlet{agg.byOutlet.length !== 1 ? "s" : ""}
                    {agg.networkValueKes > 0 && (
                      <span className="ml-1">
                        · KES {Math.round(agg.networkValueKes).toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              );
            },
          },
        ]
      : []),
    {
      id: "reorderLevel",
      header: "Reorder Level",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right">{row.reorderLevel}</div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: InventoryStockRow) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: InventoryStockRow) => (
        <RowActions
          actions={[
            {
              label: "View Details",
              icon: "Eye",
              onClick: (e) => { e?.stopPropagation?.(); openStockDetail(row); },
            },
            {
              label: "Adjust Stock",
              icon: "Edit",
              onClick: (e) => { e?.stopPropagation?.(); openAdjust(row); },
            },
            {
              label: "Transfer",
              icon: "ArrowLeftRight",
              onClick: (e) => {
                e?.stopPropagation?.();
                router.push(`/warehouse/transfers?from=${row.id}`);
              },
            },
          ]}
        />
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <PageLayout
      title="Stock Levels"
      description="View current inventory levels across all warehouses"
      actions={
        <>
          <Button variant="outline">
            <Icons.Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Stock Adjustment
          </Button>
        </>
      }
    >
      {isFranchisor && networkAgg.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
            <Icons.Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Franchise network total available:</span>
            <span className="font-semibold tabular-nums">
              {franchiseNetworkTotalQty.toLocaleString()}
            </span>
            {franchiseNetworkTotalValue > 0 && (
              <span className="text-muted-foreground">
                · KES {Math.round(franchiseNetworkTotalValue).toLocaleString()} at HQ cost
              </span>
            )}
            <span className="text-xs text-muted-foreground">(management — not HQ GL inventory)</span>
          </div>
        </div>
      )}

      <Card>
        <FiltersBar
          searchPlaceholder="Search by SKU or product name..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputDataHint="search"
          filters={[
            {
              id: "warehouse",
              label: "Warehouse",
              options: [
                { label: "All Warehouses", value: "all" },
                ...warehouseOptions,
              ],
              value: warehouseFilter,
              onChange: setWarehouseFilter,
            },
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All Statuses", value: "all" },
                { label: "In Stock", value: "In Stock" },
                { label: "Low Stock", value: "Low Stock" },
                { label: "Out of Stock", value: "Out of Stock" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          activeFiltersCount={[warehouseFilter, statusFilter].filter((v) => v !== "all").length}
          onClearFilters={() => { setWarehouseFilter("all"); setStatusFilter("all"); }}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading stock..."
                  : `${filteredItems.length} items across all locations${isFranchisor && networkAgg.length > 0 ? " · Franchise network column shows totals across all outlets" : ""}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading stock levels...</div>
          ) : (
            <DataTable
              data={filteredItems}
              columns={columns}
              onRowClick={(row) => openStockDetail(row)}
              emptyMessage="No stock items found."
            />
          )}
        </CardContent>
      </Card>

      {/* Franchise network drill-down sheet */}
      {franchiseDrillRow && (
        <Sheet open onOpenChange={(open) => !open && setFranchiseDrillRow(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>
                <span className="font-mono">{franchiseDrillRow.sku}</span>
                {" "}— franchise stock
              </SheetTitle>
              <SheetDescription>
                {franchiseDrillRow.productName} · {franchiseDrillRow.byOutlet.length} outlet
                {franchiseDrillRow.byOutlet.length !== 1 ? "s" : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="py-4 space-y-4">
              {/* Network totals summary */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground uppercase">Total on hand</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {franchiseDrillRow.totalQty.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground uppercase">Available</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {franchiseDrillRow.totalAvailable.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground uppercase">Value (KES)</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {franchiseDrillRow.networkValueKes > 0
                      ? Math.round(franchiseDrillRow.networkValueKes).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>

              {franchiseDrillRow.unitCostKes > 0 && (
                <p className="text-xs text-muted-foreground">
                  Valued at HQ unit cost of KES {franchiseDrillRow.unitCostKes.toLocaleString()} from latest
                  costing snapshot. Management figure — not HQ general-ledger inventory after intercompany sale.
                </p>
              )}

              {/* Per-outlet breakdown */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  By outlet
                </div>
                <div className="divide-y rounded-md border overflow-hidden">
                  {franchiseDrillRow.byOutlet.map((outlet: FranchiseOutletStockRow) => (
                    <div
                      key={`${outlet.childOrgId}-${outlet.warehouseId}`}
                      className="flex items-center justify-between px-3 py-2.5 text-sm bg-card"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/franchise/outlets/${outlet.childOrgId}?tab=stock`}
                          className="font-medium hover:underline truncate block"
                          onClick={() => setFranchiseDrillRow(null)}
                        >
                          {outlet.outletName}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate">
                          {outlet.warehouseName}
                        </div>
                      </div>
                      <div className="text-right tabular-nums shrink-0 ml-4">
                        <div className="font-semibold">{outlet.available.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          on hand {outlet.qty.toLocaleString()}
                          {outlet.reserved > 0 && <span> · rsvd {outlet.reserved}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setFranchiseDrillRow(null)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Stock adjustment sheet */}
      {adjusting && (
        <Sheet open onOpenChange={(open) => !open && setAdjusting(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Stock adjustment — {adjusting.sku}</SheetTitle>
              <SheetDescription>
                {adjusting.name} · {adjusting.warehouse}
                {adjusting.location ? ` · ${adjusting.location}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">On hand</div>
                  <div className="text-lg font-semibold">{adjusting.quantity}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Available</div>
                  <div className="text-lg font-semibold">{adjusting.available}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adjustment type</Label>
                <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-sm ${
                      adjustMode === "INCREASE" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setAdjustMode("INCREASE")}
                  >
                    Increase
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-sm ${
                      adjustMode === "DECREASE" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setAdjustMode("DECREASE")}
                  >
                    Decrease
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adjustment quantity</Label>
                <Input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta((e.target as HTMLInputElement).value)}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Cycle count, damage, write-off (stub)"
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setAdjusting(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleApplyAdjustment()}
                disabled={savingAdjustment || !adjustDelta || Number.isNaN(parseFloat(adjustDelta)) || parseFloat(adjustDelta) <= 0}
              >
                {savingAdjustment ? "Applying..." : "Apply adjustment"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </PageLayout>
  );
}
