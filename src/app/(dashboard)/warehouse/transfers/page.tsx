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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportTransfersCsv, fetchTransfers, updateTransferStatus, type TransferRow, type TransferStatus } from "@/lib/api/warehouse-transfers";
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
  const [allRows, setAllRows] = React.useState<TransferRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [savingTransfer, setSavingTransfer] = React.useState(false);

  // Create transfer form state (simple header + single line)
  const [date, setDate] = React.useState("");
  const [fromWarehouse, setFromWarehouse] = React.useState("");
  const [toWarehouse, setToWarehouse] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [lineSku, setLineSku] = React.useState("");
  const [lineProductName, setLineProductName] = React.useState("");
  const [lineQty, setLineQty] = React.useState("");
  const [lineUnit, setLineUnit] = React.useState("pcs");

  const load = React.useCallback(() => {
    setLoading(true);
    fetchTransfers({
      status: statusFilter || undefined,
      search: search || undefined,
    })
      .then(setAllRows)
      .catch((e) => {
        console.error(e);
        setAllRows([]);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = allRows; // filtering handled in fetchTransfers for now

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

  const handleBulk = async (action: "approve" | "transit" | "receive") => {
    if (selectedIds.length === 0) return;
    try {
      if (action === "approve") {
        await Promise.all(selected.filter((r) => r.status === "DRAFT").map((r) => updateTransferStatus(r.id, "APPROVED")));
        toast.success("Transfer(s) approved.");
      } else if (action === "transit") {
        await Promise.all(selected.filter((r) => r.status === "APPROVED").map((r) => updateTransferStatus(r.id, "IN_TRANSIT")));
        toast.success("Transfer(s) marked in transit.");
      } else {
        await Promise.all(
          selected
            .filter((r) => r.status === "IN_TRANSIT")
            .map((r) => updateTransferStatus(r.id, "RECEIVED"))
        );
        toast.success("Transfer(s) received.");
      }
      setSelectedIds([]);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCreateTransfer = async () => {
    if (!date || !fromWarehouse.trim() || !toWarehouse.trim() || !lineSku.trim() || !lineQty) {
      toast.error("Date, from, to, SKU and quantity are required.");
      return;
    }
    const qty = Number(lineQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    setSavingTransfer(true);
    try {
      const res = await import("@/lib/api/warehouse-transfers").then((m) =>
        m.createTransfer({
          date,
          fromWarehouseId: fromWarehouse.trim(),
          toWarehouseId: toWarehouse.trim(),
          reference: reference.trim() || undefined,
          lines: [
            {
              sku: lineSku.trim(),
              productName: lineProductName.trim() || undefined,
              quantity: qty,
              unit: lineUnit,
            },
          ],
        })
      );
      toast.success("Transfer created.");
      setCreateOpen(false);
      setDate("");
      setFromWarehouse("");
      setToWarehouse("");
      setReference("");
      setLineSku("");
      setLineProductName("");
      setLineQty("");
      setLineUnit("pcs");
      await load();
      router.push(`/warehouse/transfers/${res.id}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create transfer.");
    } finally {
      setSavingTransfer(false);
    }
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
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
              <SheetTrigger asChild>
                <Button size="sm" data-tour-step="create-button">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Create transfer
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Create transfer</SheetTitle>
                  <SheetDescription>Move stock between warehouses — WH-Main, WH-East, etc.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transferDate">Date</Label>
                    <Input
                      id="transferDate"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromWarehouse">From warehouse</Label>
                    <Input
                      id="fromWarehouse"
                      placeholder="e.g. WH-Main"
                      value={fromWarehouse}
                      onChange={(e) => setFromWarehouse(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toWarehouse">To warehouse</Label>
                    <Input
                      id="toWarehouse"
                      placeholder="e.g. WH-East"
                      value={toWarehouse}
                      onChange={(e) => setToWarehouse(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference (optional)</Label>
                    <Input
                      id="reference"
                      placeholder="Internal reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Line — SKU</Label>
                    <Input
                      placeholder="SKU-001"
                      value={lineSku}
                      onChange={(e) => setLineSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product name (optional)</Label>
                    <Input
                      placeholder="Product name"
                      value={lineProductName}
                      onChange={(e) => setLineProductName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={lineQty}
                        onChange={(e) => setLineQty(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input
                        value={lineUnit}
                        onChange={(e) => setLineUnit(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateTransfer} disabled={savingTransfer}>
                    {savingTransfer ? "Creating…" : "Create transfer"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
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
          onExport={() => exportTransfersCsv(filtered)}
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
            <CardDescription>Draft to approved to in transit to received with live warehouse movements.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading transfers…</div>
            ) : (
              <DataTable<TransferRow>
                data={filtered}
                columns={columns}
                onRowClick={(row) => router.push(`/warehouse/transfers/${row.id}`)}
                emptyMessage="No transfers."
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
