"use client";

import Link from "next/link";
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
  href?: string;
}

export function DashboardKpiCard({
  label,
  value,
  change,
  description,
  icon,
  href,
}: DashboardKpiCardProps) {
  const card = (
    <KPICard
      title={label}
      value={value}
      change={change}
      description={description}
      icon={icon as keyof typeof Icons}
      className={href ? "h-full transition-colors hover:border-primary/40" : undefined}
    />
  );
  if (!href) return card;
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  );
}
