"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

export interface CostImpactLine {
  label: string;
  amount: number;
}

export interface CostImpactPanelProps {
  title?: string;
  /** Overrides default subtitle under the title. */
  cardDescription?: string;
  currency?: string;
  lines: CostImpactLine[];
  quantityKg?: number;
}

export function CostImpactPanel({
  title = "Cost Impact",
  cardDescription = "Operational cost buckets and valuation effect.",
  currency = "KES",
  lines,
  quantityKg,
}: CostImpactPanelProps) {
  const total = lines.reduce((acc, line) => acc + line.amount, 0);
  const perKg = quantityKg && quantityKg > 0 ? total / quantityKg : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{line.label}</span>
              <span className="font-medium">{formatMoney(line.amount, currency)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total impact</span>
            <span className="font-semibold">{formatMoney(total, currency)}</span>
          </div>
          {perKg != null ? (
            <div className="mt-1 flex items-center justify-between text-muted-foreground">
              <span>Cost per kg</span>
              <span>{formatMoney(perKg, currency)}</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

