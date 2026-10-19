"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
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
import { fetchStockLevelsApi, type InventoryStockRow } from "@/lib/api/inventory-stock";
import { fetchProductUomsApi } from "@/lib/api/uom";
import type { UomDefinition } from "@/lib/products/types";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Approved", value: "APPROVED" },
  { label: "In transit", value: "IN_TRANSIT" },
  { label: "Received", value: "RECEIVED" },
];

type TransferLineDraft = {
  key: string;
  productId: string;
  qty: string;
  unit: string;
};

function newLine(): TransferLineDraft {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, productId: "", qty: "", unit: "" };
}

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function statusVariant(s: TransferStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "RECEIVED") return "secondary";
  if (s === "IN_TRANSIT") return "default";
  if (s === "DRAFT") return "outline";
  return "default";
}

export default function WarehouseTransfersPage() {
  const router = useRouter();
  const canWrite = useCanWriteInventory();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [allRows, setAllRows] = React.useState<TransferRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [savingTransfer, setSavingTransfer] = React.useState(false);

  // Lookup data for dropdowns
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; label: string }>>([]);
  const [uoms, setUoms] = React.useState<UomDefinition[]>([]);
  const [sourceStock, setSourceStock] = React.useState<InventoryStockRow[]>([]);
  const [stockLoading, setStockLoading] = React.useState(false);

  // Create transfer form state
  const [date, setDate] = React.useState("");
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [lines, setLines] = React.useState<TransferLineDraft[]>(() => [newLine()]);
  const [transferCostKes, setTransferCostKes] = React.useState("");
  const [costNotes, setCostNotes] = React.useState("");
  const [sourceGrnId, setSourceGrnId] = React.useState("");

  const stockByProduct = React.useMemo(() => {
    const map = new Map<string, InventoryStockRow>();
    for (const row of sourceStock) {
      if (!row.productId || row.available <= 0) continue;
      map.set(row.productId, row);
    }
    return map;
  }, [sourceStock]);

  const transferableProducts = React.useMemo(
    () =>
      [...stockByProduct.values()].sort((a, b) =>
        (a.sku || a.name).localeCompare(b.sku || b.name)
      ),
    [stockByProduct]
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
    void fetchProductUomsApi().then(setUoms).catch(() => setUoms([]));
  }, []);

  React.useEffect(() => {
    if (!fromWarehouseId) {
      setSourceStock([]);
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    void fetchStockLevelsApi({ warehouseId: fromWarehouseId, limit: 100 })
      .then((rows) => {
        if (!cancelled) setSourceStock(rows);
      })
      .catch(() => {
        if (!cancelled) setSourceStock([]);
      })
      .finally(() => {
        if (!cancelled) setStockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromWarehouseId]);

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
    setLines([newLine()]);
    setTransferCostKes("");
    setCostNotes("");
    setSourceGrnId("");
  };

  const updateLine = (key: string, patch: Partial<TransferLineDraft>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const handleCreateTransfer = async () => {
    if (!date || !fromWarehouseId || !toWarehouseId) {
      toast.error("Date, from, and to warehouse are required.");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("From and To warehouse must be different.");
      return;
    }
    const filled = lines.filter((line) => line.productId || line.qty.trim());
    if (filled.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    const seen = new Set<string>();
    const payloadLines: { productId: string; sku: string; productName?: string; quantity: number; unit?: string }[] = [];
    for (const line of filled) {
      const stock = stockByProduct.get(line.productId);
      if (!line.productId || !stock) {
        toast.error("Each line needs a product that has stock in the source warehouse.");
        return;
      }
      if (seen.has(line.productId)) {
        toast.error(`${stock.sku || stock.name} is already on this transfer.`);
        return;
      }
      seen.add(line.productId);
      const qty = Number(line.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Enter a quantity for ${stock.sku || stock.name}.`);
        return;
      }
      if (qty > stock.available + 1e-9) {
        toast.error(
          `${stock.sku || stock.name} only has ${formatQty(stock.available)} ${stock.uom || line.unit || "EA"} available.`
        );
        return;
      }
      payloadLines.push({
        productId: line.productId,
        sku: stock.sku,
        productName: stock.name,
        quantity: qty,
        unit: line.unit || stock.uom || "EA",
      });
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
          lines: payloadLines,
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
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
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
            {canWrite && <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
              <SheetTrigger asChild>
                <Button size="sm" data-tour-step="create-button">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Create transfer
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
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
                    <Select
                      value={fromWarehouseId}
                      onValueChange={(value) => {
                        setFromWarehouseId(value);
                        setLines([newLine()]);
                      }}
                    >
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Products</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!fromWarehouseId || stockLoading || transferableProducts.length === 0}
                        onClick={() => {
                          const used = new Set(lines.map((line) => line.productId).filter(Boolean));
                          if (transferableProducts.every((row) => used.has(row.productId ?? ""))) {
                            toast.error("Every product with stock is already on this transfer.");
                            return;
                          }
                          setLines((current) => [...current, newLine()]);
                        }}
                      >
                        <Icons.Plus className="mr-1 h-3.5 w-3.5" />
                        Add product
                      </Button>
                    </div>
                    {!fromWarehouseId ? (
                      <p className="text-xs text-muted-foreground">Select a source warehouse to see stock you can transfer.</p>
                    ) : stockLoading ? (
                      <p className="text-xs text-muted-foreground">Loading stock in this warehouse…</p>
                    ) : transferableProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No stock available to transfer from this warehouse.</p>
                    ) : null}
                    {lines.map((line, index) => {
                      const stock = line.productId ? stockByProduct.get(line.productId) : undefined;
                      const usedElsewhere = new Set(
                        lines.filter((other) => other.key !== line.key).map((other) => other.productId)
                      );
                      const options = transferableProducts.filter(
                        (row) => row.productId === line.productId || !usedElsewhere.has(row.productId ?? "")
                      );
                      const qty = Number(line.qty);
                      const over =
                        stock != null && Number.isFinite(qty) && qty > stock.available + 1e-9;
                      const unit = line.unit || stock?.uom || "EA";
                      return (
                        <div key={line.key} className="space-y-2 rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Product {index + 1}</span>
                            {lines.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                          <Select
                            value={line.productId}
                            onValueChange={(productId) => {
                              const next = stockByProduct.get(productId);
                              updateLine(line.key, {
                                productId,
                                unit: next?.uom || line.unit,
                              });
                            }}
                            disabled={!fromWarehouseId || stockLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={fromWarehouseId ? "Select product" : "Choose source warehouse first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((row) => (
                                <SelectItem key={row.productId} value={row.productId ?? row.id}>
                                  {row.sku ? `${row.sku} — ${row.name}` : row.name}
                                  {` · ${formatQty(row.available)} ${row.uom || "EA"} available`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {stock ? (
                            <p className={`text-xs ${over ? "text-destructive" : "text-muted-foreground"}`}>
                              Available to transfer: {formatQty(stock.available)} {unit}
                              {stock.reserved > 0
                                ? ` (${formatQty(stock.quantity)} on hand, ${formatQty(stock.reserved)} reserved)`
                                : ""}
                            </p>
                          ) : null}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min={0}
                                max={stock?.available}
                                step={0.01}
                                value={line.qty}
                                onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Unit</Label>
                              <Select value={line.unit} onValueChange={(unit) => updateLine(line.key, { unit })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {uoms.map((u) => (
                                    <SelectItem key={u.id} value={u.code}>
                                      {u.code}
                                    </SelectItem>
                                  ))}
                                  {uoms.length === 0 && <SelectItem value="EA">EA</SelectItem>}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
            </Sheet>}
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by number, warehouse..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { id: "status", label: "Status", options: STATUS_OPTIONS, value: statusFilter, onChange: (v) => setStatusFilter(v) },
          ]}
          onExport={() => exportTransfersCsv(filtered)}
          bulkActions={
            selectedIds.length > 0 && canWrite ? (
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
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Transfers</h3>
            <p className="text-xs text-muted-foreground">Draft to approved to in transit to received with live warehouse movements.</p>
          </div>
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
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0"
                />
            )}
        </div>
      </div>
    </PageShell>
  );
}
