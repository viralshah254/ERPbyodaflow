"use client";

import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ExceptionBannerType = "warning" | "error" | "info";

export interface ExceptionBannerProps {
  type: ExceptionBannerType;
  title: string;
  description: string;
  actions?: Array<{ label: string; onClick: () => void; variant?: "default" | "outline" | "ghost" }>;
}

function getIcon(type: ExceptionBannerType) {
  if (type === "error") return ShieldAlert;
  if (type === "warning") return AlertTriangle;
  return Info;
}

function getClasses(type: ExceptionBannerType): string {
  if (type === "error") {
    return "border-rose-200 bg-rose-50/60 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-50";
  }
  if (type === "warning") {
    return "border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-50";
  }
  return "border-sky-200 bg-sky-50/60 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-50";
}

function getDescriptionClasses(type: ExceptionBannerType): string {
  if (type === "error") return "text-rose-900/85 dark:text-rose-100/90";
  if (type === "warning") return "text-amber-900/85 dark:text-amber-100/90";
  return "text-sky-900/85 dark:text-sky-100/90";
}

function getIconClasses(type: ExceptionBannerType): string {
  if (type === "error") return "text-rose-600 dark:text-rose-300";
  if (type === "warning") return "text-amber-600 dark:text-amber-300";
  return "text-sky-600 dark:text-sky-300";
}

export function ExceptionBanner({ type, title, description, actions = [] }: ExceptionBannerProps) {
  const Icon = getIcon(type);
  return (
    <Card className={getClasses(type)}>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-border/40 bg-background/80 p-2 dark:border-white/10 dark:bg-black/20">
            <Icon className={cn("h-4 w-4", getIconClasses(type))} />
          </div>
          <div>
            <div className="font-medium">{title}</div>
            <div className={cn("text-sm", getDescriptionClasses(type))}>{description}</div>
          </div>
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button key={action.label} variant={action.variant ?? "outline"} size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

