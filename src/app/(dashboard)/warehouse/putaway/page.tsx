"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPutawayTasks, type WarehousePutawayRow } from "@/lib/api/warehouse-execution";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";

export default function PutawayPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<WarehousePutawayRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPutawayTasks()
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load putaway tasks.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.grnNumber, row.warehouse, row.poRef].filter(Boolean).some((value) => value!.toLowerCase().includes(query))
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "grnNumber", header: "Receipt", accessor: (r: WarehousePutawayRow) => <span className="font-medium">{r.grnNumber}</span>, sticky: true },
      { id: "receiptStatus", header: "Receipt status", accessor: (r: WarehousePutawayRow) => r.sourceDocumentStatus ?? "—" },
      { id: "warehouse", header: "Warehouse", accessor: (r: WarehousePutawayRow) => r.warehouse ?? r.warehouseId ?? "—" },
      { id: "status", header: "Status", accessor: (r: WarehousePutawayRow) => r.status },
      { id: "lines", header: "Lines", accessor: (r: WarehousePutawayRow) => r.lines.length },
      {
        id: "progress",
        header: "Putaway",
        accessor: (r: WarehousePutawayRow) => {
          const totalKg = r.lines.reduce((s, l) => s + (l.receivedWeightKg ?? 0), 0);
          if (totalKg > 0) {
            const putawayKg = r.lines.reduce((s, l) => s + (l.receivedWeightKg ?? 0) * ((l.putawayQty ?? 0) / (l.receivedQty || 1)), 0);
            return `${putawayKg.toFixed(1)} / ${totalKg.toFixed(1)} kg`;
          }
          const totalQty = r.lines.reduce((s, l) => s + l.receivedQty, 0);
          const doneQty = r.lines.reduce((s, l) => s + (l.putawayQty ?? 0), 0);
          return `${doneQty}/${totalQty}`;
        },
      },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Putaway"
        description="Live receipt putaway tasks with bin-level allocation."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Putaway" },
        ]}
        sticky
        showCommandHint
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by receipt, warehouse, PO..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `putaway-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((r) => ({
                grnNumber: r.grnNumber,
                warehouse: r.warehouse ?? r.warehouseId ?? "",
                status: r.status,
                receiptStatus: r.sourceDocumentStatus ?? "",
                lineCount: r.lines.length,
              }))
            )
          }
        />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Putaway queue</h3>
            <p className="text-xs text-muted-foreground">Tasks are now stored and confirmed against backend bin locations.</p>
          </div>
          <DataTable<WarehousePutawayRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/putaway/${row.id}`)}
              emptyMessage={loading ? "Loading putaway tasks..." : "No putaway tasks."}
              scrollMode="fill"
              size="comfortable"
              className="min-h-0 flex-1 border-0"
              />
        </div>
      </div>
    </PageShell>
  );
}
