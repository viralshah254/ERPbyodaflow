"use client";

import { KPICard } from "@/components/ui/kpi-card";
import * as Icons from "lucide-react";

interface DashboardKpiCardProps {
  widgetId: string;
  label: string;
  value: string | number;
  change?: { value: string; type: "increase" | "decrease" | "neutral" };
  description?: string;
  icon?: string;
  sparkline?: boolean;
}

export function DashboardKpiCard({
  label,
  value,
  change,
  description,
  icon,
}: DashboardKpiCardProps) {
  return (
    <KPICard
      title={label}
      value={value}
      change={change}
      description={description}
      icon={icon as keyof typeof Icons}
    />
  );
}
