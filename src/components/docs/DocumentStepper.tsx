"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

export type DocumentStepperStep = {
  id: string;
  label: string;
};

type DocumentStepperProps = {
  /** Current step, 1-based. */
  step: number;
  /** Furthest step the user has reached in this session (1-based). */
  maxStepReached: number;
  steps: readonly DocumentStepperStep[];
  /** Navigate to another step (target is 1-based). */
  onStepSelect?: (step: number) => void;
};

export function DocumentStepper({ step, maxStepReached, steps, onStepSelect }: DocumentStepperProps) {
  const progress = (step / steps.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 text-muted-foreground">
          Step {step} of {steps.length} · {steps[step - 1]?.label}
        </span>
      </div>

      <nav
        className="flex items-start justify-between gap-2"
        role="tablist"
        aria-label="Document wizard steps"
      >
        {steps.map((s, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === step;
          const isCompleted = stepNumber < step;
          const isReachableForward =
            stepNumber > step &&
            (stepNumber <= maxStepReached || stepNumber === step + 1);
          const isBlockedFuture = stepNumber > step && !isReachableForward;
          const clickable =
            !isCurrent &&
            Boolean(onStepSelect) &&
            (isCompleted || isReachableForward);

          return (
            <React.Fragment key={s.id}>
              {index > 0 ? (
                <div
                  aria-hidden
                  className={cn(
                    "mt-4 hidden h-px min-w-4 flex-1 sm:block",
                    isCompleted || isCurrent || isReachableForward ? "bg-primary/40" : "bg-border"
                  )}
                />
              ) : null}
              <button
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                disabled={!clickable}
                title={
                  clickable
                    ? stepNumber < step
                      ? `Go back to step ${stepNumber}: ${s.label}`
                      : `Go to step ${stepNumber}: ${s.label}`
                    : isBlockedFuture
                      ? "Complete earlier steps first"
                      : s.label
                }
                onClick={() => {
                  if (clickable) onStepSelect?.(stepNumber);
                }}
                className={cn(
                  "group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg px-1 py-1 transition-colors sm:px-2",
                  isCurrent && "bg-primary/5",
                  clickable && "cursor-pointer hover:bg-muted",
                  !clickable && !isCurrent && "cursor-not-allowed",
                  isBlockedFuture && "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    isCurrent && "bg-primary text-primary-foreground shadow-sm",
                    isCompleted && "bg-emerald-600 text-white",
                    isReachableForward &&
                      "border-2 border-primary/50 bg-background text-primary group-hover:border-primary group-hover:bg-primary/10",
                    isBlockedFuture && "border border-border bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Icons.Check className="h-4 w-4" aria-hidden /> : stepNumber}
                </span>
                <span
                  className={cn(
                    "hidden max-w-[7rem] truncate text-center text-[11px] leading-tight sm:block",
                    isCurrent && "font-medium text-primary",
                    (isCompleted || isReachableForward) && "text-muted-foreground group-hover:text-foreground",
                    isBlockedFuture && "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
