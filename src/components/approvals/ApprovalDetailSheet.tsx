"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApprovalItem } from "@/lib/mock/dashboard";
import { drillToDocument } from "@/lib/drill-through";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ApprovalDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApprovalItem | null;
  onApprove?: (id: string, comment?: string) => void;
  onReject?: (id: string, comment?: string) => void;
}

export function ApprovalDetailSheet({
  open,
  onOpenChange,
  item,
  onApprove,
  onReject,
}: ApprovalDetailSheetProps) {
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    if (!open) setComment("");
  }, [open, item?.id]);

  if (!item) return null;

  const docType = item.documentType ?? item.entityType;
  const docId = item.documentId ?? item.entityId;
  const viewDocLink = docType && docId ? drillToDocument(docType, docId).href : null;
  const lineItems = item.lineItems ?? [];
  const amount = item.amount ?? 0;
  const currency = item.currency ?? "KES";

  const handleApprove = () => {
    onApprove?.(item.id, comment || undefined);
    onOpenChange(false);
  };

  const handleReject = () => {
    onReject?.(item.id, comment || undefined);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {item.reference}
            {item.severity === "high" && (
              <span className="text-xs font-normal text-amber-600">High priority</span>
            )}
          </SheetTitle>
          <SheetDescription>
            Review details, then approve or reject. You can add an optional comment.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {/* Header block */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium capitalize">{item.entityType.replace(/-/g, " ")}</span>
            </div>
            {item.party && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Party</span>
                <span className="font-medium">{item.party}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Requested</span>
              <span>{new Date(item.requestedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Requester</span>
              <span>{item.requestedBy}</span>
            </div>
            {amount > 0 && (
              <div className="flex justify-between gap-2 pt-2 border-t">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatMoney(amount, currency)}</span>
              </div>
            )}
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Line items</Label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs w-16 text-right">Qty</TableHead>
                      <TableHead className="text-xs w-20 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm py-2">{line.description}</TableCell>
                        <TableCell className="text-right text-sm py-2">
                          {line.qty != null ? `${line.qty} ${line.unit ?? ""}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums py-2">
                          {line.amount != null ? formatMoney(line.amount, currency) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label>Comment (optional)</Label>
            <textarea
              placeholder="Add a comment for the requester..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className={cn(
                "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              )}
            />
          </div>
        </div>
        <SheetFooter className="mt-6 flex-wrap gap-2">
          {viewDocLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href={viewDocLink}>View full document</Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {(onApprove || onReject) && (
            <>
              <Button variant="outline" onClick={handleReject}>
                Reject
              </Button>
              <Button onClick={handleApprove}>Approve</Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
