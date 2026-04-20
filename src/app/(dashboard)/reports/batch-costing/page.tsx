"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchBatchCostingReportApi,
  fetchBatchCostSummaryApi,
  downloadBatchCostingCsvApi,
  type BatchCostingRow,
  type BatchCostSummary,
} from "@/lib/api/reports";
import {
  fetchPriceListsApi,
  fetchPriceListByIdApi,
  updatePriceListApi,
  type PriceListDetail,
} from "@/lib/api/pricing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toLocaleString("en-KE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function CostBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs tabular-nums w-20 text-right">{fmt(value, 0)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-16">
        <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BatchCostingReportPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = React.useState(firstOfMonth);
  const [dateTo, setDateTo] = React.useState(todayStr);
  const [margin, setMargin] = React.useState(30);
  const [rows, setRows] = React.useState<BatchCostingRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  // Publish-to-price-list state
  const [publishRow, setPublishRow] = React.useState<BatchCostingRow | null>(null);
  const [publishSummary, setPublishSummary] = React.useState<BatchCostSummary | null>(null);
  const [priceLists, setPriceLists] = React.useState<PriceListDetail[]>([]);
  const [selectedListId, setSelectedListId] = React.useState("");
  const [publishPrices, setPublishPrices] = React.useState<Record<string, string>>({});
  const [publishLoading, setPublishLoading] = React.useState(false);
  const [publishSaving, setPublishSaving] = React.useState(false);

  const openPublish = React.useCallback(async (row: BatchCostingRow) => {
    setPublishRow(row);
    setSelectedListId("");
    setPublishSummary(null);
    setPublishPrices({});
    setPublishLoading(true);
    try {
      const [summary, lists] = await Promise.all([
        fetchBatchCostSummaryApi(row.grnId),
        fetchPriceListsApi(),
      ]);
      setPublishSummary(summary);
      setPriceLists(lists);
      const defaultPrice = row.recommendedSellPricePerKg != null
        ? String(row.recommendedSellPricePerKg.toFixed(2))
        : "";
      const prices: Record<string, string> = {};
      for (const line of summary.productLines) {
        prices[line.productId] = defaultPrice;
      }
      setPublishPrices(prices);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load batch details.");
      setPublishRow(null);
    } finally {
      setPublishLoading(false);
    }
  }, []);

  const closePublish = React.useCallback(() => {
    setPublishRow(null);
    setPublishSummary(null);
  }, []);

  const savePublish = React.useCallback(async () => {
    if (!selectedListId || !publishSummary) return;
    setPublishSaving(true);
    try {
      const existing = await fetchPriceListByIdApi(selectedListId);
      const mergedItems = [...(existing?.items ?? [])];
      for (const line of publishSummary.productLines) {
        const price = parseFloat(publishPrices[line.productId] ?? "");
        if (isNaN(price) || price <= 0) continue;
        const idx = mergedItems.findIndex((it) => it.productId === line.productId);
        if (idx >= 0) {
          mergedItems[idx] = { ...mergedItems[idx], price };
        } else {
          mergedItems.push({ productId: line.productId, price });
        }
      }
      await updatePriceListApi(selectedListId, { items: mergedItems });
      const listName = priceLists.find((l) => l.id === selectedListId)?.name ?? "price list";
      toast.success(`Prices published to "${listName}".`);
      closePublish();
    } catch (err) {
      toast.error((err as Error).message || "Failed to publish prices.");
    } finally {
      setPublishSaving(false);
    }
  }, [selectedListId, publishSummary, publishPrices, priceLists, closePublish]);

  const load = React.useCallback(async () => {
    if (!isApiConfigured()) {
      toast.error("API not configured.");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchBatchCostingReportApi({ dateFrom, dateTo, margin });
      setRows(data.items);
      setHasLoaded(true);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load batch costing report.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, margin]);

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = React.useMemo(() => {
    const totalCost = rows.reduce((s, r) => s + r.totalLandedCostKes, 0);
    const totalPo = rows.reduce((s, r) => s + r.poValueKes, 0);
    const totalLanded = rows.reduce((s, r) => s + r.landedCostsKes, 0);
    const totalProcessing = rows.reduce((s, r) => s + r.processingCostsKes, 0);
    const totalTransfer = rows.reduce((s, r) => s + r.transferCostKes, 0);
    const totalKgRaw = rows.reduce((s, r) => s + r.receivedKg, 0);
    return { totalCost, totalPo, totalLanded, totalProcessing, totalTransfer, totalKgRaw };
  }, [rows]);

  return (
    <PageShell>
      <PageHeader
        title="Batch Costing Report"
        description="Total landed cost per GRN batch — PO price + logistics + processing + transfers. Calculate cost per kg and recommended selling price."
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Batch Costing" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadBatchCostingCsvApi({ dateFrom, dateTo, margin }, (msg) => toast.error(msg))
            }
          >
            <Icons.Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5 min-w-36">
                <Label htmlFor="dateFrom">From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 min-w-36">
                <Label htmlFor="dateTo">To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 w-32">
                <Label htmlFor="margin">
                  Margin %
                  <span className="ml-1 text-xs text-muted-foreground">(for sell price)</span>
                </Label>
                <Input
                  id="margin"
                  type="number"
                  min={0}
                  max={200}
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                />
              </div>
              <Button onClick={load} disabled={loading}>
                {loading ? (
                  <>
                    <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <Icons.Search className="h-4 w-4 mr-2" />
                    Run Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Tiles */}
        {hasLoaded && rows.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Batches</CardDescription>
                <CardTitle className="text-2xl">{rows.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{fmt(totals.totalKgRaw, 0)} kg received</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Total Landed Cost</CardDescription>
                <CardTitle className="text-2xl">KES {fmt(totals.totalCost, 0)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  PO {fmt(totals.totalPo, 0)} · Landed {fmt(totals.totalLanded, 0)} · Processing {fmt(totals.totalProcessing, 0)} · Transfer {fmt(totals.totalTransfer, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Avg Cost / kg (raw)</CardDescription>
                <CardTitle className="text-2xl">
                  KES {totals.totalKgRaw > 0 ? fmt(totals.totalCost / totals.totalKgRaw) : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Across all batches</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Batches with Yield Data</CardDescription>
                <CardTitle className="text-2xl">{rows.filter((r) => r.hasYieldData).length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">of {rows.length} have processed kg recorded</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cost breakdown by batch</CardTitle>
            <CardDescription>
              Each row is one GRN batch. Cost layers sum to the total landed cost. Set margin % above to see recommended selling price.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Icons.Loader2 className="h-6 w-6 animate-spin" />
                Loading batches…
              </div>
            ) : !hasLoaded ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Set filters above and click Run Report.
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No GRN batches found for the selected period.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-28">GRN #</TableHead>
                    <TableHead className="min-w-24">Date</TableHead>
                    <TableHead className="min-w-40">Products</TableHead>
                    <TableHead className="text-right min-w-20">Rcvd kg</TableHead>
                    <TableHead className="min-w-52">Cost layers (KES)</TableHead>
                    <TableHead className="text-right min-w-28 font-semibold">Total (KES)</TableHead>
                    <TableHead className="text-right min-w-24">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help">Cost/kg raw</span>
                          </TooltipTrigger>
                          <TooltipContent>Total landed cost ÷ received kg</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right min-w-24">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help">Yield kg</span>
                          </TooltipTrigger>
                          <TooltipContent>Primary output kg from processing (WorkOrderYield)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right min-w-28">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help">Cost/kg processed</span>
                          </TooltipTrigger>
                          <TooltipContent>Total landed cost ÷ processed output kg</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right min-w-32 text-green-700">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help">Sell at KES/kg</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Cost/kg × (1 + {margin}% margin). Uses processed kg if available, else raw.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="min-w-24">Data</TableHead>
                    <TableHead className="min-w-28">Publish</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.grnId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/inventory/receipts/${row.grnId}`}
                          className="text-primary hover:underline"
                        >
                          {row.grnNumber ?? row.grnId.slice(0, 8)}
                        </Link>
                        {row.poNumber && (
                          <div className="text-xs text-muted-foreground mt-0.5">PO: {row.poNumber}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(row.date)}</TableCell>
                      <TableCell className="text-sm max-w-48 truncate" title={row.products}>
                        {row.products || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.receivedKg, 1)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5 py-1 min-w-48">
                          <CostBar value={row.poValueKes} total={row.totalLandedCostKes} />
                          {row.landedCostsKes > 0 && (
                            <CostBar value={row.landedCostsKes} total={row.totalLandedCostKes} />
                          )}
                          {row.processingCostsKes > 0 && (
                            <CostBar value={row.processingCostsKes} total={row.totalLandedCostKes} />
                          )}
                          {row.transferCostKes > 0 && (
                            <CostBar value={row.transferCostKes} total={row.totalLandedCostKes} />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-x-1">
                          <span>PO</span>
                          {row.landedCostsKes > 0 && <span>· Landed</span>}
                          {row.processingCostsKes > 0 && <span>· Processing</span>}
                          {row.transferCostKes > 0 && <span>· Transfer</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {fmt(row.totalLandedCostKes, 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(row.costPerKgRaw)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.outputPrimaryKg != null ? (
                          fmt(row.outputPrimaryKg, 1)
                        ) : (
                          <span className="text-muted-foreground text-xs">No yield recorded</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(row.costPerKgProcessed)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-green-700">
                        {fmt(row.recommendedSellPricePerKg)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.hasLandedCostAllocation && (
                            <Badge variant="secondary" className="text-xs">Landed</Badge>
                          )}
                          {row.hasProcessingCostAllocation && (
                            <Badge variant="secondary" className="text-xs">Processing</Badge>
                          )}
                          {row.hasYieldData && (
                            <Badge variant="secondary" className="text-xs">Yield</Badge>
                          )}
                          {!row.hasLandedCostAllocation && !row.hasProcessingCostAllocation && !row.hasYieldData && (
                            <span className="text-xs text-muted-foreground">PO only</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          disabled={!isApiConfigured() || row.recommendedSellPricePerKg == null}
                          onClick={() => openPublish(row)}
                        >
                          <Icons.Send className="h-3 w-3 mr-1" />
                          Set price
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        {hasLoaded && rows.length > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div>
                  <p className="font-medium">Cost layers</p>
                  <ul className="mt-1 text-muted-foreground space-y-0.5 text-xs">
                    <li><span className="font-medium">PO</span> — purchase order value (converted to KES)</li>
                    <li><span className="font-medium">Landed</span> — FX loss, permits, inbound logistics</li>
                    <li><span className="font-medium">Processing</span> — gutting fee, packaging, outbound logistics</li>
                    <li><span className="font-medium">Transfer</span> — transport costs from farm to store</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Working backwards</p>
                  <ul className="mt-1 text-muted-foreground space-y-0.5 text-xs">
                    <li><span className="font-medium">Cost/kg raw</span> — total cost ÷ received kg (whole fish)</li>
                    <li><span className="font-medium">Yield kg</span> — primary output from processing (gutted fish)</li>
                    <li><span className="font-medium">Cost/kg processed</span> — total cost ÷ processed output kg</li>
                    <li><span className="font-medium">Sell at</span> — cost/kg × (1 + margin %)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Missing data?</p>
                  <ul className="mt-1 text-muted-foreground space-y-0.5 text-xs">
                    <li>
                      {'No "Landed" badge → add a Landed Cost Allocation in '}
                      <Link href="/inventory/costing" className="text-primary hover:underline">Costing</Link>
                    </li>
                    <li>
                      {'No "Processing" badge → add a Processing Cost in '}
                      <Link href="/inventory/costing" className="text-primary hover:underline">Costing</Link>
                    </li>
                    <li>
                      {'No "Yield" badge → record a yield entry in '}
                      <Link href="/manufacturing/yield" className="text-primary hover:underline">Manufacturing → Yield</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Publish to price list sheet */}
      <Sheet open={!!publishRow} onOpenChange={(open) => { if (!open) closePublish(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Set selling price from batch cost</SheetTitle>
            <SheetDescription>
              {publishRow && (
                <>
                  Batch <span className="font-medium">{publishRow.grnNumber ?? publishRow.grnId.slice(0, 8)}</span>
                  {" · "}Cost/kg:{" "}
                  <span className="font-medium">
                    KES {publishRow.recommendedSellPricePerKg != null
                      ? fmt(publishRow.recommendedSellPricePerKg)
                      : fmt(publishRow.costPerKgRaw)}
                  </span>
                  {" "}(incl. {margin}% margin)
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {publishLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
              Loading batch details…
            </div>
          ) : publishSummary ? (
            <div className="mt-6 space-y-6">
              {/* Cost summary */}
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total landed cost</span>
                  <span className="font-medium tabular-nums">KES {fmt(publishSummary.totalLandedCostKes, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Received weight</span>
                  <span className="tabular-nums">{fmt(publishSummary.receivedKg, 1)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost / kg</span>
                  <span className="tabular-nums">KES {publishSummary.perKg != null ? fmt(publishSummary.perKg) : "—"}</span>
                </div>
              </div>

              {/* Target price list */}
              <div className="space-y-1.5">
                <Label>Target price list</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a price list…" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceLists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                        {l.currency && l.currency !== "KES" && (
                          <span className="ml-1 text-xs text-muted-foreground">({l.currency})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {priceLists.length === 0 && (
                  <p className="text-xs text-muted-foreground">No price lists found. Create one in <Link href="/pricing/price-lists" className="text-primary hover:underline">Price Lists</Link>.</p>
                )}
              </div>

              {/* Per-product prices */}
              {publishSummary.productLines.length > 0 ? (
                <div className="space-y-2">
                  <Label>Prices to set (KES / kg)</Label>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground w-36">Sell price (KES)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {publishSummary.productLines.map((line) => (
                          <tr key={line.productId} className="border-t">
                            <td className="px-3 py-2">
                              <div className="font-medium">{line.name}</div>
                              {line.weightKg > 0 && (
                                <div className="text-xs text-muted-foreground">{fmt(line.weightKg, 1)} kg</div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="h-8 text-right tabular-nums"
                                value={publishPrices[line.productId] ?? ""}
                                onChange={(e) =>
                                  setPublishPrices((prev) => ({ ...prev, [line.productId]: e.target.value }))
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pre-filled from recommended sell price. Existing items in the price list will be updated; new products will be added.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No products with IDs found on this GRN.</p>
              )}
            </div>
          ) : null}

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={closePublish} disabled={publishSaving}>
              Cancel
            </Button>
            <Button
              onClick={savePublish}
              disabled={
                publishSaving ||
                publishLoading ||
                !selectedListId ||
                !publishSummary ||
                publishSummary.productLines.length === 0
              }
            >
              {publishSaving ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Icons.Check className="h-4 w-4 mr-2" />
                  Publish prices
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
