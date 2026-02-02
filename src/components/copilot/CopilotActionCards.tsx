"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCopilotActionCards } from "@/lib/mock/copilot-action-cards";
import { useCopilotStore } from "@/stores/copilot-store";
import type { CustomRecommendationAction } from "@/types/copilotActions";
import * as Icons from "lucide-react";

const riskVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function CopilotActionCards() {
  const openDrawerWithAction = useCopilotStore((s) => s.openDrawerWithAction);
  const cards = React.useMemo(() => getCopilotActionCards(), []);

  const handleApply = (action: CustomRecommendationAction) => {
    openDrawerWithAction(action);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.Sparkles className="h-5 w-5" />
          Copilot action cards
        </CardTitle>
        <CardDescription>
          Pricing, payroll, and tax recommendations. Apply opens review (stub).
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
              <Button size="sm" className="w-fit" onClick={() => handleApply(a)}>
                Apply
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
