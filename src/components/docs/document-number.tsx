"use client";

import { cn } from "@/lib/utils";

/**
 * Renders document numbers (e.g. PO0001) with distinct letter vs digit styling
 * so "O" and "0" are not confused.
 */
export function DocumentNumber({
  value,
  className,
  asLink = false,
}: {
  value: string;
  className?: string;
  asLink?: boolean;
}) {
  const match = value.match(/^([A-Za-z]+)(\d+)$/);
  const prefix = match?.[1] ?? "";
  const digits = match?.[2];

  const content =
    prefix && digits ? (
      <>
        <span className="font-semibold tracking-wide text-foreground">{prefix}</span>
        <span className="tabular-nums slashed-zero text-foreground/90">{digits}</span>
      </>
    ) : (
      value.split("").map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className={cn(
            /[A-Za-z]/.test(ch) && "font-semibold tracking-wide",
            /\d/.test(ch) && "tabular-nums slashed-zero"
          )}
        >
          {ch}
        </span>
      ))
    );

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0 font-mono text-[13px] leading-none",
        asLink && "text-primary",
        className
      )}
      title={value}
    >
      {content}
    </span>
  );
}
