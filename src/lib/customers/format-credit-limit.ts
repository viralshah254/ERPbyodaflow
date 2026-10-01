import { formatMoney } from "@/lib/money";

export type CreditControlMode = "AMOUNT" | "DAYS" | "HYBRID";

export function creditModeUses(mode: CreditControlMode | null | undefined): {
  amount: boolean;
  days: boolean;
} {
  const resolved = mode ?? "AMOUNT";
  return {
    amount: resolved === "AMOUNT" || resolved === "HYBRID",
    days: resolved === "DAYS" || resolved === "HYBRID",
  };
}

/** Blank, missing, and zero all mean that side of the limit is off. */
export function positiveLimit(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function formatCustomerCreditLimit(input: {
  mode?: CreditControlMode | null;
  amount?: number | null;
  days?: number | null;
  currency: string;
}): string {
  const { amount: showAmount, days: showDays } = creditModeUses(input.mode);
  const amount = showAmount ? positiveLimit(input.amount) : null;
  const days = showDays ? positiveLimit(input.days) : null;
  const amountLabel = amount != null ? formatMoney(amount, input.currency) : null;
  const daysLabel = days != null ? `${days} days` : null;
  if (amountLabel && daysLabel) return `${amountLabel} + ${daysLabel}`;
  return amountLabel ?? daysLabel ?? "No limit";
}
