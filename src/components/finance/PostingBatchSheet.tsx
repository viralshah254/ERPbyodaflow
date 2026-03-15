"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPostingBatchBySourceApi, fetchPostingBatchDetailApi, type PostingBatchDetail } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export function PostingBatchSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType?: string | null;
  sourceId?: string | null;
}) {
  const { open, onOpenChange, sourceType, sourceId } = props;
  const [batch, setBatch] = React.useState<PostingBatchDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !sourceType || !sourceId) {
      setBatch(null);
      return;
    }
    const resolvedSourceType = sourceType;
    const resolvedSourceId = sourceId;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const summary = await fetchPostingBatchBySourceApi(resolvedSourceType, resolvedSourceId);
        if (!summary) {
          if (!cancelled) setBatch(null);
          return;
        }
        const detail = await fetchPostingBatchDetailApi(summary.id);
        if (!cancelled) setBatch(detail);
      } catch (error) {
        if (!cancelled) toast.error((error as Error).message || "Failed to load posting batch.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, sourceType, sourceId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Posting Batch</SheetTitle>
          <SheetDescription>
            {batch
              ? `${batch.sourceType} · ${batch.sourceNumber ?? batch.sourceId} · ${batch.postingDate.slice(0, 10)}`
              : "Canonical finance posting detail"}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading posting batch...</div>
          ) : !batch ? (
            <div className="text-sm text-muted-foreground">No posting batch found for this source.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 rounded border p-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Reference</div>
                  <div>{batch.reference ?? batch.sourceNumber ?? batch.sourceId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Currency</div>
                  <div>{batch.currency}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reversal Of</div>
                  <div>{batch.reversalOfBatchId ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reversed By</div>
                  <div>{batch.reversedByBatchId ?? "—"}</div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.accountCode} · {line.accountName}</TableCell>
                      <TableCell>{line.description ?? "—"}</TableCell>
                      <TableCell className="text-right">{line.debit ? formatMoney(line.debit, batch.currency) : "—"}</TableCell>
                      <TableCell className="text-right">{line.credit ? formatMoney(line.credit, batch.currency) : "—"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Totals</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-medium">{formatMoney(batch.totals.debit, batch.currency)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(batch.totals.credit, batch.currency)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
