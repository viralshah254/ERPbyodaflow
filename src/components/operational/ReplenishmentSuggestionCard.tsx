"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ReplenishmentSuggestionCardProps {
  title: string;
  subtitle: string;
  suggestedQty: number;
  unit?: string;
  urgency?: "normal" | "high";
  reasons?: string[];
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function ReplenishmentSuggestionCard({
  title,
  subtitle,
  suggestedQty,
  unit = "kg",
  urgency = "normal",
  reasons = [],
  primaryAction,
  secondaryAction,
}: ReplenishmentSuggestionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <Badge variant={urgency === "high" ? "destructive" : "secondary"}>
            {urgency === "high" ? "High urgency" : "Reorder"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          Suggested replenishment: <span className="font-semibold">{suggestedQty.toLocaleString()} {unit}</span>
        </div>
        {reasons.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        ) : null}
        {(primaryAction || secondaryAction) ? (
          <div className="flex flex-wrap gap-2">
            {primaryAction ? <Button size="sm" onClick={primaryAction.onClick}>{primaryAction.label}</Button> : null}
            {secondaryAction ? (
              <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

