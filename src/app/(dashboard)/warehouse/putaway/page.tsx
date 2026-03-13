"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPutawayTasks, type WarehousePutawayRow } from "@/lib/api/warehouse-execution";
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
        accessor: (r: WarehousePutawayRow) => `${r.lines.reduce((sum, line) => sum + (line.putawayQty ?? 0), 0)}/${r.lines.reduce((sum, line) => sum + line.receivedQty, 0)}`,
      },
    ],
    []
  );

  return (
    <PageShell>
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
      <div className="space-y-4 p-6">
        <DataTableToolbar
          searchPlaceholder="Search by receipt, warehouse, PO..."
          searchValue={search}
          onSearchChange={setSearch}
        />
        <Card>
          <CardHeader>
            <CardTitle>Putaway queue</CardTitle>
            <CardDescription>Tasks are now stored and confirmed against backend bin locations.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<WarehousePutawayRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/putaway/${row.id}`)}
              emptyMessage={loading ? "Loading putaway tasks..." : "No putaway tasks."}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
