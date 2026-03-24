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
  const display = focused ? value : value ? formatDecimalDisplay(value) : "";

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn("tabular-nums", className)}
      value={display}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onChange={(e) => {
        onValueChange(sanitizeDecimalInput(e.target.value));
      }}
    />
  );
}
