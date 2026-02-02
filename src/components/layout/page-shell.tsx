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

/** Outer container for app pages: full height, flex column, overflow handling. Supports optional right panel. */
export function PageShell({ children, rightSlot, className }: PageShellProps) {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-auto">{children}</div>
        {rightSlot != null && (
          <div
            className={cn(
              "shrink-0 border-l bg-card transition-all overflow-auto",
              rightPanelOpen ? "w-80 lg:w-96" : "w-0 border-0 overflow-hidden"
            )}
          >
            {rightPanelOpen ? rightSlot : null}
          </div>
        )}
      </div>
    </div>
  );
}
