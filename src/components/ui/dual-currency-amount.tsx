import * as React from "react";
import Link from "next/link";
import { formatMoney, toBaseEquivalent } from "@/lib/money";
import { cn } from "@/lib/utils";

interface DualCurrencyAmountProps {
  amount: number;
  /** Document currency (KES, UGX, USD, …). Defaults to KES. */
  currency?: string;
  /** Exchange rate: document currency → baseCurrency. Required when currency !== baseCurrency. */
  exchangeRate?: number;
  /**
   * Org base / reporting currency. Defaults to "KES".
   * Pass `useBaseCurrency()` value to stay consistent with org settings.
   */
  baseCurrency?: string;
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
 * DualCurrencyAmount displays the base-currency equivalent as the primary amount.
 * If the document is in a foreign currency (UGX, USD, …) the original
 * foreign amount is shown in a smaller muted line below.
 *
 * The exchange rate comes from the *document snapshot* — no API calls on render.
 *
 * Usage:
 *   <DualCurrencyAmount amount={25_000_000} currency="UGX" exchangeRate={0.034} />
 *   → KES 850,000.00
 *       UGX 25,000,000
 */
export function DualCurrencyAmount({
  amount,
  currency = "KES",
  exchangeRate,
  baseCurrency = "KES",
  align = "left",
  size = "sm",
  className,
}: DualCurrencyAmountProps) {
  const normalised = (currency ?? "KES").toUpperCase();
  const base = (baseCurrency ?? "KES").toUpperCase();
  const isBase = normalised === base;
  const baseEquiv = toBaseEquivalent(amount, normalised, base, exchangeRate);

  const primarySize = size === "md" ? "text-base font-semibold" : "text-sm font-medium";
  const secondarySize = size === "md" ? "text-xs" : "text-[10px]";
  const alignClass = align === "right" ? "items-end" : "items-start";

  if (isBase) {
    return (
      <span className={cn("tabular-nums", primarySize, className)}>
        {formatMoney(amount, base)}
      </span>
    );
  }

  if (baseEquiv === null) {
    // Rate not available — show foreign amount + actionable link to set exchange rate
    return (
      <div className={cn("inline-flex flex-col gap-0.5", alignClass, className)}>
        <span className={cn("tabular-nums", primarySize)}>
          {formatMoney(amount, normalised)}
        </span>
        <Link
          href="/settings/financial/exchange-rates"
          className={cn("tabular-nums text-amber-500 underline-offset-2 hover:underline", secondarySize)}
          title="Set exchange rate in Settings → Financial → Exchange Rates"
        >
          set rate →
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex flex-col gap-0.5", alignClass, className)}>
      <span className={cn("tabular-nums", primarySize)}>
        {formatMoney(baseEquiv, base)}
      </span>
      <span className={cn("tabular-nums text-muted-foreground", secondarySize)}>
        {formatMoney(amount, normalised)}
      </span>
    </div>
  );
}
