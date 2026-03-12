"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export interface FranchiseHealthCardProps {
  franchiseeId: string;
  franchiseeName: string;
  qtyOnHand: number;
  skuCount: number;
  topUpExposure: number;
  openReplenishments: number;
}

export function FranchiseHealthCard({
  franchiseeId,
  franchiseeName,
  qtyOnHand,
  skuCount,
  topUpExposure,
  openReplenishments,
}: FranchiseHealthCardProps) {
  const risk = topUpExposure > 0 || openReplenishments > 0 ? "Needs review" : "Healthy";
  return (
    <Link href={`/franchise/${franchiseeId}`} className="block">
      <Card className="transition-opacity hover:opacity-90">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{franchiseeName}</CardTitle>
              <CardDescription>{skuCount} active SKUs</CardDescription>
            </div>
            <Badge variant={risk === "Healthy" ? "outline" : "secondary"}>{risk}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Qty on hand</div>
            <div className="font-semibold">{qtyOnHand.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Open replenishments</div>
            <div className="font-semibold">{openReplenishments}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Top-up exposure</div>
            <div className="font-semibold">{formatMoney(topUpExposure, "KES")}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

