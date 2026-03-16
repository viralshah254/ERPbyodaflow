"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";
import { getTutorialForRoute } from "@/config/tutorial";
import { getTourForRoute } from "@/config/tutorial-tours";
import { PageGuideSheet } from "@/components/tutorial/PageGuideSheet";
import { useSpotlightTour } from "@/components/tutorial/SpotlightTour";
import { useCopilotStore } from "@/stores/copilot-store";
import { BookOpen, X, Sparkles, Play } from "lucide-react";

const EXCLUDED_PATHS = ["/tutorial", "/login", "/signup", "/platform"];

export function FirstVisitBanner() {
  const pathname = usePathname();
  const info = pathname ? getTutorialForRoute(pathname) : null;
  const tour = pathname ? getTourForRoute(pathname) : null;
  const [guideSheetOpen, setGuideSheetOpen] = React.useState(false);
  const { startTour } = useSpotlightTour(tour);

  const {
    visitedPages,
    dismissedHints,
    markPageVisited,
    dismissHint,
  } = useTutorialProgressStore();

  const setContext = useCopilotStore((s) => s.setContext);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const normalizedPath = pathname?.replace(/\/$/, "") || "/";
  const isExcluded = EXCLUDED_PATHS.some((p) => normalizedPath.startsWith(p));
  const hasVisited = !!visitedPages[normalizedPath];
  const dismissedGlobally = !!dismissedHints["first-visit-banner-global"];
  const dismissedForPage = !!dismissedHints[`first-visit-banner-${normalizedPath}`];

  const showBanner =
    !isExcluded &&
    pathname &&
    !hasVisited &&
    !dismissedGlobally &&
    !dismissedForPage;

  const handleOpenGuide = React.useCallback(() => {
    setGuideSheetOpen(true);
  }, []);

  const handleAskCopilot = React.useCallback(() => {
    const prompt = info?.copilotPrompt ?? "Explain this page and suggest next steps.";
    setContext({
      page: info?.itemLabel ?? info?.chapterTitle,
      route: pathname ?? undefined,
    });
    openDrawerWithPrompt(prompt);
    markPageVisited(normalizedPath);
    dismissHint(`first-visit-banner-${normalizedPath}`);
  }, [info, pathname, setContext, openDrawerWithPrompt, markPageVisited, dismissHint, normalizedPath]);

  const handleSkip = React.useCallback(() => {
    markPageVisited(normalizedPath);
    dismissHint(`first-visit-banner-${normalizedPath}`);
  }, [markPageVisited, dismissHint, normalizedPath]);

  const handleDontShowAgain = React.useCallback(() => {
    dismissHint("first-visit-banner-global");
    markPageVisited(normalizedPath);
  }, [dismissHint, markPageVisited, normalizedPath]);

  const handleGuideSheetClose = React.useCallback(
    (open: boolean) => {
      setGuideSheetOpen(open);
      if (!open) {
        markPageVisited(normalizedPath);
      }
    },
    [markPageVisited, normalizedPath]
  );

  if (!showBanner) return null;

  return (
    <>
      <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            First time here? Take a quick tour or open the guide.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tour && (
            <Button size="sm" variant="default" onClick={startTour}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start tour
            </Button>
          )}
          <Button size="sm" variant={tour ? "outline" : "default"} onClick={handleOpenGuide}>
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Open guide
          </Button>
          <Button size="sm" variant="outline" onClick={handleAskCopilot}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Ask Copilot
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={handleDontShowAgain}
          >
            Don&apos;t show again
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={handleSkip}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <PageGuideSheet
        open={guideSheetOpen}
        onOpenChange={handleGuideSheetClose}
        info={info}
        onAskCopilot={() => {
          handleAskCopilot();
          setGuideSheetOpen(false);
        }}
        onStartTour={tour ? () => { startTour(); setGuideSheetOpen(false); } : undefined}
        hasTour={!!tour}
      />
    </>
  );
}
