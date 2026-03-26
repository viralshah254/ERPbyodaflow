"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface YieldBreakdownKg {
  inputKg: number;
  primaryKg: number;
  secondaryKg: number;
  lossKg: number;
}

export interface YieldBreakdownCardProps {
  inputKg: number;
  primaryKg: number;
  secondaryKg: number;
  lossKg: number;
  serviceFeeTotal?: number;
  /** When set with actual, shows Planned (BOM) vs Actual (weighed) comparison. */
  planned?: YieldBreakdownKg;
  actual?: YieldBreakdownKg;
}

function pct(part: number, input: number) {
  const safe = input > 0 ? input : 1;
  return (part / safe) * 100;
}

function YieldBlock({
  label,
  data,
  showProgress,
}: {
  label: string;
  data: YieldBreakdownKg;
  showProgress: boolean;
}) {
  const { inputKg, primaryKg, secondaryKg, lossKg } = data;
  const safeInput = inputKg > 0 ? inputKg : 1;
  const totalYieldPct = ((primaryKg + secondaryKg) / safeInput) * 100;

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
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
      {showProgress ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Total yield</span>
            <span>{totalYieldPct.toFixed(1)}%</span>
          </div>
          <Progress value={Math.max(0, Math.min(100, totalYieldPct))} />
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span>Primary: {pct(primaryKg, inputKg).toFixed(1)}%</span>
            <span>Secondary: {pct(secondaryKg, inputKg).toFixed(1)}%</span>
            <span>Loss: {pct(lossKg, inputKg).toFixed(1)}%</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function YieldBreakdownCard({
  inputKg,
  primaryKg,
  secondaryKg,
  lossKg,
  serviceFeeTotal,
  planned,
  actual,
}: YieldBreakdownCardProps) {
  const comparison = planned && actual;

  if (comparison) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yield Breakdown</CardTitle>
          <CardDescription>Planned (BOM) vs actual weighed quantities after receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <YieldBlock label="Planned (BOM / GRN)" data={planned} showProgress={false} />
          <YieldBlock label="Actual (weighed)" data={actual} showProgress />
          {typeof serviceFeeTotal === "number" ? (
            <div className="text-xs text-muted-foreground">
              Service fee total (from actual primary fee lines):{" "}
              <span className="font-medium text-foreground">{serviceFeeTotal.toLocaleString()}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const data: YieldBreakdownKg = { inputKg, primaryKg, secondaryKg, lossKg };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Breakdown</CardTitle>
        <CardDescription>Input transformed into primary, secondary, and process loss.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <YieldBlock label="Expected (BOM)" data={data} showProgress />
        {typeof serviceFeeTotal === "number" ? (
          <div className="text-xs text-muted-foreground">
            Service fee total: <span className="font-medium text-foreground">{serviceFeeTotal.toLocaleString()}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
