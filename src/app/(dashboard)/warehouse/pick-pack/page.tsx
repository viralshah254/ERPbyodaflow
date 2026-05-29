"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchPickPackTasks, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Picked", value: "PICKED" },
  { label: "Packed", value: "PACKED" },
  { label: "Dispatched", value: "DISPATCHED" },
  { label: "Completed", value: "COMPLETED" },
];

export default function PickPackPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [rows, setRows] = React.useState<WarehousePickPackRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPickPackTasks(statusFilter ? { status: statusFilter } : undefined)
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load pick-pack tasks.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.reference, row.customer, row.number].filter(Boolean).some((value) => value!.toLowerCase().includes(query))
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "reference", header: "Reference", accessor: (r: WarehousePickPackRow) => <span className="font-medium">{r.reference}</span>, sticky: true },
      { id: "delivery", header: "Delivery", accessor: (r: WarehousePickPackRow) => r.sourceDocumentNumber ?? "—" },
      { id: "deliveryStatus", header: "Delivery status", accessor: (r: WarehousePickPackRow) => r.sourceDocumentStatus ?? "—" },
      { id: "customer", header: "Customer", accessor: (r: WarehousePickPackRow) => r.customer ?? "—" },
      { id: "status", header: "Status", accessor: (r: WarehousePickPackRow) => <Badge variant="outline">{r.status}</Badge> },
      { id: "lines", header: "Lines", accessor: (r: WarehousePickPackRow) => r.lines.length },
      { id: "cartons", header: "Cartons", accessor: (r: WarehousePickPackRow) => r.cartonsCount ?? 0 },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Pick & Pack"
        description="Live warehouse execution tasks for picking, packing, and dispatch."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Pick & Pack" },
        ]}
        sticky
        showCommandHint
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by reference, customer..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[{ id: "status", label: "Status", options: STATUS_OPTIONS, value: statusFilter, onChange: setStatusFilter }]}
        />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Execution queue</h3>
            <p className="text-xs text-muted-foreground">Pick tasks now come from backend warehouse execution state.</p>
          </div>
          <DataTable<WarehousePickPackRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/pick-pack/${row.id}`)}
              emptyMessage={loading ? "Loading pick-pack tasks..." : "No pick-pack tasks."}
              scrollMode="fill"
              size="comfortable"
              className="min-h-0 flex-1 border-0"
              />
        </div>
      </div>
    </PageShell>
  );
}
