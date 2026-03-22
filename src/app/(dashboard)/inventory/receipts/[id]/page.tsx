"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { StockAgeIndicator } from "@/components/operational/StockAgeIndicator";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { fetchGRNById, postGRN, patchGRNLine, confirmGRNProcessing, exportGRNDetailCsv, exportGRNPdf, type GrnDetailRow } from "@/lib/api/grn";
import { Badge } from "@/components/ui/badge";
import { fetchPutawayTasks } from "@/lib/api/warehouse-execution";
import type { GrnLineRow } from "@/lib/types/purchasing";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const hasCashWeightAudit = useOrgContextStore((s) => s.hasFlag?.("procurementAuditCashWeight") ?? false);
  const hasLandedCostMultiCurrency = useOrgContextStore((s) => s.hasFlag?.("landedCostMultiCurrency") ?? false);
  const [grn, setGrn] = React.useState<GrnDetailRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);
  const [confirmingProcessing, setConfirmingProcessing] = React.useState(false);
  const [putawayLink, setPutawayLink] = React.useState<{ id: string; label: string } | null>(null);
  const weightTableRef = React.useRef<HTMLDivElement>(null);
  const [editingWeight, setEditingWeight] = React.useState<Record<number, string>>({});
  const linesWithIndex = React.useMemo(
    () => (grn?.lines ?? []).map((line, idx) => ({ ...line, _lineIndex: idx })),
    [grn?.lines]
  );

  React.useEffect(() => {
    setLoading(true);
    fetchGRNById(id).then((g) => { setGrn(g ?? null); setLoading(false); });
  }, [id]);

  React.useEffect(() => {
    let active = true;
    void fetchPutawayTasks({ sourceDocumentId: id })
      .then((items) => {
        if (!active) return;
        setPutawayLink(items[0] ? { id: items[0].id, label: items[0].grnNumber } : null);
      })
      .catch(() => {
        if (active) setPutawayLink(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading && !grn) {
    return (
      <PageShell>
        <PageHeader title="Receipt" breadcrumbs={[{ label: "Inventory", href: "/inventory/products" }, { label: "Receipts", href: "/inventory/receipts" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }
  if (grn === null) {
    return (
      <PageShell>
        <PageHeader title="Receipt not found" breadcrumbs={[{ label: "Inventory", href: "/inventory/products" }, { label: "Receipts", href: "/inventory/receipts" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">GRN not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/inventory/receipts">Back to receipts</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const totalReceivedWeight = grn.lines.reduce((acc, line) => acc + (Number(line.receivedWeightKg) || 0), 0);
  const totalPaidWeight = grn.lines.reduce((acc, line) => acc + (Number(line.paidWeightKg) || 0), 0);
  const totalProcessedWeight = grn.lines.reduce((acc, line) => acc + (Number(line.processedWeightKg) || 0), 0);
  const totalQty = grn.lines.reduce((acc, line) => acc + (Number(line.qty) || 0), 0);
  const waterLossKg = totalReceivedWeight > 0 && totalProcessedWeight > 0
    ? Math.max(0, totalReceivedWeight - totalProcessedWeight)
    : null;
  const waterLossPct = waterLossKg != null && totalReceivedWeight > 0
    ? ((waterLossKg / totalReceivedWeight) * 100).toFixed(1)
    : null;
  const canEditWeight = hasCashWeightAudit && grn.status === "DRAFT";
  // Allow entering processed weight even after posting (processing happens post-receipt)
  const canEditProcessedWeight = hasCashWeightAudit && (grn.status === "DRAFT" || grn.status === "POSTED") && !grn.processingConfirmed;
  const hasAnyProcessedWeight = grn.lines.some((l) => l.processedWeightKg != null && l.processedWeightKg > 0);
  const [editingProcessedWeight, setEditingProcessedWeight] = React.useState<Record<number, string>>({});
  const handleConfirmProcessing = async () => {
    setConfirmingProcessing(true);
    try {
      const result = await confirmGRNProcessing(grn.id);
      const updated = await fetchGRNById(grn.id);
      setGrn(updated ?? null);
      toast.success(
        result.adjustedLines > 0
          ? `Processing confirmed. Stock adjusted for ${result.adjustedLines} line(s).`
          : "Processing confirmed. No stock adjustment needed (no water loss)."
      );
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to confirm processing");
    } finally {
      setConfirmingProcessing(false);
    }
  };
  const handleReceivedWeightBlur = async (lineIndex: number, value: string) => {
    const num = value ? parseFloat(value) : undefined;
    if (num == null || Number.isNaN(num) || num < 0) return;
    try {
      const updated = await patchGRNLine(grn.id, lineIndex, { receivedWeightKg: num });
      setGrn(updated);
      setEditingWeight((prev) => {
        const next = { ...prev };
        delete next[lineIndex];
        return next;
      });
      toast.success("Weight updated");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to update weight");
    }
  };
  const handleProcessedWeightBlur = async (lineIndex: number, value: string) => {
    const num = value ? parseFloat(value) : undefined;
    if (num == null || Number.isNaN(num) || num < 0) return;
    try {
      const updated = await patchGRNLine(grn.id, lineIndex, { processedWeightKg: num });
      setGrn(updated);
      setEditingProcessedWeight((prev) => {
        const next = { ...prev };
        delete next[lineIndex];
        return next;
      });
      toast.success("Processed weight updated");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to update processed weight");
    }
  };
  const lineColumns = [
    { id: "sku", header: "SKU", accessor: (line: GrnLineRow & { _lineIndex?: number }) => line.sku ?? "—", sticky: true },
    { id: "product", header: "Product", accessor: (line: GrnLineRow & { _lineIndex?: number }) => line.productName ?? "—" },
    { id: "qty", header: "Qty", accessor: (line: GrnLineRow & { _lineIndex?: number }) => `${line.qty ?? 0} ${line.uom ?? ""}`.trim() },
    { id: "value", header: "Value", accessor: (line: GrnLineRow & { _lineIndex?: number }) => (
      <DualCurrencyAmount
        amount={line.value ?? 0}
        currency={grn.currency ?? "KES"}
        exchangeRate={grn.exchangeRate}
        align="right"
        size="sm"
      />
    ) },
    ...(hasCashWeightAudit
      ? [
          {
            id: "receivedWeightKg",
            header: "Received kg",
            accessor: (line: GrnLineRow & { _lineIndex?: number }) => {
              const idx = line._lineIndex ?? 0;
              return canEditWeight ? (
                <Input
                  type="number"
                  step="0.01"
                  className="w-24 h-8"
                  placeholder="kg"
                  value={editingWeight[idx] ?? line.receivedWeightKg ?? ""}
                  onChange={(e) => setEditingWeight((prev) => ({ ...prev, [idx]: e.target.value }))}
                  onBlur={(e) => handleReceivedWeightBlur(idx, e.target.value)}
                />
              ) : (
                (line.receivedWeightKg ?? "—")
              );
            },
          },
          { id: "paidWeightKg", header: "Paid kg", accessor: (line: GrnLineRow & { _lineIndex?: number }) => line.paidWeightKg ?? "—" },
          {
            id: "processedWeightKg",
            header: "Processed kg",
            accessor: (line: GrnLineRow & { _lineIndex?: number }) => {
              const idx = line._lineIndex ?? 0;
              return canEditProcessedWeight ? (
                <Input
                  type="number"
                  step="0.01"
                  className="w-24 h-8"
                  placeholder="kg"
                  value={editingProcessedWeight[idx] ?? line.processedWeightKg ?? ""}
                  onChange={(e) => setEditingProcessedWeight((prev) => ({ ...prev, [idx]: e.target.value }))}
                  onBlur={(e) => handleProcessedWeightBlur(idx, e.target.value)}
                />
              ) : (
                (line.processedWeightKg ?? "—")
              );
            },
          },
        ]
      : []),
  ];

  return (
    <PageShell>
      <PageHeader
        title={grn.number}
        description={`${grn.date} · ${grn.warehouse ?? "—"}`}
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Receipts", href: "/inventory/receipts" },
          { label: grn.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {grn.status === "DRAFT" && (
              <Button
                size="sm"
                disabled={posting}
                onClick={async () => {
                  setPosting(true);
                  await postGRN(grn.id);
                  setGrn(await fetchGRNById(grn.id));
                  setPosting(false);
                  toast.success("GRN posted.");
                }}
              >
                <Icons.Send className="mr-2 h-4 w-4" />
                {posting ? "Posting…" : "Post"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => exportGRNDetailCsv(grn)}>
              <Icons.FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportGRNPdf(grn.id, (message) => toast.info(message))}>
              <Icons.FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            {hasCashWeightAudit && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/purchasing/cash-weight-audit">Cash-to-weight audit</Link>
              </Button>
            )}
            {hasLandedCostMultiCurrency && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/inventory/costing?sourceId=${id}`}>Add landed costs</Link>
              </Button>
            )}
            {putawayLink ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/warehouse/putaway/${putawayLink.id}`}>Open putaway</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory/receipts">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {hasCashWeightAudit && totalReceivedWeight !== totalPaidWeight ? (
          <ExceptionBanner
            type="warning"
            title="Weight variance detected"
            description="Received and paid weights do not match. Review before final finance sign-off."
            actions={[
              { label: "Open audit", onClick: () => { window.location.href = "/purchasing/cash-weight-audit"; } },
            ]}
          />
        ) : null}

        {/* "What's next" contextual guidance — shown after GRN is posted */}
        {grn.status === "POSTED" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-primary">
                  {grn.processingConfirmed ? "Processing confirmed — final steps:" : "GRN posted — what's next:"}
                </span>
                {!grn.processingConfirmed && hasCashWeightAudit && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => weightTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    <Icons.Weight className="mr-1.5 h-3.5 w-3.5" />
                    Enter processed weight
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/inventory/costing?sourceId=${grn.id}`}>
                    <Icons.TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    Apply landed costs
                  </Link>
                </Button>
                {hasCashWeightAudit && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/purchasing/cash-weight-audit${grn.poRef ? `?poId=${grn.poRef}` : ""}`}>
                      <Icons.BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                      Run audit
                    </Link>
                  </Button>
                )}
                {grn.processingConfirmed && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/inventory/stock-levels">
                      <Icons.Package className="mr-1.5 h-3.5 w-3.5" />
                      View stock
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Summary</CardTitle>
            <CardDescription>Goods receipt object page with operational, variance, and valuation context.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Number</p>
              <p className="font-medium">{grn.number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{grn.date}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PO Reference</p>
              <p className="font-medium">{grn.poRef ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Warehouse</p>
              <p className="font-medium">{grn.warehouse ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Supplier</p>
              <p className="font-medium">{grn.supplier ?? grn.party ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={grn.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              {grn.totalAmount != null && grn.currency ? (
                <DualCurrencyAmount
                  amount={grn.totalAmount}
                  currency={grn.currency}
                  exchangeRate={grn.exchangeRate}
                  size="md"
                />
              ) : <p className="font-medium">—</p>}
            </div>
            <div>
              <p className="text-muted-foreground">Ownership / Location</p>
              <OwnershipLocationBadge owner="CoolCatch" location={grn.warehouse ?? "Warehouse"} />
            </div>
            <div>
              <p className="text-muted-foreground">Stock age</p>
              <StockAgeIndicator days={grn.status === "POSTED" ? 2 : 0} />
            </div>
          </CardContent>
        </Card>

            {hasCashWeightAudit ? (
              <ProcurementVariancePanel
                poWeightKg={totalQty}
                paidWeightKg={totalPaidWeight}
                receivedWeightKg={totalReceivedWeight}
              />
            ) : null}

            <Card ref={weightTableRef}>
              <CardHeader>
                <CardTitle>Receipt Lines</CardTitle>
                <CardDescription>Received quantity and financial value per line.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<GrnLineRow & { _lineIndex?: number }> data={linesWithIndex} columns={lineColumns} emptyMessage="No receipt lines." />
              </CardContent>
              {hasCashWeightAudit && totalReceivedWeight > 0 && (
                <div className="border-t px-4 py-3 space-y-3">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Received: </span>
                      <span className="font-semibold">{totalReceivedWeight.toFixed(2)} kg</span>
                    </div>
                    {totalProcessedWeight > 0 && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Processed: </span>
                          <span className="font-semibold">{totalProcessedWeight.toFixed(2)} kg</span>
                        </div>
                        {waterLossKg !== null && (
                          <div className={waterLossKg > 0 ? "text-amber-700" : "text-emerald-700"}>
                            <span className="text-muted-foreground">Loss: </span>
                            <span className="font-semibold">
                              {waterLossKg.toFixed(2)} kg {waterLossPct ? `(${waterLossPct}%)` : ""}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {totalProcessedWeight === 0 && canEditProcessedWeight && (
                      <span className="text-xs text-muted-foreground italic">
                        Enter "Processed kg" above to calculate water loss.
                      </span>
                    )}
                  </div>

                  {/* Confirm processing action or confirmed badge */}
                  {grn.processingConfirmed ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 gap-1">
                        <Icons.CheckCircle2 className="h-3 w-3" />
                        Processing confirmed — stock adjusted
                      </Badge>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href="/inventory/stock-levels">
                          <Icons.Package className="mr-1 h-3 w-3" />
                          View stock
                        </Link>
                      </Button>
                    </div>
                  ) : canEditProcessedWeight && hasAnyProcessedWeight ? (
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        disabled={confirmingProcessing}
                        onClick={handleConfirmProcessing}
                      >
                        {confirmingProcessing
                          ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <Icons.CheckCircle2 className="mr-2 h-4 w-4" />}
                        {confirmingProcessing ? "Confirming…" : "Confirm processing"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This records the water loss as a stock adjustment and locks the processed weights.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </Card>

            <CostImpactPanel
              title="Receipt Cost Impact"
              currency={grn.currency ?? "KES"}
              quantityKg={totalReceivedWeight || totalQty}
              lines={[
                { label: "Receipt value", amount: grn.totalAmount ?? 0 },
                { label: "Inbound handling", amount: (grn.totalAmount ?? 0) * 0.015 },
                { label: "Cold-chain storage estimate", amount: (grn.totalAmount ?? 0) * 0.01 },
              ]}
            />
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Receipt Timeline"
              steps={[
                { id: "po", label: "Purchase order approved", status: "completed", detail: grn.poRef ?? "PO linked" },
                { id: "arrive", label: "Stock arrived at facility", status: "completed", timestamp: `${grn.date}T08:00:00Z` },
                { id: "verify", label: "Weight / QA verification", status: hasCashWeightAudit ? "current" : "completed", detail: hasCashWeightAudit ? "Compare paid vs received weight" : "Verification complete" },
                { id: "post", label: "Receipt posted to inventory", status: ["POSTED", "RECEIVED"].includes(grn.status) ? "completed" : "upcoming" },
                { id: "putaway", label: "Putaway completed", status: grn.status === "RECEIVED" ? "completed" : "upcoming", detail: putawayLink ? "Warehouse execution closed" : "Awaiting putaway" },
              ]}
            />

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Activity & Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityPanel
                  auditEntries={[
                    { id: "a1", action: "GRN created", user: "Warehouse Clerk", timestamp: grn.date, detail: `${grn.number} for ${grn.supplier ?? grn.party}` },
                    { id: "a2", action: ["POSTED", "RECEIVED"].includes(grn.status) ? "GRN posted" : "Awaiting posting", user: "System", timestamp: new Date().toISOString(), detail: `Warehouse ${grn.warehouse ?? "—"}` },
                    ...(grn.status === "RECEIVED"
                      ? [{ id: "a3", action: "Putaway confirmed", user: "Warehouse", timestamp: new Date().toISOString(), detail: "Receipt operationally closed" }]
                      : []),
                  ]}
                  comments={[
                    { id: "c1", user: "QA", text: "Verify weights against farm-gate payment before closure.", timestamp: new Date().toLocaleString() },
                  ]}
                  attachments={[
                    { id: "f1", name: "weighbridge-slip.jpg", type: "image", size: "1.2 MB", uploadedBy: "Receiving", uploadedAt: grn.date },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
