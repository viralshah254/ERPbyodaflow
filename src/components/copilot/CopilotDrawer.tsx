"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CopilotChat } from "./CopilotChat";
import { CopilotActionReview } from "./CopilotActionReview";
import type { CopilotAction } from "@/types/copilotActions";

export interface ContextPill {
  label: string;
  value: string;
}

export interface CopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Context shown as pills: branch, warehouse, period, route, entity ids */
  contextPills?: ContextPill[];
  /** When set, show action review instead of chat */
  pendingAction?: CopilotAction | null;
  onApplyAction?: () => void;
  onRejectAction?: () => void;
  draftOnly?: boolean;
  quickPrompts?: string[];
  /** Prefill chat input (e.g. from ExplainThis). Cleared via onConsumePrefill. */
  prefillPrompt?: string | null;
  onConsumePrefill?: () => void;
}

export function CopilotDrawer({
  open,
  onOpenChange,
  contextPills = [],
  pendingAction,
  onApplyAction,
  onRejectAction,
  draftOnly = false,
  quickPrompts,
  prefillPrompt,
  onConsumePrefill,
}: CopilotDrawerProps) {
  const [isApplying, setIsApplying] = React.useState(false);

  const handleApply = React.useCallback(() => {
    setIsApplying(true);
    onApplyAction?.();
    setTimeout(() => {
      setIsApplying(false);
      onOpenChange(false);
    }, 500);
  }, [onApplyAction, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            Copilot
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </SheetTitle>
        </SheetHeader>
        {contextPills.length > 0 && (
          <div className="px-4 py-2 border-b flex flex-wrap gap-1.5 shrink-0">
            {contextPills.map((p, i) => (
              <Badge key={i} variant="outline" className="text-xs font-normal">
                {p.label}: {p.value}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">
          {pendingAction ? (
            <div className="p-4">
              <CopilotActionReview
                action={pendingAction}
                onApply={handleApply}
                onReject={onRejectAction ?? (() => onOpenChange(false))}
                draftOnly={draftOnly}
                isApplying={isApplying}
              />
            </div>
          ) : (
            <CopilotChat
              quickPrompts={quickPrompts}
              prefillPrompt={prefillPrompt}
              onConsumePrefill={onConsumePrefill}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
