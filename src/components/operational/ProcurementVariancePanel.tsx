"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ProcurementVariancePanelProps {
  poWeightKg: number;
  paidWeightKg: number;
  receivedWeightKg: number;
}

export function ProcurementVariancePanel({
  poWeightKg,
  paidWeightKg,
  receivedWeightKg,
}: ProcurementVariancePanelProps) {
  const varianceKg = receivedWeightKg - paidWeightKg;
  const variancePct = paidWeightKg > 0 ? (varianceKg / paidWeightKg) * 100 : 0;
  const status: "MATCHED" | "VARIANCE" = Math.abs(varianceKg) < 0.01 ? "MATCHED" : "VARIANCE";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Variance</CardTitle>
        <CardDescription>Three-way view: ordered vs paid vs received weight.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">PO weight</div>
            <div className="text-lg font-semibold">{poWeightKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Paid weight</div>
            <div className="text-lg font-semibold">{paidWeightKg.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Received weight</div>
            <div className="text-lg font-semibold">{receivedWeightKg.toLocaleString()} kg</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={status === "MATCHED" ? "default" : "destructive"}>{status}</Badge>
          <span className="text-sm text-muted-foreground">
            Variance: <span className="font-medium text-foreground">{varianceKg.toFixed(2)} kg</span> ({variancePct.toFixed(2)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

