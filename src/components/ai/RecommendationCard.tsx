"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export type RiskLevel = "low" | "medium" | "high";

export interface RecommendationCardProps {
  /** AI recommendation title (e.g. "Increase maize flour production by 12% in Nairobi next month") */
  title: string;
  /** Short optional description */
  description?: string;
  /** Driver factors (e.g. "Distributor demand +14%", "Harvest forecast −8%") */
  drivers?: string[];
  /** Expected upside (e.g. "Fill rate +8%") */
  expectedUpside?: string;
  /** Risk level */
  risk?: RiskLevel;
  /** Confidence 0–100 */
  confidence?: number;
  /** Alternative scenario summary */
  alternativeSummary?: string;
  /** Primary action (e.g. Approve) */
  onApprove?: () => void;
  /** Simulate before applying */
  onSimulate?: () => void;
  /** Modify / override suggestion */
  onModify?: () => void;
  /** Optional: open explainability / audit */
  onExplain?: () => void;
  /** Optional class */
  className?: string;
  /** Optional layer badge (Planning, Production, Procurement, Finance) */
  layer?: string;
}

const riskVariant: Record<RiskLevel, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function RecommendationCard({
  title,
  description,
  drivers = [],
  expectedUpside,
  risk = "medium",
  confidence,
  alternativeSummary,
  onApprove,
  onSimulate,
  onModify,
  onExplain,
  className,
  layer,
}: RecommendationCardProps) {
  return (
    <Card
      className={cn(
        "transition-colors hover:border-primary/20 bg-card",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {layer && (
              <Badge variant="outline" className="mb-1.5 text-xs font-normal">
                {layer}
              </Badge>
            )}
            <CardTitle className="text-base leading-snug">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {risk && (
              <Badge variant={riskVariant[risk]} className="text-xs">
                Risk: {risk}
              </Badge>
            )}
            {confidence != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Icons.TrendingUp className="h-3.5 w-3.5" />
                {confidence}% confidence
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {drivers.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Drivers</p>
            <ul className="text-sm space-y-0.5">
              {drivers.map((d, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
        {expectedUpside && (
          <p className="text-sm">
            <span className="text-muted-foreground">Expected upside: </span>
            <span className="font-medium">{expectedUpside}</span>
          </p>
        )}
        {alternativeSummary && (
          <p className="text-xs text-muted-foreground">
            Alternative: {alternativeSummary}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onSimulate && (
            <Button size="sm" variant="outline" onClick={onSimulate}>
              <Icons.SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Simulate
            </Button>
          )}
          {onApprove && (
            <Button size="sm" onClick={onApprove}>
              <Icons.Check className="mr-1.5 h-3.5 w-3.5" />
              Approve
            </Button>
          )}
          {onModify && (
            <Button size="sm" variant="ghost" onClick={onModify}>
              <Icons.Pencil className="mr-1.5 h-3.5 w-3.5" />
              Modify
            </Button>
          )}
          {onExplain && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onExplain}>
              <Icons.HelpCircle className="mr-1.5 h-3.5 w-3.5" />
              Why this?
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
