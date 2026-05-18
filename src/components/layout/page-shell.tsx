"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface PageShellProps {
  children: React.ReactNode;
  /** Optional right-side panel (validations, next steps, Copilot). Visibility controlled by RightPanel toggle. */
  rightSlot?: React.ReactNode;
  className?: string;
}

/** Outer container for app pages: flex column inside dashboard scroll area (see MainLayout). Supports optional right panel. */
export function PageShell({ children, rightSlot, className }: PageShellProps) {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  if (rightSlot == null) {
    return <div className={cn("flex w-full min-w-0 flex-col", className)}>{children}</div>;
  }

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
        <div
          className={cn(
            "shrink-0 border-l bg-card transition-all overflow-auto",
            rightPanelOpen ? "w-[min(100%,16rem)] lg:w-[18rem] max-w-[18rem]" : "w-0 border-0 overflow-hidden"
          )}
        >
          {rightPanelOpen ? rightSlot : null}
        </div>
      </div>
    </div>
  );
}
