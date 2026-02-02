"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface InsightCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "muted";
  className?: string;
}

export function InsightCard({
  title,
  description,
  children,
  action,
  variant = "default",
  className,
}: InsightCardProps) {
  return (
    <Card
      className={cn(
        "transition-colors hover:border-primary/20",
        variant === "muted" && "bg-muted/30",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-1">{description}</CardDescription>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
