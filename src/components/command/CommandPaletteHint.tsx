"use client";

import * as React from "react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

interface CommandPaletteHintProps {
  className?: string;
}

/** Clickable ⌘K hint that opens the command palette. */
export function CommandPaletteHint({ className }: CommandPaletteHintProps) {
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <button
      type="button"
      data-tour-step="command-hint"
      onClick={() => setOpen(true)}
      className={cn(
        "hidden shrink-0 whitespace-nowrap sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
        className
      )}
      title="Open command palette (Cmd K)"
    >
      Cmd K
    </button>
  );
}
