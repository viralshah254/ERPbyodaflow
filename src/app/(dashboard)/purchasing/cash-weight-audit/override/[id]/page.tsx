"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApprovalItem } from "@/lib/types/approvals";
import { fetchApprovalById, approveApprovalApi, rejectApprovalApi } from "@/lib/api/approvals";
import { toast } from "sonner";
import { ArrowLeft, Scale, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

type OverridePayload = {
  // Proposed (new) values
  paidWeightKg?: number | null;
  receivedWeightKg?: number | null;
  reason?: string;
  // Snapshot of values at the time the request was made
  currentPaidWeightKg?: number | null;
  currentReceivedWeightKg?: number | null;
  currentVarianceKg?: number | null;
  orderedQty?: number | null;
};

function parsePayload(comment?: string): OverridePayload | null {
  if (!comment) return null;
  try {
    return JSON.parse(comment) as OverridePayload;
  } catch {
    return null;
  }
}

function fmtKg(val: number | null | undefined): string {
  if (val == null) return "—";
  return val.toFixed(3);
}

function ChangeRow({
  label,
  before,
  after,
  changed,
  colorAfter,
}: {
  label: string;
  before: string;
  after: string;
  changed: boolean;
  colorAfter?: string;
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 tabular-nums font-medium">
        {changed ? (
          <>
            <span className="line-through text-muted-foreground">{before}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className={colorAfter ?? ""}>{after}</span>
          </>
        ) : (
          <span>{before}</span>
        )}
      </span>
    </>
  );
}

function StatusBadge({ status }: { status: ApprovalItem["status"] }) {
  if (status === "approved") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30">
        <XCircle className="w-3 h-3 mr-1" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
      <Clock className="w-3 h-3 mr-1" />
      Pending review
    </Badge>
  );
}

export default function OverrideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [approval, setApproval] = React.useState<ApprovalItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [rejectNote, setRejectNote] = React.useState("");
  const [noteError, setNoteError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetchApprovalById(id)
      .then(setApproval)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const payload = parsePayload(approval?.comment);

  const handleApprove = async () => {
    if (!approval) return;
    setSubmitting(true);
    try {
      await approveApprovalApi(approval.id);
      toast.success("Weight correction approved and applied.");
      setApproval((prev) => prev ? { ...prev, status: "approved" } : prev);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approval) return;
    if (!rejectNote.trim()) {
      setNoteError("A rejection note is required.");
      return;
    }
    setNoteError("");
    setSubmitting(true);
    try {
      await rejectApprovalApi(approval.id, rejectNote.trim());
      toast.success("Request rejected.");
      setApproval((prev) => prev ? { ...prev, status: "rejected" } : prev);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = approval?.status === "pending";

  // Derived comparison values
  const proposedPaid = payload?.paidWeightKg ?? null;
  const proposedReceived = payload?.receivedWeightKg ?? null;
  const currentPaid = payload?.currentPaidWeightKg ?? null;
  const currentReceived = payload?.currentReceivedWeightKg ?? null;
  const currentVariance = payload?.currentVarianceKg ?? null;
  const orderedQty = payload?.orderedQty ?? null;

  const proposedVariance =
    proposedPaid != null && proposedReceived != null
      ? proposedReceived - proposedPaid
      : proposedReceived != null && currentPaid != null
      ? proposedReceived - currentPaid
      : proposedPaid != null && currentReceived != null
      ? currentReceived - proposedPaid
      : null;

  const effectivePaid = proposedPaid ?? currentPaid;
  const effectiveReceived = proposedReceived ?? currentReceived;

  const paidChanged = proposedPaid != null && proposedPaid !== currentPaid;
  const receivedChanged = proposedReceived != null && proposedReceived !== currentReceived;

  const varianceColorClass = (v: number | null) => {
    if (v == null) return "";
    if (Math.abs(v) < 0.001) return "text-emerald-600 dark:text-emerald-400";
    if (v < 0) return "text-red-600 dark:text-red-400";
    return "text-amber-600 dark:text-amber-400";
  };

  return (
    <PageShell>
      <PageHeader
        title="Weight correction request"
        description="Review the proposed weight changes and approve or reject."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/purchasing/cash-weight-audit">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to audit
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : !approval ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <p className="text-sm">Override request not found.</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6 py-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{approval.documentNumber}</h2>
            <StatusBadge status={approval.status} />
          </div>

          {/* Weight comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Weight comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payload ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {/* PO ordered weight — reference only, never changes */}
                    {orderedQty != null && (
                      <>
                        <span className="text-muted-foreground">PO ordered (kg)</span>
                        <span className="tabular-nums font-medium">{fmtKg(orderedQty)}</span>
                      </>
                    )}

                    <ChangeRow
                      label="Paid weight (kg)"
                      before={fmtKg(currentPaid)}
                      after={fmtKg(proposedPaid)}
                      changed={paidChanged}
                    />

                    <ChangeRow
                      label="Received weight (kg)"
                      before={fmtKg(currentReceived)}
                      after={fmtKg(proposedReceived)}
                      changed={receivedChanged}
                    />

                    {/* Variance row — show current and proposed side by side when either weight changes */}
                    {(paidChanged || receivedChanged) && (currentVariance != null || proposedVariance != null) ? (
                      <ChangeRow
                        label="Variance (kg)"
                        before={fmtKg(currentVariance)}
                        after={fmtKg(proposedVariance)}
                        changed={currentVariance !== proposedVariance}
                        colorAfter={varianceColorClass(proposedVariance)}
                      />
                    ) : (
                      <>
                        <span className="text-muted-foreground">Variance (kg)</span>
                        <span className={cn("tabular-nums font-medium", varianceColorClass(currentVariance))}>
                          {fmtKg(currentVariance)}
                        </span>
                      </>
                    )}
                  </div>

                  {payload.reason && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Reason from requester</p>
                      <p className="text-sm">{payload.reason}</p>
                    </div>
                  )}

                  {/* Summary sentence for clarity */}
                  {(paidChanged || receivedChanged) && (
                    <div className="pt-3 border-t text-xs text-muted-foreground">
                      {paidChanged && receivedChanged
                        ? `Both paid and received weights will be updated. New variance: ${fmtKg(proposedVariance)} kg.`
                        : paidChanged
                        ? `Paid weight will change from ${fmtKg(currentPaid)} → ${fmtKg(proposedPaid)} kg. New variance: ${fmtKg(proposedVariance)} kg.`
                        : `Received weight will change from ${fmtKg(currentReceived)} → ${fmtKg(proposedReceived)} kg. New variance: ${fmtKg(proposedVariance)} kg.`}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No structured payload found.</p>
              )}
            </CardContent>
          </Card>

          {/* Request metadata */}
          <Card>
            <CardContent className="pt-4 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">Requested by</span>
                <span>{approval.requester}</span>
                <span className="text-muted-foreground">Requested at</span>
                <span>{new Date(approval.requestedAt).toLocaleString()}</span>
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{approval.status}</span>
              </div>
            </CardContent>
          </Card>

          {/* Approve / Reject actions */}
          {isPending && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Rejection note <span className="text-muted-foreground">(required to reject)</span>
                  </label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => { setRejectNote(e.target.value); setNoteError(""); }}
                    placeholder="Explain the reason for rejecting this correction request…"
                    rows={3}
                    className={cn(
                      "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "resize-none",
                      noteError && "border-destructive"
                    )}
                  />
                  {noteError && <p className="text-xs text-destructive">{noteError}</p>}
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={handleApprove} disabled={submitting}>
                    Approve correction
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={handleReject}
                    disabled={submitting}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isPending && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                This request has already been <strong>{approval.status}</strong> and cannot be changed.
              </p>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
