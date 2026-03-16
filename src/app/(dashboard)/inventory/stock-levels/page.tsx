"use client";

import * as React from "react";
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
  type InventoryStockRow,
} from "@/lib/api/inventory-stock";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function StockLevelsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [stockItems, setStockItems] = React.useState<InventoryStockRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingAdjustment, setSavingAdjustment] = React.useState(false);
  const [adjusting, setAdjusting] = React.useState<InventoryStockRow | null>(null);
  const [adjustDelta, setAdjustDelta] = React.useState<string>("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [adjustMode, setAdjustMode] = React.useState<"INCREASE" | "DECREASE">("DECREASE");

  const refreshStock = React.useCallback(async () => {
    setLoading(true);
    try {
      setStockItems(
        await fetchStockLevelsApi({
          warehouseId: warehouseFilter === "all" ? undefined : warehouseFilter,
          status: statusFilter as "In Stock" | "Low Stock" | "Out of Stock" | "all",
          search: searchQuery,
        })
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, warehouseFilter]);

  React.useEffect(() => {
    void refreshStock();
  }, [refreshStock]);

  const filteredItems = stockItems;
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

  const columns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (row: InventoryStockRow) => (
        <div>
          <div className="font-medium">{row.sku}</div>
          <div className="text-xs text-muted-foreground">{row.name}</div>
        </div>
      ),
      sticky: true,
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
        <div className="text-right font-medium">{row.quantity}</div>
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
                {loading ? "Loading stock..." : `${filteredItems.length} items across all locations`}
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
