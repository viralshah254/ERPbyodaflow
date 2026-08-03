"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ODAFLOW_CUSTOMER_CORRECTION_REASONS,
  ODAFLOW_PRODUCT_CORRECTION_REASONS,
  type OdaflowEditChangePreview,
  type OdaflowMappingCorrectionReason,
  type OdaflowMappingCorrectionsPayload,
} from "@/lib/odaflow-mapping-corrections";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: OdaflowEditChangePreview | null;
  submitting?: boolean;
  confirmLabel?: string;
  onConfirm: (corrections: OdaflowMappingCorrectionsPayload) => void;
};

export function OdaflowSalesOrderCorrectionDialog({
  open,
  onOpenChange,
  changes,
  submitting = false,
  confirmLabel = "Confirm",
  onConfirm,
}: Props) {
  const [customerReason, setCustomerReason] = React.useState<OdaflowMappingCorrectionReason | "">("");
  const [productReasons, setProductReasons] = React.useState<Record<string, OdaflowMappingCorrectionReason | "">>(
    {}
  );

  React.useEffect(() => {
    if (!open) return;
    setCustomerReason("");
    setProductReasons({});
  }, [open, changes]);

  const customerReady = !changes?.customer || Boolean(customerReason);
  const productsReady =
    !changes?.products.length ||
    changes.products.every((p) => Boolean(productReasons[p.lineId]));
  const canConfirm = customerReady && productsReady && !submitting;

  function handleConfirm() {
    if (!changes || !canConfirm) return;
    const payload: OdaflowMappingCorrectionsPayload = {};
    if (changes.customer && customerReason) {
      payload.customer = {
        newPartyId: changes.customer.toPartyId,
        reason: customerReason,
      };
    }
    if (changes.products.length) {
      payload.products = changes.products.map((p) => ({
        lineId: p.lineId,
        newProductId: p.toProductId,
        reason: productReasons[p.lineId] as OdaflowMappingCorrectionReason,
      }));
    }
    onConfirm(payload);
  }

  if (!changes) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[80] flex max-h-[90vh] w-full max-w-xl translate-x-[-50%] translate-y-[-50%] flex-col gap-4 overflow-hidden rounded-lg border bg-background p-6 shadow-lg"
          )}
        >
          <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
            <Icons.ArrowLeftRight className="h-5 w-5 text-sky-600 shrink-0" />
            Why did you change this product?
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            This sales order came from Odaflow SFA. Choose a reason for each product swap so we know whether to update
            automatic matching for future orders.
          </Dialog.Description>

          <div className="overflow-y-auto space-y-4 pr-1 -mr-1">
            {changes.customer ? (
              <div className="rounded-md border p-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer change</p>
                  <p className="text-sm mt-1">
                    <span className="line-through text-muted-foreground">{changes.customer.fromLabel}</span>
                    {" → "}
                    <span className="font-medium">{changes.customer.toLabel}</span>
                  </p>
                  {changes.customer.odaflowCustomerName ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Odaflow PDF/customer: {changes.customer.odaflowCustomerName}
                      {changes.customer.odaflowCustomerId ? ` (${changes.customer.odaflowCustomerId})` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={customerReason} onValueChange={(v) => setCustomerReason(v as OdaflowMappingCorrectionReason)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ODAFLOW_CUSTOMER_CORRECTION_REASONS.map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customerReason === "wrong_match" ? (
                    <p className="text-xs text-sky-700 dark:text-sky-300">
                      Future Odaflow orders for this SFA customer will map to {changes.customer.toLabel}.
                    </p>
                  ) : customerReason ? (
                    <p className="text-xs text-muted-foreground">
                      Only this order changes — saved Odaflow matching stays as it was.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {changes.products.map((product) => (
              <div key={product.lineId} className="rounded-md border p-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product change</p>
                  <p className="text-sm mt-1">
                    <span className="line-through text-muted-foreground">{product.fromLabel}</span>
                    {" → "}
                    <span className="font-medium">{product.toLabel}</span>
                  </p>
                  {product.odaflowProductName ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Odaflow line: {product.odaflowProductName}
                      {product.odaflowProductId ? ` (${product.odaflowProductId})` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select
                    value={productReasons[product.lineId] ?? ""}
                    onValueChange={(v) =>
                      setProductReasons((prev) => ({
                        ...prev,
                        [product.lineId]: v as OdaflowMappingCorrectionReason,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ODAFLOW_PRODUCT_CORRECTION_REASONS.map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {productReasons[product.lineId] === "wrong_match" ? (
                    <p className="text-xs text-sky-700 dark:text-sky-300">
                      Future Odaflow orders for this SFA product will map to {product.toLabel}.
                    </p>
                  ) : productReasons[product.lineId] === "substitution" ? (
                    <p className="text-xs text-muted-foreground">
                      Replacement on this order only — saved Odaflow matching stays as it was.
                    </p>
                  ) : productReasons[product.lineId] ? (
                    <p className="text-xs text-muted-foreground">
                      Only this order changes — saved Odaflow matching stays as it was.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canConfirm} onClick={handleConfirm}>
              {submitting ? "Working…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
