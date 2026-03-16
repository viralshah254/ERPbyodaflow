"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { getTutorialForRoute } from "@/config/tutorial";
import { getTourForRoute } from "@/config/tutorial-tours";
import { useCopilotStore } from "@/stores/copilot-store";
import { useSpotlightTour } from "@/components/tutorial/SpotlightTour";
import { Button } from "@/components/ui/button";
import { PageGuideSheet } from "@/components/tutorial/PageGuideSheet";
import { BookOpen, Sparkles, Play } from "lucide-react";

const DEFAULT_PROMPT = "Explain this page and suggest next steps.";

export function PageHelp() {
  const pathname = usePathname();
  const info = pathname ? getTutorialForRoute(pathname) : null;
  const tour = pathname ? getTourForRoute(pathname) : null;
  const [guideSheetOpen, setGuideSheetOpen] = React.useState(false);
  const setContext = useCopilotStore((s) => s.setContext);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const { startTour } = useSpotlightTour(tour);

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
      <div className="flex items-center gap-2 flex-wrap">
        {tour && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={startTour}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            Start tour
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setGuideSheetOpen(true)}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Tutorial
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAskCopilot}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {info ? "Ask Copilot about this page" : "Ask Copilot"}
        </Button>
      </div>
      <PageGuideSheet
        open={guideSheetOpen}
        onOpenChange={setGuideSheetOpen}
        info={info}
        onAskCopilot={handleAskCopilot}
        onStartTour={tour ? startTour : undefined}
        hasTour={!!tour}
      />
    </>
  );
}
