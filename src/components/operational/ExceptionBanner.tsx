"use client";

import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  if (type === "error") return "border-rose-200 bg-rose-50/60";
  if (type === "warning") return "border-amber-200 bg-amber-50/60";
  return "border-sky-200 bg-sky-50/60";
}

export function ExceptionBanner({ type, title, description, actions = [] }: ExceptionBannerProps) {
  const Icon = getIcon(type);
  return (
    <Card className={getClasses(type)}>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-background/80 p-2">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
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

