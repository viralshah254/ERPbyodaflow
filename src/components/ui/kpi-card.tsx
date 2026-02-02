"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    type: "increase" | "decrease" | "neutral";
  };
  icon?: keyof typeof Icons;
  description?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  icon,
  description,
  className,
}: KPICardProps) {
  const IconComponent = icon ? (Icons[icon] as React.ComponentType<{ className?: string }>) : undefined;
  const changeColor =
    change?.type === "increase"
      ? "text-green-600 dark:text-green-400"
      : change?.type === "decrease"
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground";

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        {IconComponent && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconComponent className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn("text-xs mt-1 flex items-center gap-1", changeColor)}>
            {change.type === "increase" ? (
              <Icons.TrendingUp className="h-3 w-3" />
            ) : change.type === "decrease" ? (
              <Icons.TrendingDown className="h-3 w-3" />
            ) : (
              <Icons.Minus className="h-3 w-3" />
            )}
            {change.value}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}





