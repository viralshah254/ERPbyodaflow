"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { TutorialForRoute } from "@/config/tutorial";
import { BookOpen, Sparkles, ArrowRight, Play } from "lucide-react";
import { emitTutorialEvent } from "@/lib/api/tutorial-events";

export interface PageGuideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current route guide; when null, show fallback and only Ask Copilot. */
  info: TutorialForRoute | null;
  /** Current pathname for analytics */
  route?: string;
  /** When false, Copilot actions are hidden (org has not enabled the Copilot product). */
  copilotAvailable?: boolean;
  onAskCopilot: () => void;
  /** Optional: start spotlight tour when available */
  onStartTour?: () => void;
  hasTour?: boolean;
}

const FALLBACK_NO_COPILOT =
  "No specific guide for this page. Use the Tutorial chapter links and navigation to find related screens.";
const FALLBACK_WITH_COPILOT =
  "No specific guide for this page. Use Ask Copilot to get help and next steps.";

export function PageGuideSheet({
  open,
  onOpenChange,
  info,
  route,
  copilotAvailable = false,
  onAskCopilot,
  onStartTour,
  hasTour,
}: PageGuideSheetProps) {
  React.useEffect(() => {
    if (open && route) {
      emitTutorialEvent({ event: "tutorial_viewed", page: route });
    }
  }, [open, route]);

  const pageTitle = info?.itemLabel ?? info?.chapterTitle ?? "This page";
  const guideSummary =
    info?.guideSummary ?? (copilotAvailable ? FALLBACK_WITH_COPILOT : FALLBACK_NO_COPILOT);
  const guideSteps = info?.guideSteps ?? [];
  const guideTips = info?.guideTips ?? [];
  const elementHints = info?.elementHints ?? [];
  const recommendedNextStep = info?.recommendedNextStep;
  const hasChapterLink = !!info?.hrefToChapter;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col overflow-hidden"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            About: {pageTitle}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {guideSummary}
          </p>
          {guideSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">How to use this page</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                {guideSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          {guideTips.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tips</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {guideTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {elementHints.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Element hints</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {elementHints.map((eh, i) => (
                  <li key={i}>
                    <code className="text-xs bg-muted px-1 rounded">{eh.selector}</code>: {eh.hint}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recommendedNextStep && (
            <div>
              <h4 className="text-sm font-medium mb-2">Next step</h4>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={recommendedNextStep.href} onClick={() => onOpenChange(false)}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {recommendedNextStep.label}
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-4 border-t shrink-0">
          {hasTour && onStartTour && (
            <Button
              variant="default"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                onStartTour();
                onOpenChange(false);
              }}
            >
              <Play className="mr-2 h-4 w-4" />
              Start tour
            </Button>
          )}
          {copilotAvailable ? (
            <Button
              variant={hasTour ? "outline" : "default"}
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                onAskCopilot();
                onOpenChange(false);
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Ask Copilot about this page
            </Button>
          ) : null}
          {hasChapterLink && (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={info!.hrefToChapter} onClick={() => onOpenChange(false)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Open full chapter
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
