"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export type FranchiseInboundRejectTarget = {
  prNumber: string;
  outletName: string;
};

interface FranchiseInboundRejectDialogProps {
  target: FranchiseInboundRejectTarget | null;
  onOpenChange: (open: boolean) => void;
  rejecting?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
}

export function FranchiseInboundRejectDialog({
  target,
  onOpenChange,
  rejecting = false,
  onConfirm,
}: FranchiseInboundRejectDialogProps) {
  const [reason, setReason] = React.useState("");
  const open = target != null;

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open, target?.prNumber]);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    void Promise.resolve(onConfirm(trimmed || undefined));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Icons.XCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold leading-tight">
                Reject stock request?
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {target
                  ? `Decline ${target.prNumber} from ${target.outletName}. The outlet will be notified and can submit a new request later.`
                  : "Decline this franchise stock request."}
              </Dialog.Description>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Out of stock, minimum order not met…"
              rows={3}
              disabled={rejecting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={rejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={rejecting}>
              {rejecting ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting…
                </>
              ) : (
                "Reject request"
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
