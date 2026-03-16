"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTutorialForRoute } from "@/config/tutorial";
import { useCopilotStore } from "@/stores/copilot-store";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles } from "lucide-react";

const DEFAULT_PROMPT = "Explain this page and suggest next steps.";

export function PageHelp() {
  const pathname = usePathname();
  const info = pathname ? getTutorialForRoute(pathname) : null;
  const setContext = useCopilotStore((s) => s.setContext);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const handleAskCopilot = () => {
    const prompt = info?.copilotPrompt ?? DEFAULT_PROMPT;
    setContext({
      page: info?.itemLabel ?? info?.chapterTitle,
      route: pathname ?? undefined,
    });
    openDrawerWithPrompt(prompt);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {info ? (
        <>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href={info.hrefToChapter} className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Tutorial
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleAskCopilot}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Ask Copilot about this page
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAskCopilot}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Ask Copilot
        </Button>
      )}
    </div>
  );
}
