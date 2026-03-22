"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface BatchTimelineStep {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
  timestamp?: string;
  detail?: string;
  /** Deep-link to the relevant screen for this step. */
  href?: string;
  /** Label for an inline shortcut button (only rendered when status is "current"). */
  actionLabel?: string;
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

          const labelContent = (
            <span
              className={cn(
                "text-sm font-medium",
                step.href && step.status !== "completed" && "text-primary underline-offset-2 hover:underline",
                step.href && step.status === "current" && "text-sky-600 dark:text-sky-400",
              )}
            >
              {step.label}
            </span>
          );

          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border",
                    step.status === "completed" && "border-emerald-200 bg-emerald-50 text-emerald-600",
                    step.status === "current" && "border-sky-200 bg-sky-50 text-sky-600",
                    step.status === "upcoming" && "border-muted bg-muted/30 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {index < steps.length - 1 ? (
                  <div className="mt-1 h-8 w-px bg-border" />
                ) : null}
              </div>

              <div className="pb-2 min-w-0 flex-1">
                {step.href && step.status !== "completed" ? (
                  <Link
                    href={step.href}
                    className={cn(
                      "inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
                    )}
                    aria-label={`Go to: ${step.label}`}
                  >
                    {labelContent}
                    <ArrowRight className="h-3 w-3 opacity-60 shrink-0" />
                  </Link>
                ) : (
                  labelContent
                )}

                {step.timestamp ? (
                  <div className="text-xs text-muted-foreground">
                    {new Date(step.timestamp).toLocaleString()}
                  </div>
                ) : null}

                {step.detail ? (
                  <div className="text-xs text-muted-foreground">{step.detail}</div>
                ) : null}

                {step.status === "current" && step.href && step.actionLabel ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="mt-1.5 h-7 text-xs"
                    asChild
                  >
                    <Link href={step.href}>{step.actionLabel}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
