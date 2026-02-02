"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export interface TimelineEntry {
  id: string;
  action: string;
  by: string;
  at: string;
  note?: string;
}

interface DocumentTimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

/** Audit/approval timeline for document view. */
export function DocumentTimeline({ entries, className }: DocumentTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className={cn("rounded border p-4 text-sm text-muted-foreground", className)}>
        No timeline entries yet.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {entries.map((e, i) => (
        <div key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icons.Circle className="h-2 w-2" />
            </div>
            {i < entries.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-4">
            <p className="font-medium text-sm">{e.action}</p>
            <p className="text-xs text-muted-foreground">
              {e.by} · {e.at}
            </p>
            {e.note && <p className="text-xs text-muted-foreground mt-1">{e.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
