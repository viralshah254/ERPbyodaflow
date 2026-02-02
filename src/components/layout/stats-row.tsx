"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { KPICard } from "@/components/ui/kpi-card";
import * as Icons from "lucide-react";

export interface StatItem {
  id: string;
  title: string;
  value: string | number;
  change?: { value: string; type: "increase" | "decrease" | "neutral" };
  description?: string;
  icon?: keyof typeof Icons;
  /** Optional sparkline placeholder (future: actual sparkline data) */
  sparkline?: boolean;
}

interface StatsRowProps {
  stats: StatItem[];
  /** Grid columns: 2, 4, or 6 (default 4) */
  columns?: 2 | 4 | 6;
  className?: string;
}

export function StatsRow({ stats, columns = 4, className }: StatsRowProps) {
  const gridClass =
    columns === 2
      ? "grid gap-4 md:grid-cols-2"
      : columns === 6
      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      : "grid gap-4 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn(gridClass, className)}>
      {stats.map((s) => (
        <KPICard
          key={s.id}
          title={s.title}
          value={s.value}
          change={s.change}
          description={s.description}
          icon={s.icon}
        />
      ))}
    </div>
  );
}
