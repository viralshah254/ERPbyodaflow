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
import { stockMovementSourceHref, type MovementRow } from "@/lib/types/inventory";
import { fetchInventoryMovementsApi } from "@/lib/api/inventory-stock";
import Link from "next/link";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function StockMovementsPage() {
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [allRows, setAllRows] = React.useState<MovementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);

  const [loadError, setLoadError] = React.useState("");
  const [refresh, setRefresh] = React.useState(0);

  React.useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError("");
    const timer = window.setTimeout(async () => {
      try {
        const rows = await fetchInventoryMovementsApi({ search });
        if (current) setAllRows(rows);
      } catch (error) {
        if (current) {
          setAllRows([]);
          setLoadError((error as Error).message);
        }
      } finally {
        if (current) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [search, refresh]);

  const filtered = React.useMemo(() => allRows.filter((row) =>
    (!warehouseFilter || row.warehouse === warehouseFilter) && (!typeFilter || row.type === typeFilter)
  ), [allRows, warehouseFilter, typeFilter]);

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
            {r.quantity > 0 ? "+" : ""}{r.quantity}{r.uom ? ` ${r.uom}` : ""}
          </span>
        ),
      },
      {
        id: "reference",
        header: "Source document",
        accessor: (row: MovementRow) => {
          const label = row.reference || row.sourceType || "—";
          const href = stockMovementSourceHref(row);
          return href ? <Link className="text-primary underline" href={href}>{label}</Link> : label;
        },
      },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Stock Movements"
        description="View the latest 500 movements for your search, with quantities and source documents."
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
          searchPlaceholder="Product name, SKU, code, barcode, warehouse or reference"
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
          onExport={loading || loadError ? undefined : () =>
            downloadCsv(
              `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                date: row.date,
                type: row.type,
                sku: row.sku,
                productName: row.productName,
                warehouse: row.warehouse,
                quantity: row.quantity,
                uom: row.uom ?? "",
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
          ) : loadError ? (
            <div className="p-8 text-sm" role="alert">
              Could not load stock movements. <button type="button" className="underline" onClick={() => setRefresh((value) => value + 1)}>Retry</button>
            </div>
          ) : (
            <div className={LIST_TABLE_SCROLL_BODY_CLASS}>
              <DataTable<MovementRow> dataScope="all"
                allData={filtered} pageOffset={pageOffset} pageSize={pageSize} onPageOffsetChange={setPageOffset} data={pagedRows}
                columns={columns}
                emptyMessage="No movements found."
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0" searchable={false}
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
