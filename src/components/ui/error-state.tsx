import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import * as Icons from "lucide-react";

interface ErrorStateProps {
  icon?: keyof typeof Icons;
  title: string;
  description?: string;
  retry?: { label?: string; onClick: () => void };
  className?: string;
}

export function ErrorState({
  icon = "AlertCircle",
  title,
  description,
  retry,
  className,
}: ErrorStateProps) {
  const IconComponent = (Icons[icon] ?? Icons.AlertCircle) as React.ComponentType<{ className?: string }>;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <IconComponent className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {retry && (
        <Button onClick={retry.onClick} size="sm" variant="outline">
          {retry.label ?? "Try again"}
        </Button>
      )}
    </div>
  );
}
