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
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportTransfersCsv, fetchTransfers, fetchTransferStock, updateTransferStatus, type TransferStockRow, type TransferRow, type TransferStatus } from "@/lib/api/warehouse-transfers";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { fetchProductPackagingApi } from "@/lib/api/product-master";
import { activeDocumentAlternates } from "@/lib/docs/default-line-uom";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import { Combobox } from "@/components/ui/combobox";
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
  return Number.isInteger(n) ? String(n) : n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function todayInNairobi() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
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
  const [packaging, setPackaging] = React.useState<Record<string, ProductPackaging[]>>({});
  const [sourceStock, setSourceStock] = React.useState<TransferStockRow[]>([]);
  const [stockError, setStockError] = React.useState(false);
  const [stockRefresh, setStockRefresh] = React.useState(0);
  const [stockLoading, setStockLoading] = React.useState(false);

  // Create transfer form state
  const [date, setDate] = React.useState(todayInNairobi);
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [lines, setLines] = React.useState<TransferLineDraft[]>(() => [newLine()]);
  const [transferCostKes, setTransferCostKes] = React.useState("");
  const [costNotes, setCostNotes] = React.useState("");
  const [sourceGrnId, setSourceGrnId] = React.useState("");

  const stockByProduct = React.useMemo(() => {
    const map = new Map<string, TransferStockRow>();
    for (const row of sourceStock) {
      map.set(row.productId, row);
    }
    return map;
  }, [sourceStock]);

  const transferableProducts = React.useMemo(
    () =>
      [...stockByProduct.values()].filter((row) => row.available > 0).sort((a, b) =>
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
  }, []);

  React.useEffect(() => {
    if (!fromWarehouseId) {
      setSourceStock([]);
      setStockLoading(false);
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    setStockError(false);
    setSourceStock([]);
    void fetchTransferStock(fromWarehouseId)
      .then((rows) => {
        if (!cancelled) setSourceStock(rows);
      })
      .catch(() => {
        if (!cancelled) setStockError(true);
      })
      .finally(() => {
        if (!cancelled) setStockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromWarehouseId, stockRefresh]);

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
    setDate(todayInNairobi());
    setFromWarehouseId("");
    setToWarehouseId("");
    setReference("");
    setLines([newLine()]);
    setPackaging({});
    setTransferCostKes("");
    setCostNotes("");
    setSourceGrnId("");
  };

  const updateLine = (key: string, patch: Partial<TransferLineDraft>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const lineDetails = (line: TransferLineDraft) => {
    const stock = stockByProduct.get(line.productId);
    const base = stock?.uom || line.unit || "EA";
    const alternates = activeDocumentAlternates(packaging[line.productId]).filter((row) => row.uom !== base);
    const unit = line.unit || base;
    const factor = unit === base ? 1 : alternates.find((row) => row.uom === unit)?.unitsPer;
    const qty = Number(line.qty);
    const baseQty = qty * (factor ?? 0);
    return { stock, base, alternates, unit, factor, qty, baseQty, over: Boolean(stock && baseQty > stock.available + 1e-9) };
  };

  const hasValidLines = lines.some((line) => line.productId || line.qty.trim()) && lines.every((line) => {
    if (!line.productId && !line.qty.trim()) return true;
    const { stock, factor, baseQty, over } = lineDetails(line);
    return Boolean(stock && factor && Number.isFinite(baseQty) && baseQty > 0 && !over);
  });

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
      const { stock, qty, factor, over, unit } = lineDetails(line);
      if (!line.productId || !stock) {
        toast.error("Each line needs a product that has stock in the source warehouse.");
        return;
      }
      if (seen.has(line.productId)) {
        toast.error(`${stock.sku || stock.name} is already on this transfer.`);
        return;
      }
      seen.add(line.productId);
      if (!factor || !Number.isFinite(qty) || qty <= 0) {
        toast.error(`Enter a quantity for ${stock.sku || stock.name}.`);
        return;
      }
      if (over) {
        toast.error(
          `${stock.sku || stock.name} only has ${formatQty(stock.available)} ${stock.uom || line.unit || "EA"} available.`
        );
        return;
      }
      payloadLines.push({
        productId: line.productId,
        sku: stock.sku ?? stock.productId,
        productName: stock.name,
        quantity: qty,
        unit,
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
              <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-3xl">
                <SheetHeader>
                  <SheetTitle>Create transfer</SheetTitle>
                  <SheetDescription>Move stock between two warehouses.</SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
                  <div className="space-y-2">
                    <Label htmlFor="transferDate">Date</Label>
                    <Input
                      id="transferDate"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-from-warehouse">From warehouse</Label>
                    <Select
                      value={fromWarehouseId}
                      onValueChange={(value) => {
                        setFromWarehouseId(value);
                        setSourceStock([]);
                        setStockLoading(true);
                        if (toWarehouseId === value) setToWarehouseId("");
                      }}
                    >
                      <SelectTrigger id="transfer-from-warehouse">
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
                    <Label htmlFor="transfer-to-warehouse">To warehouse</Label>
                    <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                      <SelectTrigger id="transfer-to-warehouse">
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
                    ) : stockError ? (
                      <p className="text-sm text-destructive">Stock could not load. <button type="button" className="underline" onClick={() => setStockRefresh((value) => value + 1)}>Retry</button></p>
                    ) : transferableProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No stock available to transfer from this warehouse.</p>
                    ) : null}
                    {lines.map((line, index) => {
                      const { stock, base, alternates, unit, factor, baseQty, over } = lineDetails(line);
                      const usedElsewhere = new Set(lines.filter((other) => other.key !== line.key).map((other) => other.productId));
                      const options = transferableProducts.filter((row) => !usedElsewhere.has(row.productId));
                      if (stock && !options.some((row) => row.productId === stock.productId)) options.unshift(stock);
                      const quantityId = `transfer-qty-${line.key}`;
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
                          <Combobox
                            value={line.productId}
                            onChange={(productId) => {
                              const next = stockByProduct.get(productId);
                              updateLine(line.key, { productId, unit: next?.uom ?? "" });
                              if (productId && !packaging[productId]) {
                                void fetchProductPackagingApi(productId)
                                  .then((rows) => setPackaging((current) => ({ ...current, [productId]: rows })))
                                  .catch(() => toast.error("Alternate units could not be loaded. You can use the stock unit."));
                              }
                            }}
                            options={[
                              ...options.map((row) => ({ value: row.productId, label: [...new Set([row.sku, row.code, row.name, row.barcode].filter(Boolean))].join(" · ") })),
                              ...(line.productId && !stock ? [{ value: line.productId, label: "Previously selected product" }] : []),
                            ]}
                            searchPlaceholder="Search name, SKU, code or barcode"
                            placeholder={fromWarehouseId ? "Select product" : "Choose source warehouse first"}
                            disabled={!fromWarehouseId || stockLoading || stockError}
                          />
                          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                            <div className="space-y-1">
                              <Label htmlFor={quantityId}>Quantity</Label>
                              <Input
                                id={quantityId}
                                type="number"
                                min={0}
                                step="any"
                                value={line.qty}
                                aria-invalid={over || Boolean(line.productId && !stock && !stockLoading)}
                                aria-describedby={`${quantityId}-stock`}
                                onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                              />
                              <div id={`${quantityId}-stock`} aria-live="polite" className="text-xs">
                                {stock ? (
                                  <>
                                    <p className={over ? "font-medium text-destructive" : "text-muted-foreground"}>
                                      {over ? `Only ${formatQty(stock.available)} ${base} available. Reduce by ${formatQty(baseQty - stock.available)} ${base}.` : `Available: ${formatQty(stock.available)} ${base}`}
                                    </p>
                                    {stock.reserved > 0 && <p className="text-muted-foreground">{formatQty(stock.quantity)} on hand · {formatQty(stock.reserved)} reserved</p>}
                                    {unit !== base && factor != null && Number(line.qty) > 0 && <p className="text-muted-foreground">{formatQty(Number(line.qty))} {unit} = {formatQty(baseQty)} {base}</p>}
                                  </>
                                ) : line.productId && !stockLoading && <p className="text-destructive">This product is unavailable at the selected source. Choose another product.</p>}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`${quantityId}-uom`}>Unit</Label>
                              <Select value={unit} onValueChange={(next) => updateLine(line.key, { unit: next })} disabled={!stock || alternates.length === 0}>
                                <SelectTrigger id={`${quantityId}-uom`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={base}>{base}</SelectItem>
                                  {alternates.map((row) => <SelectItem key={row.uom} value={row.uom}>{row.uom} · {formatQty(row.unitsPer)} {base}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <details className="space-y-3 border-t pt-3">
                    <summary className="cursor-pointer text-sm font-medium">Optional details</summary>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference (optional)</Label>
                    <Input
                      id="reference"
                      placeholder="Internal reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>

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
                  </details>
                </div>
                <SheetFooter className="shrink-0 border-t pt-4">
                  <Button variant="outline" disabled={savingTransfer} onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleCreateTransfer} disabled={savingTransfer || stockLoading || stockError || !date || !fromWarehouseId || !toWarehouseId || !hasValidLines}>
                    {savingTransfer ? "Saving…" : "Save draft"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>}
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by transfer number or reference"
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
                className="min-h-0 flex-1 border-0" searchable={false}
                />
            )}
        </div>
      </div>
    </PageShell>
  );
}
