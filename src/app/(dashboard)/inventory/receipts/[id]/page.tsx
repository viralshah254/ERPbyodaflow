"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActivityPanel, type AuditEntry, type Comment } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { StockAgeIndicator } from "@/components/operational/StockAgeIndicator";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { fetchGRNById, postGRN, patchGRNLine, patchGrnHeaderApi, confirmGRNProcessing, exportGRNDetailCsv, exportGRNPdf, type GrnDetailRow, type GrnPostError } from "@/lib/api/grn";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchPutawayTasks } from "@/lib/api/warehouse-execution";
import type { GrnLineRow } from "@/lib/types/purchasing";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useAuthStore } from "@/stores/auth-store";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { fetchLandedCostAllocation, type ExistingLandedCostAllocation } from "@/lib/api/landed-cost";
import { fetchProcessingCostAllocation, type ProcessingCostAllocationRecord } from "@/lib/api/processing-cost";
import { BatchLandedCostCard } from "@/components/operational/BatchLandedCostCard";
import { addDocumentCommentApi, editDocumentCommentApi, deleteDocumentCommentApi, convertDocumentApi } from "@/lib/api/documents";
import { fetchAuditLogs } from "@/lib/api/audit-log";
import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const hasCashWeightAudit = useOrgContextStore((s) => s.hasFlag?.("procurementAuditCashWeight") ?? false);
  const hasLandedCostMultiCurrency = useOrgContextStore((s) => s.hasFlag?.("landedCostMultiCurrency") ?? false);
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.userId;
  const permissions = useAuthStore((s) => s.permissions);
  const isAdmin = permissions.includes("admin.users") || permissions.includes("*");
  const [grn, setGrn] = React.useState<GrnDetailRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);
  const [confirmingProcessing, setConfirmingProcessing] = React.useState(false);
  const [creatingBill, setCreatingBill] = React.useState(false);
  const [putawayLink, setPutawayLink] = React.useState<{ id: string; label: string } | null>(null);
  const [landedAllocation, setLandedAllocation] = React.useState<ExistingLandedCostAllocation | null>(null);
  const [processingAllocation, setProcessingAllocation] = React.useState<ProcessingCostAllocationRecord | null>(null);
  const [costsChecked, setCostsChecked] = React.useState(false);
  const weightTableRef = React.useRef<HTMLDivElement>(null);
  const [editingWeight, setEditingWeight] = React.useState<Record<number, string>>({});
  const [editingProcessedWeight, setEditingProcessedWeight] = React.useState<Record<number, string>>({});

  // GRN header edit dialog
  const [editHeaderOpen, setEditHeaderOpen] = React.useState(false);
  const [editHeaderDate, setEditHeaderDate] = React.useState("");
  const [editHeaderNotes, setEditHeaderNotes] = React.useState("");
  const [editHeaderRef, setEditHeaderRef] = React.useState("");
  const [editHeaderWarehouse, setEditHeaderWarehouse] = React.useState("");
  const [savingHeader, setSavingHeader] = React.useState(false);

  // Activity & Audit — live data
  const [auditEntries, setAuditEntries] = React.useState<AuditEntry[]>([]);
  const [comments, setComments] = React.useState<Comment[]>([]);

  const loadAuditAndComments = React.useCallback(async (grnId: string) => {
    if (!isApiConfigured()) return;
    try {
      const entries = await fetchAuditLogs({ sourceType: "GRN", sourceId: grnId });
      setAuditEntries(entries.map((e) => ({
        id: e.id ?? e.when,
        action: e.what ?? e.action ?? "Event",
        user: e.who ?? "System",
        timestamp: e.when,
        detail: e.after ? JSON.stringify(e.after) : undefined,
      })));
    } catch { /* non-fatal */ }
    try {
      const res = await apiRequest<{ items: Array<{ id: string; text: string; createdAt: string; createdBy?: string }> }>(
        `/api/docs/grn/${encodeURIComponent(grnId)}/comments`
      );
      setComments((res.items ?? []).map((c) => ({
        id: c.id,
        user: c.createdBy ?? "User",
        text: c.text,
        timestamp: c.createdAt,
        isOwn: !!currentUserId && c.createdBy === currentUserId,
      })));
    } catch { /* non-fatal */ }
  }, [currentUserId]);

  const handleAddComment = React.useCallback(async (text: string) => {
    if (!grn) return;
    try {
      await addDocumentCommentApi("grn", grn.id, text);
      await loadAuditAndComments(grn.id);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to add comment");
    }
  }, [grn, loadAuditAndComments]);

  const handleEditComment = React.useCallback(async (commentId: string, newText: string) => {
    if (!grn) return;
    try {
      await editDocumentCommentApi("grn", grn.id, commentId, newText);
      await loadAuditAndComments(grn.id);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to edit comment");
    }
  }, [grn, loadAuditAndComments]);

  const handleDeleteComment = React.useCallback(async (commentId: string) => {
    if (!grn) return;
    try {
      await deleteDocumentCommentApi("grn", grn.id, commentId);
      await loadAuditAndComments(grn.id);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to delete comment");
    }
  }, [grn, loadAuditAndComments]);
  const linesWithIndex = React.useMemo(
    () => (grn?.lines ?? []).map((line, idx) => ({ ...line, _lineIndex: idx })),
    [grn?.lines]
  );

  /** Persist edited received kg before post — blur may not have fired if the user goes straight to Post. */
  const flushPendingReceivedWeights = React.useCallback(async () => {
    if (!grn || !hasCashWeightAudit) return;
    let working = grn;
    let anyPatch = false;
    for (let idx = 0; idx < working.lines.length; idx++) {
      const pending = editingWeight[idx];
      if (pending === undefined) continue;
      const trimmed = pending.trim();
      if (trimmed === "") continue;
      const num = parseFloat(trimmed);
      if (Number.isNaN(num) || num < 0) continue;
      const line = working.lines[idx];
      const persisted = Number(line.receivedWeightKg ?? line.qty);
      if (Math.abs(num - persisted) < 1e-6) continue;
      const updated = await patchGRNLine(working.id, idx, { receivedWeightKg: num });
      if (updated) {
        working = updated;
        anyPatch = true;
      }
    }
    if (anyPatch) {
      setGrn(working);
      setEditingWeight({});
    }
  }, [grn, hasCashWeightAudit, editingWeight]);

  React.useEffect(() => {
    setLoading(true);
    fetchGRNById(id).then((g) => {
      setGrn(g ?? null);
      setLoading(false);
      if (g) loadAuditAndComments(g.id);
    });
  }, [id, loadAuditAndComments]);

  React.useEffect(() => {
    setCostsChecked(false);
    Promise.all([
      fetchLandedCostAllocation(id).catch(() => null),
      fetchProcessingCostAllocation(id).catch(() => null),
    ]).then(([a, p]) => {
      setLandedAllocation(a);
      setProcessingAllocation(p);
      setCostsChecked(true);
    });
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

  // Costs are applied if the backend flag is set OR if we've fetched an allocation (handles processing-only case)
  const hasAnyCosts = grn.hasLandedCost || (costsChecked && (landedAllocation !== null || processingAllocation !== null));

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
    { id: "qty", header: "Qty", accessor: (line: GrnLineRow & { _lineIndex?: number }) => `${(line.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${line.uom ?? ""}`.trim() },
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
        dense
        showCommandHint={false}
        actions={
          <div className="flex gap-2">
            {(["DRAFT", "POSTED"].includes(grn.status) &&
              (String((grn as unknown as Record<string, unknown>).createdBy ?? "") === (currentUserId ?? "") || isAdmin)) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditHeaderDate(grn.date ?? "");
                  setEditHeaderNotes(String((grn as unknown as Record<string, unknown>).notes ?? ""));
                  setEditHeaderRef(String((grn as unknown as Record<string, unknown>).reference ?? ""));
                  setEditHeaderWarehouse(grn.warehouseId ?? "");
                  setEditHeaderOpen(true);
                }}
              >
                <Icons.Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {grn.status === "DRAFT" && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        disabled={posting || !hasAnyCosts}
                        onClick={async () => {
                          setPosting(true);
                          try {
                            await flushPendingReceivedWeights();
                            const result = await postGRN(grn.id);
                            setGrn(await fetchGRNById(grn.id));
                            if (result.stockAdded?.length) {
                              const summary = result.stockAdded
                                .map((s) => `+${s.qty} ${s.productName ?? s.productId}`)
                                .join(", ");
                              toast.success(`GRN posted — stock updated`, { description: summary, duration: 8000 });
                            } else {
                              toast.success("GRN posted.");
                            }
                          } catch (raw) {
                            const e = raw as GrnPostError;
                            const msg = e.message ?? "Failed to post GRN.";
                            if (e.code === "GRN_CONVERTED_TO_BILL" && e.billId) {
                              toast.error(msg, {
                                action: {
                                  label: `View bill ${e.billNumber ?? ""}`.trim(),
                                  onClick: () => { window.location.href = `/docs/bill/${e.billId}`; },
                                },
                                duration: 8000,
                              });
                            } else if (e.code === "GRN_MISSING_WEIGHT") {
                              toast.error(msg, {
                                description: "Enter received weight (kg) for each line below before posting.",
                                duration: 8000,
                              });
                            } else if (e.code === "GRN_OPEN_VARIANCE") {
                              const auditUrl = e.poId
                                ? `/purchasing/cash-weight-audit?poId=${encodeURIComponent(e.poId)}`
                                : "/purchasing/cash-weight-audit";
                              toast.error(msg, {
                                action: {
                                  label: "Go to cash-weight audit",
                                  onClick: () => { window.location.href = auditUrl; },
                                },
                                duration: 8000,
                              });
                            } else {
                              toast.error(msg);
                            }
                          } finally {
                            setPosting(false);
                          }
                        }}
                      >
                        <Icons.Send className="mr-2 h-4 w-4" />
                        {posting ? "Posting…" : "Post"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasAnyCosts && (
                    <TooltipContent>
                      Apply other costs before posting
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            {grn.linkedBill ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/docs/bill/${grn.linkedBill.id}`}>
                  <Icons.FileText className="mr-2 h-4 w-4" />
                  View Bill ({grn.linkedBill.number})
                </Link>
              </Button>
            ) : (grn.status === "POSTED" || grn.status === "RECEIVED") ? (
              <Button
                size="sm"
                variant="default"
                disabled={creatingBill}
                onClick={async () => {
                  setCreatingBill(true);
                  try {
                    const result = await convertDocumentApi("grn", grn.id, { targetType: "bill" });
                    toast.success(`Bill ${result.number ?? ""} created.`);
                    window.location.href = `/docs/bill/${result.id}`;
                  } catch (e) {
                    toast.error((e as Error)?.message ?? "Failed to create bill.");
                  } finally {
                    setCreatingBill(false);
                  }
                }}
              >
                {creatingBill ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.FileText className="mr-2 h-4 w-4" />}
                Create Bill
              </Button>
            ) : null}
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
                <Link href={`/inventory/costing?sourceId=${id}`}>Add other costs</Link>
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
      <div className="p-4 space-y-3">
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

        {/* Contextual "what's next" guidance — visible for every status */}
        {grn.status === "DRAFT" && (
          <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="py-2.5 px-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {hasAnyCosts
                    ? "This GRN is a draft — post it to update inventory."
                    : "Apply other costs before posting this GRN."}
                </span>
                {hasAnyCosts ? (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={posting}
                    onClick={async () => {
                      setPosting(true);
                      try {
                        await flushPendingReceivedWeights();
                        const result = await postGRN(id);
                        if (result.stockAdded?.length) {
                          const summary = result.stockAdded
                            .map((s) => `+${s.qty} ${s.productName ?? s.productId}`)
                            .join(", ");
                          toast.success("GRN posted — stock updated", { description: summary, duration: 8000 });
                        } else {
                          toast.success("GRN posted.");
                        }
                        setGrn(await fetchGRNById(id));
                      } catch (raw) {
                        const e = raw as GrnPostError;
                        const msg = e.message ?? "Failed to post GRN.";
                        if (e.code === "GRN_MISSING_WEIGHT") {
                          toast.error(msg, { description: "Enter received weight (kg) for each line below before posting.", duration: 8000 });
                        } else if (e.code === "GRN_OPEN_VARIANCE") {
                          const auditUrl = e.poId ? `/purchasing/cash-weight-audit?poId=${encodeURIComponent(e.poId)}` : "/purchasing/cash-weight-audit";
                          toast.error(msg, { action: { label: "Go to cash-weight audit", onClick: () => { window.location.href = auditUrl; } }, duration: 8000 });
                        } else {
                          toast.error(msg);
                        }
                      } finally {
                        setPosting(false);
                      }
                    }}
                  >
                    <Icons.Send className="mr-1.5 h-3.5 w-3.5" />
                    {posting ? "Posting…" : "Post GRN"}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/inventory/costing?grnId=${grn.id}`}>
                      <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />
                      Apply costs
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {grn.status === "POSTED" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-2.5 px-4">
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
                    Apply other costs
                  </Link>
                </Button>
                {hasCashWeightAudit && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/purchasing/cash-weight-audit${grn.sourceDocumentId ? `?poId=${grn.sourceDocumentId}` : grn.poRef ? `?poId=${grn.poRef}` : ""}`}>
                      <Icons.BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                      Run audit
                    </Link>
                  </Button>
                )}
                {!grn.linkedBill && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/docs/bill/new?grnId=${grn.id}`}>
                      <Icons.FileText className="mr-1.5 h-3.5 w-3.5" />
                      Create bill
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

        {grn.status === "RECEIVED" && (
          <Card className="border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-950/20">
            <CardContent className="py-2.5 px-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Goods fully received — create supplier bill and run 3-way match.
                </span>
                {!grn.linkedBill && (
                  <Button size="sm" variant="default" asChild>
                    <Link href={`/docs/bill/new?grnId=${grn.id}`}>
                      <Icons.FileText className="mr-1.5 h-3.5 w-3.5" />
                      Create bill
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href="/ap/three-way-match">
                    <Icons.GitCompare className="mr-1.5 h-3.5 w-3.5" />
                    3-way match
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(grn.status === "CONVERTED" || grn.linkedBill) && grn.status !== "POSTED" && grn.status !== "RECEIVED" && (
          <Card className="border-muted bg-muted/20">
            <CardContent className="py-2.5 px-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">
                  Supplier bill has been created from this GRN.
                </span>
                {grn.linkedBill && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/docs/bill/${grn.linkedBill.id}`}>
                      <Icons.FileText className="mr-1.5 h-3.5 w-3.5" />
                      View bill {grn.linkedBill.number}
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/ap/payments">
                    <Icons.CreditCard className="mr-1.5 h-3.5 w-3.5" />
                    Record payment
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(220px,17rem)] xl:items-start">
          <div className="min-w-0 space-y-3">
            <div
              className={cn(
                "grid gap-3",
                hasCashWeightAudit ? "lg:grid-cols-2 lg:items-stretch" : "",
              )}
            >
              <Card>
                <CardHeader className="space-y-0 p-4 pb-2">
                  <CardTitle className="text-base">Receipt Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-3 gap-y-2 p-4 pt-0 text-xs md:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Number</p>
                    <p className="font-medium leading-tight">{grn.number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="font-medium leading-tight">{grn.date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">PO Reference</p>
                    <p className="font-medium leading-tight">{grn.poRef ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Warehouse</p>
                    <p className="font-medium leading-tight">{grn.warehouse ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Supplier</p>
                    <p className="font-medium leading-tight">{grn.supplier ?? grn.party ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                    <StatusBadge status={grn.status} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                    {grn.totalAmount != null && grn.currency ? (
                      <DualCurrencyAmount
                        amount={grn.totalAmount}
                        currency={grn.currency}
                        exchangeRate={grn.exchangeRate}
                        size="sm"
                      />
                    ) : (
                      <p className="font-medium">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ownership / Location</p>
                    <OwnershipLocationBadge owner="CoolCatch" location={grn.warehouse ?? "Warehouse"} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Stock age</p>
                    <StockAgeIndicator days={grn.status === "POSTED" ? 2 : 0} />
                  </div>
                  {totalReceivedWeight > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Received kg</p>
                      <p className="font-medium leading-tight tabular-nums text-xs">
                        {totalReceivedWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                      </p>
                    </div>
                  )}
                  {hasCashWeightAudit && totalReceivedWeight > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Available kg</p>
                      <p className="font-medium leading-tight tabular-nums text-xs">
                        {Math.max(0, totalReceivedWeight - totalProcessedWeight).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Work order</p>
                    {grn.workOrderId ? (
                      <Link
                        href="/manufacturing/work-orders"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {grn.workOrderNumber ?? grn.workOrderId}
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not scheduled</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Processing status</p>
                    {!grn.workOrderId || grn.workOrderStatus === "CANCELLED" ? (
                      <span className="text-xs text-muted-foreground">Not scheduled</span>
                    ) : grn.workOrderStatus === "COMPLETED" ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1 px-1.5 py-0">
                        <Icons.CheckCircle2 className="h-3 w-3" />
                        Processed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-xs gap-1 px-1.5 py-0">
                        <Icons.Settings2 className="h-3 w-3" />
                        {grn.workOrderStatus === "IN_PROGRESS"
                          ? "In progress"
                          : grn.workOrderStatus === "RELEASED"
                            ? "Released"
                            : "In work order"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {hasCashWeightAudit ? (
                <ProcurementVariancePanel
                  poWeightKg={totalQty}
                  paidWeightKg={totalPaidWeight}
                  receivedWeightKg={totalReceivedWeight}
                  compact
                />
              ) : null}
            </div>

            <Card ref={weightTableRef}>
              <CardHeader className="space-y-0 p-4 pb-2">
                <CardTitle className="text-base">Receipt Lines</CardTitle>
                <CardDescription className="text-xs">Received quantity and financial value per line.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[min(38vh,20rem)] overflow-auto">
                  <DataTable<GrnLineRow & { _lineIndex?: number }> data={linesWithIndex} columns={lineColumns} emptyMessage="No receipt lines." />
                </div>
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
                        Enter &quot;Processed kg&quot; above to calculate water loss.
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

            {(() => {
              const costCentreLabels: Record<string, string> = {
                currency_conversion: "FX conversion",
                permits: "Permits & customs",
                inbound_logistics: "Inbound logistics",
                other: "Other charges",
              };
              const processingCategoryLabels: Record<string, string> = {
                processing_fee: "Processing fee",
                packaging: "Packaging",
                outbound_logistics: "Outbound logistics",
              };

              if (landedAllocation || processingAllocation) {
                const centreLines = Object.entries(landedAllocation?.costCentreSummary ?? {}).map(
                  ([centre, data]) => ({
                    label: costCentreLabels[centre] ?? centre,
                    amount: (data as { originalAmount: number }).originalAmount ?? 0,
                  })
                );
                const processingLines = (processingAllocation?.lines ?? [])
                  .filter((l) => l.amount > 0)
                  .map((l) => ({
                    label: processingCategoryLabels[l.category] ?? l.label,
                    amount: l.amount,
                  }));
                const weightBasis = (landedAllocation?.impactLines ?? processingAllocation?.impactLines ?? []).reduce(
                  (s, l) => s + (l.basisValue ?? 0),
                  0
                );
                return (
                  <CostImpactPanel
                    title="Receipt Cost Impact"
                    currency="KES"
                    quantityKg={weightBasis || totalReceivedWeight || totalQty}
                    lines={[
                      { label: "Goods value", amount: grn.totalAmount ?? 0 },
                      ...centreLines,
                      ...processingLines,
                    ]}
                  />
                );
              }
              return (
                <div className="space-y-2">
                  <CostImpactPanel
                    title="Receipt Cost Impact"
                    currency={grn.currency ?? "KES"}
                    quantityKg={totalReceivedWeight || totalQty}
                    lines={[
                      { label: "Goods value", amount: grn.totalAmount ?? 0 },
                      { label: "Other costs (not yet allocated)", amount: 0 },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground px-1">
                    Cost per kg above excludes other costs.{" "}
                    <Link href={`/inventory/costing?sourceId=${id}`} className="underline underline-offset-2 text-primary">
                      Allocate other costs
                    </Link>{" "}
                    to get the true cost per kg.
                  </p>
                </div>
              );
            })()}
            <BatchLandedCostCard
              grnId={id}
              grnNumber={grn.number}
              costingHref={`/inventory/costing?grnId=${id}`}
            />
          </div>

          <div className="space-y-3 min-w-0">
            <BatchStatusTimeline
              compact
              title="Receipt Timeline"
              steps={[
                { id: "po", label: "Purchase order approved", status: "completed", detail: grn.poRef ?? "PO linked" },
                { id: "arrive", label: "Stock arrived at facility", status: "completed", timestamp: grn.date ? `${grn.date.slice(0, 10)}T08:00:00Z` : undefined },
                {
                  id: "verify",
                  label: "Weight / QA verification",
                  status: hasCashWeightAudit ? "current" : "completed",
                  detail: hasCashWeightAudit ? "Compare paid vs received weight" : "Verification complete",
                  href: hasCashWeightAudit
                    ? (grn.sourceDocumentId
                        ? `/purchasing/cash-weight-audit?poId=${encodeURIComponent(grn.sourceDocumentId)}`
                        : "/purchasing/cash-weight-audit")
                    : undefined,
                  actionLabel: hasCashWeightAudit ? "Open audit" : undefined,
                },
                { id: "post", label: "Receipt posted to inventory", status: ["POSTED", "RECEIVED", "CONVERTED"].includes(grn.status) ? "completed" : "upcoming" },
                {
                  id: "landed",
                  label: "Other costs allocated",
                  status: (landedAllocation || processingAllocation) ? "completed" : ["POSTED", "RECEIVED", "CONVERTED"].includes(grn.status) ? "current" : "upcoming",
                  detail: (landedAllocation || processingAllocation)
                    ? [
                        landedAllocation ? `KES ${(landedAllocation.totalLandedCostBase ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} inbound` : null,
                        processingAllocation ? `KES ${(processingAllocation.totalAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} processing` : null,
                      ].filter(Boolean).join(" · ")
                    : "Allocate freight, duty, and processing charges",
                  href: !(landedAllocation || processingAllocation) && ["POSTED", "RECEIVED", "CONVERTED"].includes(grn.status)
                    ? `/inventory/costing?sourceId=${encodeURIComponent(grn.id)}`
                    : undefined,
                  actionLabel: !(landedAllocation || processingAllocation) && ["POSTED", "RECEIVED", "CONVERTED"].includes(grn.status)
                    ? "Allocate costs"
                    : undefined,
                },
                {
                  id: "putaway",
                  label: "Putaway completed",
                  status: grn.status === "RECEIVED"
                    ? "completed"
                    : putawayLink
                      ? "current"
                      : "upcoming",
                  detail: grn.status === "RECEIVED"
                    ? "Putaway confirmed"
                    : putawayLink
                      ? "Assign bin locations to complete"
                      : grn.warehouseId
                        ? "Awaiting putaway"
                        : "No warehouse assigned — edit GRN to enable putaway",
                  href: putawayLink ? `/warehouse/putaway/${putawayLink.id}` : undefined,
                  actionLabel: putawayLink ? "Open putaway" : undefined,
                },
              ]}
            />

            <Card className="flex max-h-[min(36vh,18rem)] flex-col overflow-hidden">
              <CardHeader className="shrink-0 space-y-0 p-4 pb-2">
                <CardTitle className="text-base">Activity & Audit</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                <ActivityPanel
                  auditEntries={auditEntries}
                  comments={comments}
                  attachments={[]}
                  onAddComment={handleAddComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={currentUserId}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit GRN Header Sheet */}
      <Sheet open={editHeaderOpen} onOpenChange={setEditHeaderOpen}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Edit GRN Header</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="editDate">Date</Label>
              <Input
                id="editDate"
                type="date"
                value={editHeaderDate}
                onChange={(e) => setEditHeaderDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editRef">Reference</Label>
              <Input
                id="editRef"
                placeholder="External reference…"
                value={editHeaderRef}
                onChange={(e) => setEditHeaderRef(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editWarehouse">Warehouse ID</Label>
              <Input
                id="editWarehouse"
                placeholder="Warehouse ID…"
                value={editHeaderWarehouse}
                onChange={(e) => setEditHeaderWarehouse(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                placeholder="Notes…"
                rows={3}
                value={editHeaderNotes}
                onChange={(e) => setEditHeaderNotes(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setEditHeaderOpen(false)} disabled={savingHeader}>
              Cancel
            </Button>
            <Button
              disabled={savingHeader}
              onClick={async () => {
                setSavingHeader(true);
                try {
                  const updated = await patchGrnHeaderApi(grn.id, {
                    date: editHeaderDate || undefined,
                    notes: editHeaderNotes || undefined,
                    reference: editHeaderRef || undefined,
                    warehouseId: editHeaderWarehouse || undefined,
                  });
                  setGrn(updated);
                  await loadAuditAndComments(updated.id);
                  setEditHeaderOpen(false);
                  toast.success("GRN header updated.");
                } catch (e) {
                  toast.error((e as Error)?.message ?? "Failed to update GRN header.");
                } finally {
                  setSavingHeader(false);
                }
              }}
            >
              {savingHeader ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
