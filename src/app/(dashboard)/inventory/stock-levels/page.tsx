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
import { getMockStock, type StockRow } from "@/lib/mock/stock";
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
import * as Icons from "lucide-react";

export default function StockLevelsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [stockItems, setStockItems] = React.useState<StockRow[]>(() => getMockStock());
  const [adjusting, setAdjusting] = React.useState<StockRow | null>(null);
  const [adjustDelta, setAdjustDelta] = React.useState<string>("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [adjustMode, setAdjustMode] = React.useState<"INCREASE" | "DECREASE">("DECREASE");

  const filteredItems = React.useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarehouse =
        warehouseFilter === "all" || item.warehouse === warehouseFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [stockItems, searchQuery, warehouseFilter, statusFilter]);

  const openStockDetail = (row: StockRow) => {
    router.push(`/inventory/stock-levels/${row.id}`);
  };

  const openAdjust = (row: StockRow) => {
    setAdjusting(row);
    setAdjustDelta("");
    setAdjustReason("");
  };

  const handleApplyAdjustment = () => {
    if (!adjusting) {
      setAdjusting(null);
      return;
    }

    const numeric = parseFloat(adjustDelta);
    if (!numeric || Number.isNaN(numeric)) {
      setAdjusting(null);
      return;
    }
    const magnitude = Math.abs(numeric);
    const signedDelta = adjustMode === "INCREASE" ? magnitude : -magnitude;

    setStockItems((prev) =>
      prev.map((row) => {
        if (row.id !== adjusting.id) return row;
        let quantity = row.quantity + signedDelta;
        let available = row.available + signedDelta;
        if (quantity < 0) quantity = 0;
        if (available < 0) available = 0;
        let status: StockRow["status"];
        if (quantity <= 0) status = "Out of Stock";
        else if (available <= row.reorderLevel) status = "Low Stock";
        else status = "In Stock";
        return { ...row, quantity, available, status };
      })
    );

    setAdjusting(null);
  };

  const columns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (row: StockRow) => (
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
      accessor: (row: StockRow) => row.warehouse,
    },
    {
      id: "location",
      header: "Location",
      accessor: (row: StockRow) => row.location ?? "—",
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (row: StockRow) => (
        <div className="text-right font-medium">{row.quantity}</div>
      ),
    },
    {
      id: "reserved",
      header: "Reserved",
      accessor: (row: StockRow) => (
        <div className="text-right text-muted-foreground">{row.reserved}</div>
      ),
    },
    {
      id: "available",
      header: "Available",
      accessor: (row: StockRow) => (
        <div className="text-right font-semibold">{row.available}</div>
      ),
    },
    {
      id: "reorderLevel",
      header: "Reorder Level",
      accessor: (row: StockRow) => (
        <div className="text-right">{row.reorderLevel}</div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: StockRow) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: StockRow) => (
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
          onSearchChange={setSearchQuery}
          filters={[
            {
              id: "warehouse",
              label: "Warehouse",
              options: [
                { label: "All Warehouses", value: "all" },
                { label: "WH-Main", value: "WH-Main" },
                { label: "WH-East", value: "WH-East" },
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
                {filteredItems.length} items across all locations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredItems}
            columns={columns}
            onRowClick={(row) => openStockDetail(row)}
            emptyMessage="No stock items found."
          />
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
                onClick={handleApplyAdjustment}
                disabled={!adjustDelta || Number.isNaN(parseFloat(adjustDelta)) || parseFloat(adjustDelta) <= 0}
              >
                Apply adjustment
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </PageLayout>
  );
}
