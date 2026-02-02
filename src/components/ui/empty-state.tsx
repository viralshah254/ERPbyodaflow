import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import * as Icons from "lucide-react";

interface EmptyStateProps {
  icon?: keyof typeof Icons;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon = "Inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const IconComponent = (Icons[icon] || Icons.Inbox) as React.ComponentType<{ className?: string }>;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-3">
        <IconComponent className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}





