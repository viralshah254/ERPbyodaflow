"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCopilotActionCards } from "@/lib/mock/copilot-action-cards";
import { useCopilotStore } from "@/stores/copilot-store";
import { automationInsightApply } from "@/lib/api/stub-endpoints";
import type { CustomRecommendationAction } from "@/types/copilotActions";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const riskVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function CopilotActionCards() {
  const openDrawerWithAction = useCopilotStore((s) => s.openDrawerWithAction);
  const cards = React.useMemo(() => getCopilotActionCards(), []);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);

  const handleApply = async (action: CustomRecommendationAction) => {
    const actionId = action.payload?.recommendationKey ?? action.id;
    setApplyingId(action.id);
    try {
      await automationInsightApply(action.id, actionId);
      toast.success("Action applied.");
      openDrawerWithAction(action);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.Sparkles className="h-5 w-5" />
          Copilot action cards
        </CardTitle>
        <CardDescription>
          Pricing, payroll, and tax recommendations. Apply opens the guided review flow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{a.summary}</p>
                <Badge variant={riskVariant[a.riskLevel] ?? "outline"} className="shrink-0 text-xs">
                  {a.riskLevel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {a.payload.narrative}
              </p>
              <Button size="sm" className="w-fit" disabled={applyingId === a.id} onClick={() => handleApply(a)}>
                Apply
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
