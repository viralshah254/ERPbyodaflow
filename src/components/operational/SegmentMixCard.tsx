"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface SegmentMixItem {
  label: string;
  value: number;
  accentClassName?: string;
}

export interface SegmentMixCardProps {
  title?: string;
  description?: string;
  items: SegmentMixItem[];
  unit?: string;
}

export function SegmentMixCard({
  title = "Segment Mix",
  description = "Composition of volume across key commercial segments.",
  items,
  unit,
}: SegmentMixCardProps) {
  const total = items.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-medium">
                  {item.value.toLocaleString()}
                  {unit ? ` ${unit}` : ""} · {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${item.accentClassName ?? "bg-primary"}`}
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

