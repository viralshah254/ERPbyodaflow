"use client";

import * as React from "react";
import {
  LIST_PAGE_BODY_VIEWPORT_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_PAGINATION_CLASS,
  LIST_TABLE_SCROLL_BODY_CLASS,
  LIST_TABLE_VIEWPORT_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { Badge } from "@/components/ui/badge";
import { downloadCsv } from "@/lib/export/csv";
import type { MovementRow } from "@/lib/types/inventory";
import { fetchInventoryMovementsApi } from "@/lib/api/inventory-stock";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function StockMovementsPage() {
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [allRows, setAllRows] = React.useState<MovementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);

  const refreshRows = React.useCallback(async () => {
    setLoading(true);
    try {
      setAllRows(await fetchInventoryMovementsApi());
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshRows();
  }, [refreshRows]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (warehouseFilter && row.warehouse !== warehouseFilter) return false;
      if (typeFilter && row.type !== typeFilter) return false;
      if (!q) return true;
      return [row.sku, row.productName, row.reference, row.warehouse]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [allRows, search, warehouseFilter, typeFilter]);

  React.useEffect(() => {
    setPageOffset(0);
  }, [search, warehouseFilter, typeFilter, pageSize]);

  const pagedRows = React.useMemo(
    () => filtered.slice(pageOffset, pageOffset + pageSize),
    [filtered, pageOffset, pageSize]
  );

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
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Stock Movements"
        description="Track inventory movements and transactions"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Movements" },
        ]}
        sticky
        dense
        showCommandHint
      />
      <div className={LIST_PAGE_BODY_VIEWPORT_CLASS}>
        <DataTableToolbar className="shrink-0 p-2"
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

        <div className={LIST_TABLE_VIEWPORT_CLASS}>
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Loading movements...
            </div>
          ) : (
            <div className={LIST_TABLE_SCROLL_BODY_CLASS}>
              <DataTable<MovementRow>
                data={pagedRows}
                columns={columns}
                emptyMessage="No movements found."
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0"
              />
            </div>
          )}
          {!loading && filtered.length > 0 ? (
            <TablePagination
              className={`${LIST_TABLE_PAGINATION_CLASS} rounded-none border-0 border-t shadow-none bg-card`}
              pageOffset={pageOffset}
              pageSize={pageSize}
              itemCount={pagedRows.length}
              totalCount={filtered.length}
              hasMore={pageOffset + pageSize < filtered.length}
              onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
              onNext={() => setPageOffset((offset) => offset + pageSize)}
              entityLabel="movements"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageOffset(0);
              }}
            />
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
