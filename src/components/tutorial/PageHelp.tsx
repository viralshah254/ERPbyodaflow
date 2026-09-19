"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { getTutorialForRoute } from "@/config/tutorial";
import { getTourForRoute } from "@/config/tutorial-tours";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";
import { useSpotlightTour } from "@/components/tutorial/SpotlightTour";
import { Button } from "@/components/ui/button";
import { PageGuideSheet } from "@/components/tutorial/PageGuideSheet";
import { BookOpen, Sparkles, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PROMPT = "Explain this page and suggest next steps.";

export function PageHelp({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const info = pathname ? getTutorialForRoute(pathname) : null;
  const tour = pathname ? getTourForRoute(pathname) : null;
  const [guideSheetOpen, setGuideSheetOpen] = React.useState(false);
  const copilotEnabled = useCopilotFeatureEnabled();
  const setContext = useCopilotStore((s) => s.setContext);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const isTourDismissed = useTutorialProgressStore((s) => s.isTourDismissed);
  const dismissTour = useTutorialProgressStore((s) => s.dismissTour);
  const { startTour } = useSpotlightTour(tour);

  const showTour = tour && !isTourDismissed(tour.tourId);

  const handleAskCopilot = React.useCallback(() => {
    const prompt = info?.copilotPrompt ?? DEFAULT_PROMPT;
    setContext({
      page: info?.itemLabel ?? info?.chapterTitle,
      route: pathname ?? undefined,
    });
    openDrawerWithPrompt(prompt);
  }, [info, pathname, setContext, openDrawerWithPrompt]);

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
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
            title={info ? "Ask Copilot about this page" : "Ask Copilot"}
          >
            <Sparkles className={cn("h-3.5 w-3.5", !compact && "mr-1")} />
            {!compact ? (info ? "Ask Copilot about this page" : "Ask Copilot") : (
              <span className="sr-only">Ask Copilot</span>
            )}
          </Button>
        ) : null}
      </div>
      <PageGuideSheet
        open={guideSheetOpen}
        onOpenChange={setGuideSheetOpen}
        info={info}
        route={pathname ?? undefined}
        copilotAvailable={copilotEnabled}
        onAskCopilot={handleAskCopilot}
        onStartTour={showTour ? startTour : undefined}
        hasTour={!!showTour}
      />
    </>
  );
}
