"use client";

import { cn } from "@/lib/utils";
import type { DocumentStatusActor } from "@/lib/types/documents";

const ROLE_LABEL: Record<string, string> = {
  drafted: "Drafted by",
  submitted: "Submitted by",
  approved: "Approved by",
  posted: "Posted by",
  cancelled: "Cancelled by",
  reversed: "Reversed by",
  updated: "Last updated by",
};

interface DocumentStatusBarProps {
  status: string;
  className?: string;
  /** When set, shows e.g. "Approved by Jane Doe" next to the status. */
  statusActor?: DocumentStatusActor | null;
}

/** Horizontal status bar below document header. */
export function DocumentStatusBar({ status, statusActor, className }: DocumentStatusBarProps) {
  const actorLabel =
    statusActor?.name && statusActor.role
      ? `${ROLE_LABEL[statusActor.role] ?? "By"} ${statusActor.name}`
      : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/30 px-6 py-2 text-sm shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-2">
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
      {actorLabel && (
        <span className="text-muted-foreground">
          <span className="text-foreground/90">{actorLabel}</span>
        </span>
      )}
    </div>
  );
}
