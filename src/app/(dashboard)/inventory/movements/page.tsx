"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { downloadCsv } from "@/lib/export/csv";
import type { MovementRow } from "@/lib/types/inventory";
import { fetchInventoryMovementsApi } from "@/lib/api/inventory-stock";
import { toast } from "sonner";

export default function StockMovementsPage() {
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [allRows, setAllRows] = React.useState<MovementRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refreshRows = React.useCallback(async () => {
    setLoading(true);
    try {
      setAllRows(
        await fetchInventoryMovementsApi({
          warehouseId: warehouseFilter || undefined,
          search,
          type: typeFilter || undefined,
        })
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, search, typeFilter]);

  React.useEffect(() => {
    void refreshRows();
  }, [refreshRows]);

  const filtered = allRows;

  const warehouses = React.useMemo(
    () => Array.from(new Set(allRows.map((r) => r.warehouse))),
    [allRows]
  );

  const typeBadge = (type: string) => {
    const v: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      IN: "default",
      OUT: "destructive",
      TRANSFER: "secondary",
      ADJUST: "outline",
    };
    return <Badge variant={v[type] ?? "outline"}>{type}</Badge>;
  };

  const columns = React.useMemo(
    () => [
      { id: "date", header: "Date", accessor: "date" as keyof MovementRow },
      {
        id: "type",
        header: "Type",
        accessor: (r: MovementRow) => typeBadge(r.type),
      },
      {
        id: "sku",
        header: "SKU",
        accessor: (r: MovementRow) => <span className="font-medium">{r.sku}</span>,
        sticky: true,
      },
      { id: "productName", header: "Product", accessor: "productName" as keyof MovementRow },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof MovementRow },
      {
        id: "quantity",
        header: "Quantity",
        accessor: (r: MovementRow) => (
          <span className={r.quantity < 0 ? "text-destructive" : ""}>
            {r.quantity > 0 ? "+" : ""}{r.quantity}
          </span>
        ),
      },
      { id: "reference", header: "Reference", accessor: "reference" as keyof MovementRow },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Stock Movements"
        description="Track inventory movements and transactions"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Movements" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by SKU, product, reference..."
          searchValue={search}
          onSearchChange={setSearch}
          searchInputDataHint="search"
          exportButtonDataHint="export"
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
              id: "type",
              label: "Type",
              options: [
                { label: "All", value: "" },
                { label: "IN", value: "IN" },
                { label: "OUT", value: "OUT" },
                { label: "Transfer", value: "TRANSFER" },
                { label: "Adjust", value: "ADJUST" },
              ],
              value: typeFilter,
              onChange: (v) => setTypeFilter(v),
            },
          ]}
          onExport={() =>
            downloadCsv(
              `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                date: row.date,
                type: row.type,
                sku: row.sku,
                productName: row.productName,
                warehouse: row.warehouse,
                quantity: row.quantity,
                reference: row.reference ?? "",
              }))
            )
          }
        />

        {loading ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading movements...
          </div>
        ) : (
          <DataTable<MovementRow>
            data={filtered}
            columns={columns}
            emptyMessage="No movements found."
          />
        )}
      </div>
    </PageShell>
  );
}
