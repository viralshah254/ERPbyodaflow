"use client";

import { Badge } from "@/components/ui/badge";

export interface StockAgeIndicatorProps {
  days: number;
}

export function StockAgeIndicator({ days }: StockAgeIndicatorProps) {
  const variant =
    days >= 10 ? "destructive" : days >= 5 ? "secondary" : "outline";
  const label = days >= 10 ? "Aged" : days >= 5 ? "Watch" : "Fresh";
  return (
    <Badge variant={variant}>
      {label} · {days}d
    </Badge>
  );
}

