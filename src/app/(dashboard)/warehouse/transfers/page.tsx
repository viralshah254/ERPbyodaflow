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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportTransfersCsv, fetchTransfers, updateTransferStatus, type TransferRow, type TransferStatus } from "@/lib/api/warehouse-transfers";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { fetchProductsApi } from "@/lib/api/products";
import { fetchProductUomsApi } from "@/lib/api/uom";
import type { ProductRow } from "@/lib/types/masters";
import type { UomDefinition } from "@/lib/products/types";
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

  // Lookup data for dropdowns
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; label: string }>>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [uoms, setUoms] = React.useState<UomDefinition[]>([]);

  // Create transfer form state
  const [date, setDate] = React.useState("");
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [lineProductId, setLineProductId] = React.useState("");
  const [lineQty, setLineQty] = React.useState("");
  const [lineUnit, setLineUnit] = React.useState("");
  const [transferCostKes, setTransferCostKes] = React.useState("");
  const [costNotes, setCostNotes] = React.useState("");
  const [sourceGrnId, setSourceGrnId] = React.useState("");

  // Derived from selected product
  const selectedProduct = React.useMemo(
    () => products.find((p) => p.id === lineProductId) ?? null,
    [products, lineProductId]
  );

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

  React.useEffect(() => {
    void fetchWarehouseOptions().then(setWarehouses).catch(() => setWarehouses([]));
    void fetchProductsApi({ status: "ACTIVE" }).then(setProducts).catch(() => setProducts([]));
    void fetchProductUomsApi().then(setUoms).catch(() => setUoms([]));
  }, []);

  // When product changes, auto-fill unit from product's base UOM
  React.useEffect(() => {
    if (selectedProduct?.baseUom) {
      setLineUnit(selectedProduct.baseUom);
    }
  }, [selectedProduct]);

  const filtered = allRows;

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

  const resetForm = () => {
    setDate("");
    setFromWarehouseId("");
    setToWarehouseId("");
    setReference("");
    setLineProductId("");
    setLineQty("");
    setLineUnit("");
    setTransferCostKes("");
    setCostNotes("");
    setSourceGrnId("");
  };

  const handleCreateTransfer = async () => {
    if (!date || !fromWarehouseId || !toWarehouseId || !lineProductId || !lineQty) {
      toast.error("Date, from, to, product and quantity are required.");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("From and To warehouse must be different.");
      return;
    }
    const qty = Number(lineQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    setSavingTransfer(true);
    try {
      const costKes = transferCostKes.trim() ? Number(transferCostKes.trim()) : undefined;
      const res = await import("@/lib/api/warehouse-transfers").then((m) =>
        m.createTransfer({
          date,
          fromWarehouseId,
          toWarehouseId,
          reference: reference.trim() || undefined,
          lines: [
            {
              sku: selectedProduct?.sku ?? lineProductId,
              productName: selectedProduct?.name,
              quantity: qty,
              unit: lineUnit || selectedProduct?.unit || "pcs",
            },
          ],
          transferCostKes: Number.isFinite(costKes) && costKes! > 0 ? costKes : undefined,
          costNotes: costNotes.trim() || undefined,
          sourceGrnId: sourceGrnId.trim() || undefined,
        })
      );
      toast.success("Transfer created.");
      setCreateOpen(false);
      resetForm();
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
            <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
              <SheetTrigger asChild>
                <Button size="sm" data-tour-step="create-button">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Create transfer
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Create transfer</SheetTitle>
                  <SheetDescription>Move stock between two warehouses.</SheetDescription>
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
                    <Label>From warehouse</Label>
                    <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To warehouse</Label>
                    <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses
                          .filter((wh) => wh.id !== fromWarehouseId)
                          .map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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
                    <Label>Product / SKU</Label>
                    <Select value={lineProductId} onValueChange={setLineProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.sku ? `${p.sku} — ${p.name}` : p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProduct && (
                      <p className="text-xs text-muted-foreground">{selectedProduct.name}</p>
                    )}
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
                      <Select value={lineUnit} onValueChange={setLineUnit}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {uoms.map((u) => (
                            <SelectItem key={u.id} value={u.code}>
                              {u.code}
                            </SelectItem>
                          ))}
                          {uoms.length === 0 && (
                            <SelectItem value="pcs">pcs</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logistics cost (optional)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="transferCostKes">Transport cost (KES)</Label>
                        <Input
                          id="transferCostKes"
                          type="number"
                          min={0}
                          step="1"
                          placeholder="0"
                          value={transferCostKes}
                          onChange={(e) => setTransferCostKes(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sourceGrnId">Source GRN ID (optional)</Label>
                        <Input
                          id="sourceGrnId"
                          placeholder="Link to batch GRN"
                          value={sourceGrnId}
                          onChange={(e) => setSourceGrnId(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="costNotes">Cost description</Label>
                      <Input
                        id="costNotes"
                        placeholder="e.g. truck hire Kisumu → Nairobi"
                        value={costNotes}
                        onChange={(e) => setCostNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateTransfer} disabled={savingTransfer} className="w-full">
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
