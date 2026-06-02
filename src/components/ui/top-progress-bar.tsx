"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TopProgressBarProps {
  /** When true the bar animates; when false it fades out. */
  active: boolean;
  className?: string;
}

/**
 * A thin, non-destructive indeterminate progress bar.
 * Designed to sit at the top edge of a container (the parent should be `relative`)
 * so data underneath stays visible while a background fetch is in flight.
 */
export function TopProgressBar({ active, className }: TopProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-hidden={!active}
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden",
        "transition-opacity duration-300",
        active ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-primary animate-indeterminate-bar" />
    </div>
  );
}
