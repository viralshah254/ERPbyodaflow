"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { getTutorialForRoute, TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { getTourForRoute } from "@/config/tutorial-tours";
import { isGaiaConfigured } from "@/lib/gaia/gaia-service";
import { useFilteredTutorialChapters } from "@/lib/tutorial/filter-by-access";
import { tutorialArticles, tutorialGuideHref } from "@/lib/tutorial/knowledge";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";
import { useSpotlightTour } from "@/components/tutorial/SpotlightTour";
import { Button } from "@/components/ui/button";
import { PageGuideSheet } from "@/components/tutorial/PageGuideSheet";
import { BookOpen, Sparkles, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PROMPT = "Explain this page and suggest next steps.";

export function PageHelp({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const routeInfo = pathname ? getTutorialForRoute(pathname) : null;
  const tour = pathname ? getTourForRoute(pathname) : null;
  const [guideSheetOpen, setGuideSheetOpen] = React.useState(false);
  const copilotEnabled = isGaiaConfigured();
  const articles = tutorialArticles(useFilteredTutorialChapters(TUTORIAL_CHAPTERS));
  const article = articles.filter((item) => pathname === tutorialGuideHref(item) || pathname === item.href || pathname?.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
  const info = article && pathname === tutorialGuideHref(article) ? getTutorialForRoute(article.href) : routeInfo;
  const isTourDismissed = useTutorialProgressStore((s) => s.isTourDismissed);
  const dismissTour = useTutorialProgressStore((s) => s.dismissTour);
  const { startTour } = useSpotlightTour(tour);

  const showTour = tour && !isTourDismissed(tour.tourId);

  const handleAskCopilot = React.useCallback(() => {
    const prompt = article ? `Explain how to use ${article.label}, step by step.` : DEFAULT_PROMPT;
    window.dispatchEvent(new CustomEvent("gaia:ask", { detail: { message: prompt, tutorialGuide: article ? tutorialGuideHref(article) : undefined } }));
  }, [article]);

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap" data-tutorial-hint="page-help">
        {showTour && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size={compact ? "icon" : "sm"}
              className={compact ? "h-8 w-8" : "h-7 text-xs"}
              onClick={startTour}
              title="Start tour"
            >
              <Play className={cn("h-3.5 w-3.5", !compact && "mr-1")} />
              {!compact ? "Start tour" : <span className="sr-only">Start tour</span>}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => tour && dismissTour(tour.tourId)}
              title="Don't show this tour again"
              aria-label="Don't show this tour again"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={compact ? "h-8 w-8" : "h-7 text-xs"}
          onClick={() => setGuideSheetOpen(true)}
          title="Tutorial"
        >
          <BookOpen className={cn("h-3.5 w-3.5", !compact && "mr-1")} />
          {!compact ? "Tutorial" : <span className="sr-only">Tutorial</span>}
        </Button>
        {copilotEnabled ? (
          <Button
            variant="ghost"
            size={compact ? "icon" : "sm"}
            className={compact ? "h-8 w-8" : "h-7 text-xs"}
            onClick={handleAskCopilot}
            title="Ask Gaia about this page"
          >
            <Sparkles className={cn("h-3.5 w-3.5", !compact && "mr-1")} />
            {!compact ? "Ask Gaia" : (
              <span className="sr-only">Ask Gaia</span>
            )}
          </Button>
        ) : null}
      </div>
      <PageGuideSheet
        open={guideSheetOpen}
        onOpenChange={setGuideSheetOpen}
        info={info}
        guideHref={article ? tutorialGuideHref(article) : undefined}
        route={pathname ?? undefined}
        copilotAvailable={copilotEnabled}
        onAskCopilot={handleAskCopilot}
        onStartTour={showTour ? startTour : undefined}
        hasTour={!!showTour}
      />
    </>
  );
}
