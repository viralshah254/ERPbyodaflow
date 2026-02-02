"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DocumentStatusBarProps {
  status: string;
  className?: string;
}

/** Horizontal status bar below document header. */
export function DocumentStatusBar({ status, className }: DocumentStatusBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b bg-muted/30 px-6 py-2 text-sm shrink-0",
        className
      )}
    >
      <span className="text-muted-foreground">Status</span>
      <span
        className={cn(
          "font-medium uppercase",
          status === "DRAFT" && "text-muted-foreground",
          (status === "APPROVED" || status === "POSTED" || status === "FULFILLED") &&
            "text-emerald-600 dark:text-emerald-400",
          (status === "PENDING_APPROVAL" || status === "PROCESSING") && "text-amber-600 dark:text-amber-400",
          status === "CANCELLED" && "text-destructive"
        )}
      >
        {status.replace(/_/g, " ")}
      </span>
    </div>
  );
}
