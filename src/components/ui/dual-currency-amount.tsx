import * as React from "react";
import { formatMoney, kesEquivalent } from "@/lib/money";
import { cn } from "@/lib/utils";

interface DualCurrencyAmountProps {
  amount: number;
  /** Document currency (KES, UGX, USD, …). Defaults to KES. */
  currency?: string;
  /** Exchange rate: document currency → KES. Required when currency is not KES. */
  exchangeRate?: number;
  /** Text alignment. Default: left. */
  align?: "left" | "right";
  /**
   * sm — compact table cell (primary text-sm, secondary text-[10px])
   * md — card header / detail view (primary text-base font-semibold, secondary text-xs)
   */
  size?: "sm" | "md";
  className?: string;
}

/**
 * DualCurrencyAmount always displays KES as the primary amount.
 * If the document is in a foreign currency (UGX, USD, …) the original
 * foreign amount is shown in a smaller muted line below.
 *
 * Usage:
 *   <DualCurrencyAmount amount={25_000_000} currency="UGX" exchangeRate={0.028} />
 *   → KES 700,000.00
 *     UGX 25,000,000
 */
export function DualCurrencyAmount({
  amount,
  currency = "KES",
  exchangeRate,
  align = "left",
  size = "sm",
  className,
}: DualCurrencyAmountProps) {
  const normalised = (currency ?? "KES").toUpperCase();
  const isBase = normalised === "KES";
  const kes = kesEquivalent(amount, normalised, exchangeRate);

  const primarySize = size === "md" ? "text-base font-semibold" : "text-sm font-medium";
  const secondarySize = size === "md" ? "text-xs" : "text-[10px]";
  const alignClass = align === "right" ? "items-end" : "items-start";

  if (isBase) {
    return (
      <span className={cn("tabular-nums", primarySize, className)}>
        {formatMoney(amount, "KES")}
      </span>
    );
  }

  if (kes === null) {
    // Rate not available — show foreign amount + subtle indicator
    return (
      <div className={cn("inline-flex flex-col gap-0.5", alignClass, className)}>
        <span className={cn("tabular-nums", primarySize)}>
          {formatMoney(amount, normalised)}
        </span>
        <span className={cn("tabular-nums text-amber-500", secondarySize)}>
          rate pending
        </span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex flex-col gap-0.5", alignClass, className)}>
      <span className={cn("tabular-nums", primarySize)}>
        {formatMoney(kes, "KES")}
      </span>
      <span className={cn("tabular-nums text-muted-foreground", secondarySize)}>
        {formatMoney(amount, normalised)}
      </span>
    </div>
  );
}
