"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export interface CommissionSummaryCardProps {
  title: string;
  salesAmount: number;
  commissionAmount: number;
  topUpAmount: number;
  currency?: string;
  status?: string;
}

export function CommissionSummaryCard({
  title,
  salesAmount,
  commissionAmount,
  topUpAmount,
  currency = "KES",
  status,
}: CommissionSummaryCardProps) {
  const totalPayout = commissionAmount + topUpAmount;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>Commission basis, shortfall support, and payout readiness.</CardDescription>
          </div>
          {status ? <Badge variant={status === "POSTED" ? "default" : "secondary"}>{status}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs text-muted-foreground">Sales basis</div>
          <div className="font-semibold">{formatMoney(salesAmount, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Commission</div>
          <div className="font-semibold">{formatMoney(commissionAmount, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Top-up / payout</div>
          <div className="font-semibold">{formatMoney(totalPayout, currency)}</div>
          {topUpAmount > 0 ? (
            <div className="text-xs text-amber-700">Includes top-up {formatMoney(topUpAmount, currency)}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

