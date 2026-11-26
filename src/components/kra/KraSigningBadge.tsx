"use client";
import * as React from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  isCustomerPinKraSkip,
  kraSigningDisplayLabel,
  kraSigningStatusVariant,
  type KraSigningRecord,
} from "@/lib/kra/kra-signing";
import { cn } from "@/lib/utils";

type KraSigningBadgeProps = {
  kraSigning?: KraSigningRecord | null;
  documentStatus?: string;
  compact?: boolean;
  className?: string;
};

export function KraSigningBadge({
  kraSigning,
  documentStatus,
  compact = false,
  className,
}: KraSigningBadgeProps) {
  const posted = String(documentStatus ?? "").toUpperCase() === "POSTED";
  if (!posted && !kraSigning) {
    return <span className={cn("text-muted-foreground text-sm", className)}>—</span>;
  }

  const status = kraSigning?.status;
  const pinSkip = isCustomerPinKraSkip(kraSigning);
  const label = kraSigningDisplayLabel(kraSigning);
  const variant = status === "skipped" || pinSkip ? "default" : kraSigningStatusVariant(status);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <StatusBadge status={label} variant={variant} />
      {!compact && status === "failed" && !pinSkip && kraSigning?.errorMessage ? (
        <span
          className="text-xs text-destructive line-clamp-2"
          title={kraSigning.errorMessage}
        >
          {kraSigning.errorMessage}
        </span>
      ) : null}
      {!compact && status === "signed" && (kraSigning?.receiptNumber || kraSigning?.cuInvoiceNumber) ? (
        <span className="text-xs text-muted-foreground font-mono" title="KRA receipt">
          {kraSigning?.receiptNumber
            ? `eTIMS ${kraSigning.receiptNumber}`
            : `CU ${kraSigning?.cuInvoiceNumber}`}
        </span>
      ) : null}
    </div>
  );
}
