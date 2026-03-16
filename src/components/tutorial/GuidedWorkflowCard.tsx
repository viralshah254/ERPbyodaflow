"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";
import { Check, ChevronRight } from "lucide-react";

export interface GuidedWorkflowStep {
  label: string;
  href: string;
}

export interface GuidedWorkflowCardProps {
  title: string;
  description: string;
  steps: GuidedWorkflowStep[];
  /** Show only when user has explored fewer than this many unique paths */
  showWhenExploredLessThan?: number;
}

export function GuidedWorkflowCard({
  title,
  description,
  steps,
  showWhenExploredLessThan = 5,
}: GuidedWorkflowCardProps) {
  const visitedPages = useTutorialProgressStore((s) => s.visitedPages);
  const exploredCount = Object.keys(visitedPages).filter((p) => visitedPages[p]).length;

  if (exploredCount >= showWhenExploredLessThan) return null;

  const completedSteps = steps.filter((step) => {
    const path = step.href.replace(/\/$/, "") || "/";
    return visitedPages[path];
  });
  const allComplete = completedSteps.length === steps.length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {allComplete ? <Check className="h-4 w-4 text-green-600" /> : null}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {steps.map((step, i) => {
            const path = step.href.replace(/\/$/, "") || "/";
            const done = visitedPages[path];
            return (
              <Button
                key={i}
                variant={done ? "secondary" : "outline"}
                size="sm"
                asChild
              >
                <Link href={step.href}>
                  {done ? <Check className="h-3 w-3 mr-1" /> : null}
                  {step.label}
                  {!done && <ChevronRight className="h-3 w-3 ml-0.5" />}
                </Link>
              </Button>
            );
          })}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tutorial" className="text-muted-foreground">
              Go to tutorial
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
