"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CopilotAction, RiskLevel } from "@/types/copilotActions";
import { isCreateEntity, isUpdateEntity, isCreateDocument, isCustomRecommendation } from "@/types/copilotActions";

const riskColor: Record<RiskLevel, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export interface CopilotActionReviewProps {
  action: CopilotAction;
  onApply: () => void;
  onReject: () => void;
  /** When true, only "Save as draft" is allowed (user lacks approve permission) */
  draftOnly?: boolean;
  isApplying?: boolean;
}

export function CopilotActionReview({
  action,
  onApply,
  onReject,
  draftOnly = false,
  isApplying = false,
}: CopilotActionReviewProps) {
  const diffLines = React.useMemo(() => {
    const lines: { label: string; from?: unknown; to?: unknown }[] = [];
    if (isCustomRecommendation(action)) return lines;
    if (isCreateEntity(action)) {
      Object.entries(action.payload.data).forEach(([k, v]) => {
        lines.push({ label: k, to: v });
      });
    } else if (isUpdateEntity(action)) {
      Object.entries(action.payload.changes).forEach(([k, v]) => {
        lines.push({ label: k, from: v.from, to: v.to });
      });
    } else if (isCreateDocument(action)) {
      lines.push({ label: "Document type", to: action.payload.documentType });
      Object.entries(action.payload.data).forEach(([k, v]) => {
        lines.push({ label: k, to: v });
      });
      if (action.payload.lineItems?.length) {
        lines.push({ label: "Line items", to: `${action.payload.lineItems.length} line(s)` });
      }
    }
    return lines;
  }, [action]);

  const isCustom = isCustomRecommendation(action);
  const narrative = isCustom ? action.payload.narrative : null;

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{action.summary}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {action.type} • {action.entitiesReferenced.length} reference(s)
            </p>
          </div>
          <Badge className={riskColor[action.riskLevel]} variant="secondary">
            {action.riskLevel}
          </Badge>
        </div>
        {action.requiresApproval && (
          <p className="text-xs text-muted-foreground">This action requires approval.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {narrative && (
          <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 p-3">
            {narrative}
          </p>
        )}
        {!narrative && (
          <ScrollArea className="h-[200px] rounded-md border bg-muted/30 p-3">
            <div className="space-y-2 text-sm font-mono">
              {diffLines.map((line, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-baseline">
                  <span className="text-muted-foreground shrink-0">{line.label}:</span>
                  {line.from !== undefined && (
                    <span className="text-red-600 dark:text-red-400 line-through">{String(line.from)}</span>
                  )}
                  {line.to !== undefined && (
                    <span className="text-emerald-600 dark:text-emerald-400">{String(line.to)}</span>
                  )}
                </div>
              ))}
              {diffLines.length === 0 && (
                <p className="text-muted-foreground">No diff preview for this action type.</p>
              )}
            </div>
          </ScrollArea>
        )}
        {draftOnly && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            You don’t have permission to apply this directly. You can save as draft.
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onApply}
            disabled={isApplying}
          >
            {draftOnly ? "Save as draft" : "Apply"}
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={isApplying}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
