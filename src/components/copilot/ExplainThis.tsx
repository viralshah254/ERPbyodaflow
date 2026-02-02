"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCopilotStore } from "@/stores/copilot-store";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExplainThisProps {
  /** Prompt to send when opened (e.g. "Explain: reorder level", "What does status X mean?") */
  prompt: string;
  /** Optional context payload for future use (e.g. entity type, field id). */
  context?: Record<string, unknown>;
  /** Accessible label */
  label?: string;
  className?: string;
}

/**
 * Wrap labels, validation errors, or concepts. Click opens Copilot with prefilled prompt.
 */
export function ExplainThis({
  prompt,
  context: _context,
  label = "Explain this",
  className,
}: ExplainThisProps) {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => openWithPrompt(prompt)}
            className={cn(
              "inline-flex items-center gap-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              className
            )}
            aria-label={label}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{label}. Opens Copilot.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
