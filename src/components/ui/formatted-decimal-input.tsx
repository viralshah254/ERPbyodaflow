"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeDecimalInput, formatDecimalDisplay } from "@/lib/decimal-input";

export interface FormattedDecimalInputProps extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value: string;
  onValueChange: (raw: string) => void;
}

/**
 * Decimal text field that shows thousands separators when blurred and raw digits when focused.
 */
export function FormattedDecimalInput({
  value,
  onValueChange,
  className,
  onFocus,
  onBlur,
  ...props
}: FormattedDecimalInputProps) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  // Sync from parent when blurred (programmatic updates, line switches, etc.)
  React.useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  const display = focused ? draft : draft ? formatDecimalDisplay(draft) : "";

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn("tabular-nums", className)}
      value={display}
      onFocus={(e) => {
        setDraft(value);
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        const normalized = sanitizeDecimalInput(draft);
        const final =
          normalized.endsWith(".") && normalized.length > 1
            ? normalized.slice(0, -1)
            : normalized;
        setDraft(final);
        if (final !== value) onValueChange(final);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const next = sanitizeDecimalInput(e.target.value);
        setDraft(next);
        onValueChange(next);
      }}
    />
  );
}
