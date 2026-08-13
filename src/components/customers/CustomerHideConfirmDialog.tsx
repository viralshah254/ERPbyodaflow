"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export type CustomerHideKind = "hq" | "branch" | "customer";

type CustomerHideConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  kind: CustomerHideKind;
  onConfirm: () => void | Promise<void>;
};

function copyFor(kind: CustomerHideKind, name: string) {
  if (kind === "hq") {
    return {
      title: "Remove this supermarket?",
      lead: `${name} and every branch under it will leave this organisation’s customer list.`,
      points: [
        "You will not see the HQ or its branches when creating orders or invoices here.",
        "The shared SFA catalog is unchanged — other organisations still see this chain.",
      ],
      confirmLabel: "Remove supermarket",
    };
  }
  if (kind === "branch") {
    return {
      title: "Remove this branch?",
      lead: `${name} will leave this organisation’s customer list.`,
      points: [
        "The supermarket HQ and other branches stay visible here.",
        "The shared SFA catalog is unchanged — other organisations still see this branch.",
      ],
      confirmLabel: "Remove branch",
    };
  }
  return {
    title: "Remove this customer?",
    lead: `${name} will leave this organisation’s customer list.`,
    points: [
      "They will not appear in your parties or when creating new orders here.",
      "This does not delete them from SFA or from any other organisation.",
    ],
    confirmLabel: "Remove customer",
  };
}

export function CustomerHideConfirmDialog({
  open,
  onOpenChange,
  name,
  kind,
  onConfirm,
}: CustomerHideConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const copy = copyFor(kind, name);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-customer-hide-dialog=""
          className="fixed inset-0 z-[80] pointer-events-auto bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          data-customer-hide-dialog=""
          className={cn(
            "fixed left-[50%] top-[50%] z-[80] pointer-events-auto grid w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-5 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-xl"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
              <Icons.Trash2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <Dialog.Title className="text-lg font-semibold leading-tight">{copy.title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">{copy.lead}</Dialog.Description>
            </div>
          </div>

          <ul className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {copy.points.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Keep
            </Button>
            <Button type="button" variant="destructive" disabled={submitting} onClick={() => void handleConfirm()}>
              {submitting ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                copy.confirmLabel
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
