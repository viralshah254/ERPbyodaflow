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

  const handleApprove = () => {
    onApprove?.(item.id, comment || undefined);
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!comment.trim()) {
      setError("Rejection note is required for this decision.");
      return;
    }
    onReject?.(item.id, comment || undefined);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Approval</SheetTitle>
          <SheetDescription>
            Review the document context, add comments, and complete the approval decision.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {item.creditBreachReason && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Credit policy breach reason</p>
              <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">{item.creditBreachReason}</p>
            </div>
          )}
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Document</span>{" "}
              <span className="font-medium">{item.documentNumber}</span>{" "}
              ({item.documentType})
            </p>
            <p>
              <span className="text-muted-foreground">Amount</span>{" "}
              {formatMoney(item.amount, item.currency)}
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
            <Label>Comment {onReject ? "(required to reject)" : "(optional)"}</Label>
            <textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              )}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
        <SheetFooter className="mt-6 flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={drillToDocument(item.documentType, item.documentId).href}>View document</Link>
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {onApprove || onReject ? "Cancel" : "Close"}
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
