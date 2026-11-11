"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

type OdaflowApprovalConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePdfUrl?: string;
  orderNumber?: string;
  confirmLabel?: string;
  /** Affects body copy — submit/request vs approve. */
  intent?: "submit" | "approve";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** Joy SFA orders name the route store before approval can be requested. */
  routeWarehouse?: {
    options: Array<{ id: string; label: string }>;
    value: string;
    onChange: (id: string) => void;
    loading?: boolean;
  };
};

export function OdaflowApprovalConfirmDialog({
  open,
  onOpenChange,
  sourcePdfUrl,
  orderNumber,
  confirmLabel = "Approve",
  intent = "approve",
  onConfirm,
  loading = false,
  routeWarehouse,
}: OdaflowApprovalConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = loading || submitting;
  const routeWarehouseMissing = Boolean(routeWarehouse) && !routeWarehouse?.value.trim();

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg"
          )}
        >
          <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
            <Icons.FileText className="h-5 w-5 text-sky-700 dark:text-sky-300" />
            Review original SFA order
          </Dialog.Title>
          <Dialog.Description asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This sales order was synced from Odaflow SFA
                {orderNumber ? ` (${orderNumber})` : ""}. Before{" "}
                {intent === "approve" ? "approving" : "submitting for approval"}, confirm quantities, products, and
                customer details match the original field order.
              </p>
              {sourcePdfUrl ? (
                <p>
                  <a
                    href={sourcePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-2"
                  >
                    Open original order PDF in a new tab
                    <Icons.ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              ) : (
                <p className="text-amber-800 dark:text-amber-200">
                  No original PDF was attached from Odaflow for this order. Verify line items against your SFA records
                  before approving.
                </p>
              )}
              {routeWarehouse ? (
                <div className="space-y-2 text-foreground">
                  <p className="font-medium">Route warehouse</p>
                  <p>This store is the route the order is delivered on.</p>
                  <SearchableSelect
                    value={routeWarehouse.value}
                    onValueChange={routeWarehouse.onChange}
                    options={routeWarehouse.options}
                    placeholder={routeWarehouse.loading ? "Loading stores…" : "Select the route warehouse"}
                    searchPlaceholder="Type to search stores"
                    emptyMessage="No route stores found."
                    disabled={busy || routeWarehouse.loading}
                  />
                </div>
              ) : null}
            </div>
          </Dialog.Description>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy || routeWarehouseMissing} onClick={() => void handleConfirm()}>
              {busy ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
