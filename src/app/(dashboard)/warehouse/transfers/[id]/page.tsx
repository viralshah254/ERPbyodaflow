"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { approveTransferShortage, fetchTransferById, saveTransferReceiptCounts, updateTransferStatus, type TransferRow } from "@/lib/api/warehouse-transfers";
import { useCanWriteInventory, useHasPermission } from "@/lib/rbac/use-write-guard";
import { DocumentTimeline } from "@/components/docs/DocumentTimeline";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "RECEIVED") return "secondary";
  if (s === "DRAFT") return "outline";
  return "default";
}

export default function TransferDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const canWrite = useCanWriteInventory();
  const canApproveLoss = useHasPermission("finance.approve");
  const [confirmLoss, setConfirmLoss] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [receiptDraft, setReceiptDraft] = React.useState<Record<string, { quantity: string; reason: string; missingLots?: Record<string, string> }>>({});
  const [transfer, setTransfer] = React.useState<TransferRow | null | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    fetchTransferById(id)
      .then((t) => {
        if (!cancelled) setTransfer(t);
      })
      .catch(() => {
        if (!cancelled) setTransfer(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refresh = React.useCallback(async () => {
    setTransfer(await fetchTransferById(id));
  }, [id]);

  if (transfer === undefined) {
    return (
      <PageShell>
        <PageHeader title="Transfer" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Transfers", href: "/warehouse/transfers" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  if (!transfer) {
    return (
      <PageShell>
        <PageHeader title="Transfer not found" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Transfers", href: "/warehouse/transfers" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Transfer not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/warehouse/transfers">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const t = transfer as TransferRow;
  const canApprove = t.status === "DRAFT";
  const canTransit = t.status === "APPROVED";
  const canReceive = t.status === "IN_TRANSIT";
  const receiptChanges = t.lines.flatMap((line, lineIndex) => {
    const draft = receiptDraft[line.id];
    if (!draft) return [];
    const receivedQuantity = draft.quantity.trim() ? Number(draft.quantity) : NaN;
    const missingLots = receivedQuantity < line.quantity ? Object.entries(draft.missingLots ?? {})
      .filter(([, quantity]) => quantity.trim() && Number(quantity) !== 0)
      .map(([lotId, quantity]) => ({ lotId, quantity: Number(quantity) })) : [];
    const unchangedLots = missingLots.length === (line.missingLots?.length ?? 0) &&
      missingLots.every((entry) => line.missingLots?.some((saved) => entry.lotId === saved.lotId && entry.quantity === saved.quantity));
    if (receivedQuantity === (line.receivedQuantity ?? line.quantity) && draft.reason.trim() === (line.receiptExceptionReason ?? "") && unchangedLots && (receivedQuantity === line.quantity || line.shortageReportRecorded)) return [];
    return [{ lineIndex, receivedQuantity, reason: draft.reason.trim(), missingLots }];
  });
  const validReceipt = receiptChanges.every(({ lineIndex, receivedQuantity, reason, missingLots }) => {
    const line = t.lines[lineIndex]!;
    const missing = line.quantity - receivedQuantity;
    const byLot = missing <= 0 || (line.transitLots?.length ?? 0) <= 1 || (
      missingLots.every((entry) => Number.isFinite(entry.quantity) && entry.quantity > 0 &&
        entry.quantity <= (line.transitLots?.find((lot) => lot.lotId === entry.lotId)?.quantity ?? 0)) &&
      Math.abs(missingLots.reduce((sum, entry) => sum + entry.quantity, 0) - missing) < 1e-9
    );
    return Number.isFinite(receivedQuantity) && receivedQuantity >= 0 && receivedQuantity <= line.quantity && (!missing || Boolean(reason)) && byLot;
  });
  const shortLines = t.lines.filter((line) => (line.receivedQuantity ?? line.quantity) < line.quantity);
  const needsReview = canReceive && Boolean(t.transitWarehouse) && shortLines.length > 0;
  const requiresReporter = shortLines.some((line) => !line.shortageReportRecorded);
  const perform = async (action: () => Promise<void>, message: string) => {
    setWorking(true);
    try {
      await action();
      await refresh();
      setReceiptDraft({});
      setConfirmLoss(false);
      toast.success(message);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setWorking(false);
    }
  };
  const auditLabels: Record<string, string> = {
    "inventory.transfer.approve": "Approved",
    "inventory.transfer.dispatch": "Dispatched",
    "inventory.transfer.receive": "Received",
    "inventory.transfer.receipt_exception": "Receipt shortage recorded",
    "inventory.transfer.shortage_posted": "Shortage approved and written off",
  };

  return (
    <PageShell>
      <PageHeader
        title={`Transfer ${t.number}`}
        description={`${t.fromWarehouse} → ${t.toWarehouse}`}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Transfers", href: "/warehouse/transfers" },
          { label: t.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {canWrite && canApprove && <Button size="sm" disabled={working} onClick={() => void perform(() => updateTransferStatus(id, "APPROVED"), "Transfer approved.")}>Approve</Button>}
            {canWrite && canTransit && <Button size="sm" disabled={working} onClick={() => void perform(() => updateTransferStatus(id, "IN_TRANSIT"), "Transfer dispatched.")}>Dispatch</Button>}
            {canWrite && canReceive && <Button size="sm" disabled={working || receiptChanges.length > 0 || needsReview} onClick={() => void perform(() => updateTransferStatus(id, "RECEIVED"), "Transfer received.")}>Receive</Button>}
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/transfers">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Stock route</CardTitle>
            <Badge variant={statusVariant(t.status)}>{t.status.replace("_", " ")}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2 font-medium">
              <span>{t.fromWarehouse}</span><span aria-hidden="true">→</span>
              {t.transitWarehouse && <><span>{t.transitWarehouse}</span><span aria-hidden="true">→</span></>}
              <span>{t.toWarehouse}</span>
            </div>
            <p className="text-muted-foreground">{t.date}{t.reference ? ` · ${t.reference}` : ""}</p>
            {(canApprove || canTransit) && <p className="text-muted-foreground">Stock has yet to move. {canApprove ? "Approve the draft to make it ready for dispatch." : "Dispatch rechecks stock availability."}</p>}
            {canReceive && <p className="text-muted-foreground">{t.transitWarehouse ? `Stock is in ${t.transitWarehouse}. Receipt moves it into ${t.toWarehouse}.` : `Dispatch is logged. Receipt posts the stock movement into ${t.toWarehouse}.`}</p>}
            {needsReview && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="font-semibold">Transit shortage · {shortLines.length} {shortLines.length === 1 ? "product" : "products"}</p>
                <p>{requiresReporter ? "Confirm and save the shortage counts so Finance can see who reported them."
                  : t.shortageReporterIsCurrentUser || !canApproveLoss ? "A different user with Finance approval must review and post this shortage."
                  : "Confirm the goods are missing. Posting receives the counted stock and writes off the missing stock at its carrying cost."}</p>
                {shortLines.map((line) => <div key={line.id} className="text-muted-foreground">
                  <p>{line.sku} · {line.quantity - (line.receivedQuantity ?? line.quantity)} {line.unit} missing · {line.receiptExceptionReason}</p>
                  {line.missingLots?.map((entry) => <p key={entry.lotId} className="text-xs">{line.transitLots?.find((lot) => lot.lotId === entry.lotId)?.lotNumber} · {entry.quantity} {line.unit} missing</p>)}
                </div>)}
                {canWrite && requiresReporter && !receiptChanges.length && (
                  <Button size="sm" variant="outline" disabled={working} onClick={() => void perform(() => saveTransferReceiptCounts(id, t.lines.flatMap((line, lineIndex) =>
                    (line.receivedQuantity ?? line.quantity) < line.quantity && !line.shortageReportRecorded
                      ? [{ lineIndex, receivedQuantity: line.receivedQuantity!, reason: line.receiptExceptionReason, missingLots: line.missingLots }] : []
                  )), "Shortage report saved.")}>Confirm shortage counts</Button>
                )}
                {canApproveLoss && !requiresReporter && !t.shortageReporterIsCurrentUser && t.reviewVersion && (
                  <div className="flex flex-wrap gap-2">
                    {confirmLoss && <Button size="sm" variant="outline" disabled={working} onClick={() => setConfirmLoss(false)}>Cancel</Button>}
                    <Button size="sm" disabled={working || receiptChanges.length > 0} onClick={() => {
                      if (confirmLoss) void perform(() => approveTransferShortage(id, t.reviewVersion!), "Shortage posted and transfer received.");
                      else setConfirmLoss(true);
                    }}>{confirmLoss ? "Confirm write-off and receipt" : "Review and post shortage"}</Button>
                  </div>
                )}
              </div>
            )}
            {t.shortageApprovedBy && <p className="font-medium">Shortage posted by {t.shortageApprovedBy}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Products and receipt counts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Dispatched</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.lines.map((line) => {
                  const draft = receiptDraft[line.id] ?? { quantity: String(line.receivedQuantity ?? line.quantity), reason: line.receiptExceptionReason ?? "", missingLots: Object.fromEntries((line.missingLots ?? []).map((lot) => [lot.lotId, String(lot.quantity)])) };
                  const showReceiptInput = canWrite && canReceive;
                  const unit = line.unit ?? "";
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.sku}</TableCell>
                      <TableCell>
                        {line.productName}
                        {!!line.lotNumbers?.length && <span className="block text-xs text-muted-foreground">Lots: {line.lotNumbers.join(", ")}</span>}
                      </TableCell>
                      <TableCell>
                        {line.quantity} {unit}
                        {line.enteredUom && line.enteredUom !== unit && <span className="block text-xs text-muted-foreground">Entered as {line.enteredQuantity} {line.enteredUom}</span>}
                      </TableCell>
                      <TableCell>{canReceive || t.status === "RECEIVED" ? `${line.quantity} ${unit}` : "—"}</TableCell>
                      <TableCell>
                        {showReceiptInput ? (
                          <div className="min-w-32 space-y-1">
                            <Input type="number" min={0} max={line.quantity} step="any" value={draft.quantity} aria-label={`Received quantity for ${line.sku}`} onChange={(event) => setReceiptDraft((current) => ({ ...current, [line.id]: { ...draft, quantity: event.target.value } }))} />
                            {draft.quantity.trim() && Number(draft.quantity) < line.quantity && (
                              <Input value={draft.reason} placeholder="Reason for shortage" aria-label={`Shortage reason for ${line.sku}`} onChange={(event) => setReceiptDraft((current) => ({ ...current, [line.id]: { ...draft, reason: event.target.value } }))} />
                            )}
                            {Number(draft.quantity) < line.quantity && (line.transitLots?.length ?? 0) > 1 && (
                              <fieldset className="space-y-1 rounded-md border p-2">
                                <legend className="px-1 text-xs font-medium">Missing by lot</legend>
                                {line.transitLots?.map((lot) => (
                                  <label key={lot.lotId} className="grid grid-cols-[1fr_5rem] items-center gap-2 text-xs">
                                    <span>{lot.lotNumber}<span className="block text-muted-foreground">{lot.quantity} {unit} dispatched</span></span>
                                    <Input type="number" min={0} max={lot.quantity} step="any"
                                      aria-label={`Missing quantity for lot ${lot.lotNumber}`}
                                      value={draft.missingLots?.[lot.lotId] ?? ""}
                                      onChange={(event) => setReceiptDraft((current) => ({ ...current, [line.id]: { ...draft, missingLots: { ...draft.missingLots, [lot.lotId]: event.target.value } } }))} />
                                  </label>
                                ))}
                              </fieldset>
                            )}
                          </div>
                        ) : (
                          <>
                            {line.receivedQuantity == null ? "—" : `${line.receivedQuantity} ${unit}`}
                            {line.receiptExceptionReason && <span className="block text-xs text-muted-foreground">{line.receiptExceptionReason}</span>}
                            {line.shortageValue != null && <span className="block text-xs font-medium">
                              Loss value {line.shortageValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              {line.shortageJournalId && <> · <Link className="underline" href={`/docs/journal/${encodeURIComponent(line.shortageJournalId)}`}>Journal entry</Link></>}
                            </span>}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {canWrite && canReceive && receiptChanges.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!validReceipt && <p className="text-sm text-destructive">Check the receipt counts, shortage reasons, and missing quantities by lot.</p>}
            <Button variant="outline" size="sm" disabled={working} onClick={() => setReceiptDraft({})}>Reset counts</Button>
            <Button size="sm" disabled={working || !validReceipt} onClick={() => void perform(() => saveTransferReceiptCounts(id, receiptChanges), "Receipt counts saved.")}>Save receipt counts</Button>
          </div>
        )}
        <Card>
          <CardHeader><CardTitle className="text-base">Stock movements</CardTitle></CardHeader>
          <CardContent>
            {!t.movements?.length ? <p className="text-sm text-muted-foreground">No stock movements recorded for this transfer.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Warehouse</TableHead><TableHead>Product</TableHead><TableHead>Stock change</TableHead><TableHead>Recorded by</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>{t.movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{movement.warehouse}</TableCell>
                    <TableCell>{movement.productName}</TableCell>
                    <TableCell className="tabular-nums">{movement.quantity > 0 ? "+" : ""}{movement.quantity} {movement.unit}</TableCell>
                    <TableCell>{movement.by ?? "—"}</TableCell>
                    <TableCell>{new Date(movement.at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentTimeline
              entries={[
                { id: "created", action: "Draft created", by: t.createdBy ?? "Operator unavailable", at: new Date(t.createdAt ?? t.date).toLocaleString() },
                ...(t.activity ?? []).map((entry) => ({ ...entry, action: auditLabels[entry.action] ?? entry.action, by: entry.by ?? "Operator unavailable", at: new Date(entry.at).toLocaleString() })),
                ...(t.receivedAt && !t.activity?.some((entry) => entry.action === "inventory.transfer.receive")
                  ? [{ id: "received", action: "Received", by: "Operator unavailable", at: new Date(t.receivedAt).toLocaleString() }] : []),
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
