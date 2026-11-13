"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransfer, fetchTransferStock, type TransferStockRow } from "@/lib/api/warehouse-transfers";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import { fetchProductPackagingApi } from "@/lib/api/product-master";
import { activeDocumentAlternates } from "@/lib/docs/default-line-uom";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";

type TransferLineDraft = { productId: string; qty: string; unit: string };

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function todayInNairobi() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function NewTransferPage() {
  const router = useRouter();
  const canWrite = useCanWriteInventory();
  const [search, setSearch] = React.useState("");
  const [selectedOnly, setSelectedOnly] = React.useState(false);
  const [warehouseError, setWarehouseError] = React.useState("");
  const [savingTransfer, setSavingTransfer] = React.useState(false);

  const [warehouses, setWarehouses] = React.useState<LookupOption[]>([]);
  const [packaging, setPackaging] = React.useState<Record<string, ProductPackaging[]>>({});
  const [sourceStock, setSourceStock] = React.useState<TransferStockRow[]>([]);
  const [stockError, setStockError] = React.useState("");
  const [stockRefresh, setStockRefresh] = React.useState(0);
  const [stockLoading, setStockLoading] = React.useState(false);

  const [date, setDate] = React.useState(todayInNairobi);
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [lines, setLines] = React.useState<Record<string, TransferLineDraft>>({});
  const [transferCostKes, setTransferCostKes] = React.useState("");
  const [costNotes, setCostNotes] = React.useState("");
  const [sourceGrnId, setSourceGrnId] = React.useState("");

  const stockByProduct = React.useMemo(() => new Map(sourceStock.map((row) => [row.productId, row])), [sourceStock]);
  const selectedLines = Object.values(lines).filter((line) => line.qty.trim() !== "" && Number(line.qty) !== 0);
  const visibleStock = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return sourceStock
      .filter((row) => [row.name, row.sku, row.code, row.barcode].some((value) => value?.toLowerCase().includes(query)))
      .sort((a, b) => (a.sku || a.name).localeCompare(b.sku || b.name, undefined, { numeric: true }));
  }, [sourceStock, search]);
  const rows = selectedOnly ? visibleStock.filter((row) => Number(lines[row.productId]?.qty ?? 0) !== 0) : visibleStock;

  React.useEffect(() => {
    if (!canWrite) return;
    void fetchWarehouseOptions({ includeTransferEligibility: true }).then(setWarehouses).catch((error: Error) => setWarehouseError(error.message));
  }, [canWrite]);

  React.useEffect(() => {
    if (!fromWarehouseId) {
      setSourceStock([]);
      setStockLoading(false);
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    setStockError("");
    setSourceStock([]);
    void fetchTransferStock(fromWarehouseId)
      .then((rows) => {
        if (!cancelled) setSourceStock(rows);
      })
      .catch((error: Error) => {
        if (!cancelled) setStockError(error.message || "Warehouse stock could not load.");
      })
      .finally(() => {
        if (!cancelled) setStockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromWarehouseId, stockRefresh]);

  function updateLine(row: TransferStockRow, patch: Partial<TransferLineDraft>) {
    setLines((current) => ({
      ...current,
      [row.productId]: { ...(current[row.productId] ?? { productId: row.productId, qty: "", unit: row.uom }), ...patch },
    }));
  }

  function loadUnits(row: TransferStockRow) {
    if (Object.hasOwn(packaging, row.productId)) return;
    setPackaging((current) => ({ ...current, [row.productId]: [] }));
    void fetchProductPackagingApi(row.productId)
      .then((units) => setPackaging((current) => ({ ...current, [row.productId]: units })))
      .catch(() => toast.error("Alternate units could not be loaded. You can use the stock unit."));
  }

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

  const hasValidLines = selectedLines.length > 0 && selectedLines.every((line) => {
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
    const filled = selectedLines;
    if (filled.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    const payloadLines: { productId: string; sku: string; productName?: string; quantity: number; unit?: string }[] = [];
    for (const line of filled) {
      const { stock, qty, factor, over, unit } = lineDetails(line);
      if (!line.productId || !stock) {
        toast.error("Each line needs a product that has stock in the source warehouse.");
        return;
      }
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
      const res = await createTransfer({
        date,
        fromWarehouseId,
        toWarehouseId,
        reference: reference.trim() || undefined,
        lines: payloadLines,
        transferCostKes: Number.isFinite(costKes) && costKes! > 0 ? costKes : undefined,
        costNotes: costNotes.trim() || undefined,
        sourceGrnId: sourceGrnId.trim() || undefined,
      });
      toast.success("Transfer created.");
      router.replace(`/warehouse/transfers/${res.id}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create transfer.");
    } finally {
      setSavingTransfer(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="Create transfer" breadcrumbs={[
        { label: "Warehouse", href: "/warehouse/overview" },
        { label: "Transfers", href: "/warehouse/transfers" },
        { label: "Create transfer" },
      ]} />
      {canWrite ? (
        <div className="space-y-4">
          <section className="rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
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
                      setLines({});
                      setSearch("");
                      setSelectedOnly(false);
                      setStockLoading(true);
                      if (toWarehouseId === value) setToWarehouseId("");
                    }}
                  >
                    <SelectTrigger id="transfer-from-warehouse">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id} disabled={Boolean(wh.transferSourceBlock)}>
                          {wh.label}{wh.transferSourceBlock && ` · ${wh.transferSourceBlock}`}
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
            </div>

            {warehouseError && <p role="alert" className="mt-2 text-sm text-destructive">{warehouseError}</p>}
          </section>
          <section className="overflow-hidden rounded-lg border" aria-labelledby="source-stock">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <h2 id="source-stock" className="font-semibold">Source warehouse stock</h2>
              <Input className="w-full sm:w-72" aria-label="Search source stock" placeholder="Name, SKU, code or barcode"
                value={search} onChange={(event) => setSearch(event.target.value)} disabled={!sourceStock.length} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedOnly} disabled={!sourceStock.length}
                  onChange={(event) => setSelectedOnly(event.target.checked)} />
                Selected products only
              </label>
            </div>
            {!fromWarehouseId ? <p className="p-4 text-sm text-muted-foreground">Select a source warehouse to see its products.</p>
              : stockLoading ? <p role="status" className="p-4 text-sm">Loading warehouse stock…</p>
              : stockError ? <p role="alert" className="p-4 text-sm text-destructive">{stockError}{" "}
                <button type="button" className="underline" onClick={() => setStockRefresh((value) => value + 1)}>Retry</button></p>
              : !rows.length ? <p className="p-4 text-sm text-muted-foreground">{sourceStock.length ? "No products match your filters." : "This warehouse has no stock."}</p>
              : (
                <div className="max-h-[60dvh] overflow-auto">
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead className="sticky top-0 z-10 bg-card text-left">
                      <tr><th className="p-3">Product</th><th className="p-3">Available</th><th className="p-3">Transfer quantity</th><th className="p-3">Unit</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const line = lines[row.productId] ?? { productId: row.productId, qty: "", unit: row.uom };
                        const { base, alternates, unit, factor, baseQty, over } = lineDetails(line);
                        const hint = `transfer-stock-${encodeURIComponent(row.productId)}`;
                        return (
                          <tr key={row.productId} className="border-t align-top">
                            <th scope="row" className="p-3 text-left font-medium">
                              {row.name}
                              <span className="block text-xs text-muted-foreground">{[...new Set([row.sku, row.code, row.barcode].filter(Boolean))].join(" · ")}</span>
                            </th>
                            <td id={hint} className="p-3">
                              <p className={over ? "font-medium text-destructive" : "font-medium"}>{formatQty(row.available)} {base}</p>
                              {row.reserved > 0 && <p className="text-xs text-muted-foreground">{formatQty(row.quantity)} on hand · {formatQty(row.reserved)} reserved</p>}
                              {over && <p className="text-xs text-destructive">Reduce by {formatQty(baseQty - row.available)} {base}.</p>}
                              {!over && unit !== base && factor && Number(line.qty) > 0 && <p className="text-xs text-muted-foreground">{formatQty(baseQty)} {base} required</p>}
                            </td>
                            <td className="w-40 p-3">
                              <Input type="number" min={0} step="any" placeholder="0" value={line.qty}
                                aria-label={`Quantity for ${row.name} ${row.sku ?? ""}`.trim()} aria-invalid={over || Number(line.qty) < 0}
                                aria-describedby={hint} disabled={savingTransfer || row.available <= 0}
                                onChange={(event) => updateLine(row, { qty: event.target.value })} />
                            </td>
                            <td className="w-48 p-3">
                              <Select value={unit} onValueChange={(next) => updateLine(row, { unit: next })} onOpenChange={(open) => { if (open) loadUnits(row); }} disabled={savingTransfer || row.available <= 0}>
                                <SelectTrigger aria-label={`Unit for ${row.name}`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={base}>{base}</SelectItem>
                                  {alternates.map((alternate) => <SelectItem key={alternate.uom} value={alternate.uom}>{alternate.uom} · {formatQty(alternate.unitsPer)} {base}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
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

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-background py-3">
            <span className="mr-auto text-sm text-muted-foreground" aria-live="polite">{selectedLines.length} products selected</span>
            <Button variant="outline" asChild><Link href="/warehouse/transfers">Cancel</Link></Button>
            <Button onClick={handleCreateTransfer} disabled={savingTransfer || stockLoading || Boolean(stockError) || !date || !fromWarehouseId || !toWarehouseId || !hasValidLines}>
              {savingTransfer ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground">You need inventory write access to create transfers.</p>}
    </PageShell>
  );
}
