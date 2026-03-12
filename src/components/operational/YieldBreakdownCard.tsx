"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface YieldBreakdownCardProps {
  inputKg: number;
  primaryKg: number;
  secondaryKg: number;
  lossKg: number;
  serviceFeeTotal?: number;
}

export function YieldBreakdownCard({
  inputKg,
  primaryKg,
  secondaryKg,
  lossKg,
  serviceFeeTotal,
}: YieldBreakdownCardProps) {
  const safeInput = inputKg > 0 ? inputKg : 1;
  const primaryPct = (primaryKg / safeInput) * 100;
  const secondaryPct = (secondaryKg / safeInput) * 100;
  const lossPct = (lossKg / safeInput) * 100;
  const totalYieldPct = ((primaryKg + secondaryKg) / safeInput) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Breakdown</CardTitle>
        <CardDescription>Input transformed into primary, secondary, and process loss.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Input</div>
            <div className="font-semibold">{inputKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Primary</div>
            <div className="font-semibold">{primaryKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Secondary</div>
            <div className="font-semibold">{secondaryKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Loss</div>
            <div className="font-semibold">{lossKg.toLocaleString()} kg</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Total yield</span>
            <span>{totalYieldPct.toFixed(1)}%</span>
          </div>
          <Progress value={Math.max(0, Math.min(100, totalYieldPct))} />
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span>Primary: {primaryPct.toFixed(1)}%</span>
            <span>Secondary: {secondaryPct.toFixed(1)}%</span>
            <span>Loss: {lossPct.toFixed(1)}%</span>
          </div>
        </div>

        {typeof serviceFeeTotal === "number" ? (
          <div className="text-xs text-muted-foreground">
            Service fee total: <span className="font-medium text-foreground">{serviceFeeTotal.toLocaleString()}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

