"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCopilotStore } from "@/stores/copilot-store";
import { applyAutomationInsightApi, fetchAutomationInsightsApi } from "@/lib/api/automation-workflows";
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
  const [cards, setCards] = React.useState<CustomRecommendationAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    void fetchAutomationInsightsApi()
      .then((items) => {
        if (!active) return;
        setCards(items);
      })
      .catch((e) => {
        if (!active) return;
        toast.error((e as Error).message);
        setCards([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleApply = async (action: CustomRecommendationAction) => {
    const actionId = action.payload?.recommendationKey ?? action.id;
    setApplyingId(action.id);
    try {
      await applyAutomationInsightApi(action.id, actionId);
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
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading recommendations...</div>
        ) : cards.length === 0 ? (
          <div className="text-sm text-muted-foreground">No live recommendations available.</div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
