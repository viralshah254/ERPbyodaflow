"use client";

import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BatchTimelineStep {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
  timestamp?: string;
  detail?: string;
}

export interface BatchStatusTimelineProps {
  title?: string;
  steps: BatchTimelineStep[];
  className?: string;
}

export function BatchStatusTimeline({
  title = "Process Timeline",
  steps,
  className,
}: BatchStatusTimelineProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-4 text-sm font-medium">{title}</div>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon =
            step.status === "completed"
              ? CheckCircle2
              : step.status === "current"
                ? Clock3
                : Circle;
          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border",
                    step.status === "completed" && "border-emerald-200 bg-emerald-50 text-emerald-600",
                    step.status === "current" && "border-sky-200 bg-sky-50 text-sky-600",
                    step.status === "upcoming" && "border-muted bg-muted/30 text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {index < steps.length - 1 ? <div className="mt-1 h-8 w-px bg-border" /> : null}
              </div>
              <div className="pb-2">
                <div className="text-sm font-medium">{step.label}</div>
                {step.timestamp ? (
                  <div className="text-xs text-muted-foreground">
                    {new Date(step.timestamp).toLocaleString()}
                  </div>
                ) : null}
                {step.detail ? <div className="text-xs text-muted-foreground">{step.detail}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

