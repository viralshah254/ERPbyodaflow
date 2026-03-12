"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TrendDirection = "up" | "down" | "flat";
type Severity = "default" | "success" | "warning" | "danger";

export interface OperationalKpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: { value: string; direction: TrendDirection };
  severity?: Severity;
  href?: string;
}

function getTrendColor(direction: TrendDirection): string {
  if (direction === "up") return "text-emerald-600";
  if (direction === "down") return "text-rose-600";
  return "text-muted-foreground";
}

function getBorderClass(severity: Severity): string {
  if (severity === "success") return "border-emerald-200";
  if (severity === "warning") return "border-amber-200";
  if (severity === "danger") return "border-rose-200";
  return "";
}

export function OperationalKpiCard({
  title,
  value,
  unit,
  subtitle,
  trend,
  severity = "default",
  href,
}: OperationalKpiCardProps) {
  const content = (
    <Card className={getBorderClass(severity)}>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">
          {value}
          {unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{subtitle ?? "Operational KPI"}</span>
        {trend ? (
          <Badge variant="outline" className={getTrendColor(trend.direction)}>
            {trend.value}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {content}
    </Link>
  );
}

