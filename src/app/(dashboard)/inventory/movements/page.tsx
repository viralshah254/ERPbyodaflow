"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { getMockMovements, type MovementRow } from "@/lib/mock/movements";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function StockMovementsPage() {
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");

  const allRows = React.useMemo(() => getMockMovements(), []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (warehouseFilter) {
      out = out.filter((r) => r.warehouse === warehouseFilter);
    }
    if (typeFilter) {
      out = out.filter((r) => r.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          (r.reference?.toLowerCase().includes(q))
      );
    }
    return out;
  }, [allRows, warehouseFilter, typeFilter, search]);

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
          onExport={() => toast.info("Export (stub)")}
        />

        <DataTable<MovementRow>
          data={filtered}
          columns={columns}
          emptyMessage="No movements found."
        />
      </div>
    </PageShell>
  );
}
