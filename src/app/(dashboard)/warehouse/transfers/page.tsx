"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMockTransfers, type TransferRow, type TransferStatus } from "@/lib/mock/warehouse/transfers";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Approved", value: "APPROVED" },
  { label: "In transit", value: "IN_TRANSIT" },
  { label: "Received", value: "RECEIVED" },
];

function statusVariant(s: TransferStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "RECEIVED") return "secondary";
  if (s === "IN_TRANSIT") return "default";
  if (s === "DRAFT") return "outline";
  return "default";
}

export default function WarehouseTransfersPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const allRows = React.useMemo(() => getMockTransfers(), []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.fromWarehouse.toLowerCase().includes(q) ||
          r.toWarehouse.toLowerCase().includes(q)
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    return out;
  }, [allRows, search, statusFilter]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: TransferRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "date", header: "Date", accessor: "date" as keyof TransferRow },
      { id: "from", header: "From", accessor: "fromWarehouse" as keyof TransferRow },
      { id: "to", header: "To", accessor: "toWarehouse" as keyof TransferRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: TransferRow) => <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>,
      },
      {
        id: "lines",
        header: "Lines",
        accessor: (r: TransferRow) => r.lines.length,
      },
    ],
    []
  );

  const selected = selectedIds.length > 0 ? filtered.filter((r) => selectedIds.includes(r.id)) : [];
  const canApprove = selected.some((r) => r.status === "DRAFT");
  const canMarkInTransit = selected.some((r) => r.status === "APPROVED");
  const canReceive = selected.some((r) => r.status === "IN_TRANSIT");

  const handleBulk = (action: "approve" | "transit" | "receive") => {
    toast.info(`${action} (stub): ${selectedIds.length} transfer(s). API pending.`);
    setSelectedIds([]);
  };

  return (
    <PageShell>
      <PageHeader
        title="Transfers"
        description="Inter-warehouse transfers"
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Transfers" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain inter-warehouse transfers and status lifecycle." label="Explain transfers" />
            <Button size="sm" onClick={() => toast.info("Create transfer (stub). API pending.")}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create transfer
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, warehouse..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { id: "status", label: "Status", options: STATUS_OPTIONS, value: statusFilter, onChange: (v) => setStatusFilter(v) },
          ]}
          onExport={() => toast.info("Export (stub)")}
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                {canApprove && (
                  <Button variant="outline" size="sm" onClick={() => handleBulk("approve")}>
                    Approve
                  </Button>
                )}
                {canMarkInTransit && (
                  <Button variant="outline" size="sm" onClick={() => handleBulk("transit")}>
                    Mark in transit
                  </Button>
                )}
                {canReceive && (
                  <Button variant="outline" size="sm" onClick={() => handleBulk("receive")}>
                    Receive
                  </Button>
                )}
              </div>
            ) : undefined
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Transfers</CardTitle>
            <CardDescription>Draft → Approved → In transit → Received. Bulk actions are stubs.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<TransferRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/transfers/${row.id}`)}
              emptyMessage="No transfers."
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
