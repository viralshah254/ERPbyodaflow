"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface BatchTimelineStepLink {
  label: string;
  href: string;
  /** Short badge text shown after the label, e.g. a status string. */
  badge?: string;
}

export interface BatchTimelineStep {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
  timestamp?: string;
  detail?: string;
  /** Clickable document chips rendered below the detail line. */
  links?: BatchTimelineStepLink[];
  /** Deep-link to the relevant screen for this step. */
  href?: string;
  /** Label for an inline shortcut button (only rendered when status is "current"). */
  actionLabel?: string;
}

export interface BatchStatusTimelineProps {
  title?: string;
  steps: BatchTimelineStep[];
  className?: string;
  /** Tighter layout for above-the-fold operational pages */
  compact?: boolean;
}

export function BatchStatusTimeline({
  title = "Process Timeline",
  steps,
  className,
  compact = false,
}: BatchStatusTimelineProps) {
  return (
    <div className={cn("rounded-lg border bg-card", compact ? "p-3" : "p-4", className)}>
      <div className={cn("font-medium", compact ? "mb-2 text-xs" : "mb-4 text-sm")}>{title}</div>
      <div className={compact ? "space-y-2" : "space-y-4"}>
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
                compact ? "text-xs font-medium" : "text-sm font-medium",
                step.href && step.status !== "completed" && "text-primary underline-offset-2 hover:underline",
                step.href && step.status === "current" && "text-sky-600 dark:text-sky-400",
              )}
            >
              {step.label}
            </span>
          );

          return (
            <div key={step.id} className={cn("flex", compact ? "gap-2" : "gap-3")}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border",
                    compact ? "h-6 w-6" : "h-7 w-7",
                    step.status === "completed" && "border-emerald-200 bg-emerald-50 text-emerald-600",
                    step.status === "current" && "border-sky-200 bg-sky-50 text-sky-600",
                    step.status === "upcoming" && "border-muted bg-muted/30 text-muted-foreground",
                  )}
                >
                  <Icon className={compact ? "h-3 w-3" : "h-4 w-4"} />
                </div>
                {index < steps.length - 1 ? (
                  <div className={cn("mt-0.5 w-px bg-border", compact ? "h-5" : "h-8 mt-1")} />
                ) : null}
              </div>

              <div className={cn("min-w-0 flex-1", compact ? "pb-1" : "pb-2")}>
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
                  <div className={cn("text-muted-foreground", compact ? "text-[10px] leading-tight" : "text-xs")}>
                    {new Date(step.timestamp).toLocaleString()}
                  </div>
                ) : null}

                {step.detail ? (
                  <div className={cn("text-muted-foreground", compact ? "text-[10px] leading-snug" : "text-xs")}>
                    {step.detail}
                  </div>
                ) : null}

                {step.links?.length ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {step.links.map((lk) => (
                      <Link
                        key={lk.href}
                        href={lk.href}
                        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-muted/60 transition-colors"
                      >
                        {lk.label}
                        {lk.badge ? <span className="opacity-60 uppercase">{lk.badge}</span> : null}
                        <ArrowRight className="h-2.5 w-2.5 opacity-50 shrink-0" />
                      </Link>
                    ))}
                  </div>
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
