"use client";

import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared loading state for document detail tabs (taxes, comments, attachments, etc.). */
export function DocumentTabLoading({
  label = "Loading…",
  className,
  rows = 3,
}: {
  label?: string;
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-4 py-8 text-sm text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Icons.Loader2 className="h-4 w-4 animate-spin" />
        <span>{label}</span>
      </div>
      <div className="mx-auto max-w-md space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-3 flex-1 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
