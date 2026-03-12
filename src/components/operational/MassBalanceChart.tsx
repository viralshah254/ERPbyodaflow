"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface MassBalanceChartProps {
  inputKg: number;
  outputKg: number;
  byproductKg?: number;
  wasteKg: number;
  title?: string;
}

function widthPct(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.max(0, Math.min(100, (value / total) * 100))}%`;
}

export function MassBalanceChart({
  inputKg,
  outputKg,
  byproductKg = 0,
  wasteKg,
  title = "Mass Balance",
}: MassBalanceChartProps) {
  const totalOutputs = outputKg + byproductKg + wasteKg;
  const varianceKg = inputKg - totalOutputs;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Compare input mass against finished output, byproducts, and process loss.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Input</div>
            <div className="font-semibold">{inputKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Finished output</div>
            <div className="font-semibold">{outputKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Byproducts</div>
            <div className="font-semibold">{byproductKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Waste / loss</div>
            <div className="font-semibold">{wasteKg.toLocaleString()} kg</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Output composition</div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500" style={{ width: widthPct(outputKg, inputKg) }} />
            <div className="bg-amber-500" style={{ width: widthPct(byproductKg, inputKg) }} />
            <div className="bg-rose-500" style={{ width: widthPct(wasteKg, inputKg) }} />
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div>Finished: {widthPct(outputKg, inputKg)}</div>
            <div>Byproducts: {widthPct(byproductKg, inputKg)}</div>
            <div>Waste: {widthPct(wasteKg, inputKg)}</div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Balance variance</span>
            <span className={Math.abs(varianceKg) <= 0.5 ? "font-medium text-emerald-600" : "font-medium text-rose-600"}>
              {varianceKg.toFixed(1)} kg
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

