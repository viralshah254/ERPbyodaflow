"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMockStock, getLowStockItems, type StockRow } from "@/lib/mock/stock";
import { useCopilotStore } from "@/stores/copilot-store";
import * as Icons from "lucide-react";

export default function StockPage() {
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [search, setSearch] = React.useState("");

  const allRows = React.useMemo(() => getMockStock(), []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (warehouseFilter) {
      out = out.filter((r) => r.warehouse === warehouseFilter);
    }
    if (categoryFilter) {
      out = out.filter((r) => r.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q)
      );
    }
    return out;
  }, [allRows, warehouseFilter, categoryFilter, search]);

  const lowStock = React.useMemo(() => getLowStockItems(), []);
  const warehouses = React.useMemo(
    () => Array.from(new Set(allRows.map((r) => r.warehouse))),
    [allRows]
  );
  const categories = React.useMemo(
    () => Array.from(new Set(allRows.map((r) => r.category).filter(Boolean))) as string[],
    [allRows]
  );

  const columns = React.useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        accessor: (r: StockRow) => <span className="font-medium">{r.sku}</span>,
        sticky: true,
      },
      { id: "name", header: "Product", accessor: "name" as keyof StockRow },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof StockRow },
      { id: "location", header: "Location", accessor: "location" as keyof StockRow },
      {
        id: "quantity",
        header: "Qty",
        accessor: (r: StockRow) => r.quantity,
      },
      {
        id: "reserved",
        header: "Reserved",
        accessor: (r: StockRow) => r.reserved,
      },
      {
        id: "available",
        header: "Available",
        accessor: (r: StockRow) => r.available,
      },
      {
        id: "reorderLevel",
        header: "Reorder",
        accessor: (r: StockRow) => r.reorderLevel,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: StockRow) => (
          <Badge
            variant={
              r.status === "Out of Stock"
                ? "destructive"
                : r.status === "Low Stock"
                  ? "secondary"
                  : "default"
            }
          >
            {r.status}
          </Badge>
        ),
      },
    ],
    []
  );

  const askCopilotStockout = () => {
    openDrawerWithPrompt("Why did we have a stockout? Suggest remedies and reorder options.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Stock"
        description="Stock by warehouse. Monitor levels and low-stock alerts."
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Stock" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={askCopilotStockout}>
            <Icons.Sparkles className="mr-2 h-4 w-4" />
            Ask Copilot: why stockout?
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        {lowStock.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Icons.AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      {lowStock.length} item(s) below reorder level
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-200">
                      Consider placing purchase orders or transfers.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={askCopilotStockout}>
                  Ask Copilot
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <DataTableToolbar
          searchPlaceholder="Search by SKU or name..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "warehouse",
              label: "Warehouse",
              options: [
                { label: "All", value: "" },
                ...warehouses.map((w) => ({ label: w, value: w })),
              ],
              value: warehouseFilter,
              onChange: (v) => setWarehouseFilter(v),
            },
            {
              id: "category",
              label: "Category",
              options: [
                { label: "All", value: "" },
                ...categories.map((c) => ({ label: c, value: c })),
              ],
              value: categoryFilter,
              onChange: (v) => setCategoryFilter(v),
            },
          ]}
          onExport={() => window.alert("Export (stub)")}
        />

        <DataTable<StockRow>
          data={filtered}
          columns={columns}
          emptyMessage="No stock found."
        />
      </div>
    </PageShell>
  );
}
