"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { TutorialForRoute } from "@/config/tutorial";
import { BookOpen, Sparkles } from "lucide-react";

export interface PageGuideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current route guide; when null, show fallback and only Ask Copilot. */
  info: TutorialForRoute | null;
  onAskCopilot: () => void;
}

const FALLBACK_SUMMARY =
  "No specific guide for this page. Use Ask Copilot to get help and next steps.";

export function PageGuideSheet({
  open,
  onOpenChange,
  info,
  onAskCopilot,
}: PageGuideSheetProps) {
  const pageTitle = info?.itemLabel ?? info?.chapterTitle ?? "This page";
  const guideSummary = info?.guideSummary ?? FALLBACK_SUMMARY;
  const guideSteps = info?.guideSteps ?? [];
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
        </div>
        <div className="flex flex-col gap-2 pt-4 border-t shrink-0">
          <Button
            variant="default"
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
