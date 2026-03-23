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
import type { ApprovalItem } from "@/lib/types/approvals";
import { drillToDocument } from "@/lib/drill-through";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export interface ApprovalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApprovalItem | null;
  onApprove?: (id: string, comment?: string) => void;
  onReject?: (id: string, comment?: string) => void;
}

export function ApprovalSheet({
  open,
  onOpenChange,
  item,
  onApprove,
  onReject,
}: ApprovalSheetProps) {
  const [comment, setComment] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setComment("");
      setError("");
    }
  }, [open]);

  if (!item) return null;

  const isCreditBreach = Boolean(item.creditBreachReason);
  const isActionable = Boolean(onApprove || onReject);

  const handleApprove = () => {
    if (isCreditBreach && !comment.trim()) {
      setError("A reason is required when approving a credit policy override.");
      return;
    }
    setError("");
    onApprove?.(item.id, comment || undefined);
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!comment.trim()) {
      setError("Rejection note is required for this decision.");
      return;
    }
    setError("");
    onReject?.(item.id, comment || undefined);
    onOpenChange(false);
  };

  const handleRequestInfo = () => {
    const msg = comment.trim()
      ? `More info requested: ${comment.trim()}`
      : "More info requested before a decision can be made.";
    onReject?.(item.id, msg);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isCreditBreach ? "Credit override approval" : "Approval"}</SheetTitle>
          <SheetDescription>
            {isCreditBreach
              ? "This invoice exceeded the customer's credit limit. Review the breach details and decide whether to override."
              : "Review the document context, add comments, and complete the approval decision."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {isCreditBreach && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-800 dark:text-amber-200">Credit policy breach</span>
              </div>
              <p className="text-amber-800/90 dark:text-amber-200/90">{item.creditBreachReason}</p>
              <div className="mt-2 pt-2 border-t border-amber-500/20 text-xs text-amber-800/70 dark:text-amber-200/70 space-y-1">
                <p><strong>Approve with override</strong> — customer will be served; breach is logged in audit trail.</p>
                <p><strong>Reject</strong> — invoice reverts to draft; requester must resolve credit before resubmitting.</p>
                <p><strong>Request more info</strong> — sends the item back with a note asking for clarification.</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Document</span>{" "}
              <span className="font-medium">{item.documentNumber}</span>{" "}
              <span className="text-muted-foreground">({item.documentType})</span>
            </p>
            <p>
              <span className="text-muted-foreground">Amount</span>{" "}
              <span className="font-medium">{formatMoney(item.amount, item.currency)}</span>
              {item.baseEquivalent != null && item.currency !== "KES" && (
                <span className="text-muted-foreground ml-1">
                  (base: {formatMoney(item.baseEquivalent, "KES")})
                </span>
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Requester</span>{" "}
              {item.requester}
            </p>
            <p>
              <span className="text-muted-foreground">Requested</span>{" "}
              {new Date(item.requestedAt).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              {isCreditBreach
                ? "Override reason (required to approve)"
                : "Comment (required to reject)"}
            </Label>
            <textarea
              placeholder={
                isCreditBreach
                  ? "e.g. Approved by Finance Director — customer has confirmed payment schedule..."
                  : "Add a comment..."
              }
              value={comment}
              onChange={(e) => { setComment(e.target.value); setError(""); }}
              rows={3}
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
                error && "border-destructive"
              )}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
          {isActionable && isCreditBreach ? (
            <>
              <Button
                className="w-full"
                onClick={handleApprove}
              >
                Approve with credit override
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRequestInfo}
              >
                Request more info
              </Button>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleReject}
              >
                Reject — revert to draft
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href={drillToDocument(item.documentType, item.documentId).href}>
                  View document
                </Link>
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <div className="flex flex-wrap gap-2 justify-end w-full">
              <Button variant="outline" asChild>
                <Link href={drillToDocument(item.documentType, item.documentId).href}>View document</Link>
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {isActionable ? "Cancel" : "Close"}
              </Button>
              {isActionable && (
                <>
                  <Button variant="outline" onClick={handleReject}>
                    Reject
                  </Button>
                  <Button onClick={handleApprove}>Approve</Button>
                </>
              )}
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
