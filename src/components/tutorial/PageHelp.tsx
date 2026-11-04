"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveGuide } from "./InteractiveGuide";
import { PageGuideSheet } from "./PageGuideSheet";
import { resolveScreenGuide, localizeScreenGuide } from "@/lib/tutorial/screen-guides";
import { isGuideTargetVisible } from "@/lib/tutorial/interactive-types";
import { TUTORIAL_REVISION } from "@/lib/tutorial/knowledge";
import { buildScreenSteps } from "@/lib/tutorial/build-screen-steps";
import { getTutorialForRoute } from "@/config/tutorial";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";

export function PageHelp({ compact = false, context = "page" }: { compact?: boolean; context?: string }) {
  const pathname = usePathname() || "/";
  const terminology = useOrgContextStore(s => s.terminology);
  const guide = React.useMemo(() => { const screen = resolveScreenGuide(pathname); return screen ? localizeScreenGuide(screen, terminology) : null; }, [pathname, terminology]);
  const templateId = useOrgContextStore(s => s.templateId);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const copilot = useCopilotFeatureEnabled();
  const original = getTutorialForRoute(pathname);
  React.useEffect(() => {
    if (!guide || new URLSearchParams(window.location.search).get("learn") !== "1") return;
    let launched = false;
    const launch = () => {
      const root = document.querySelector("[data-tutorial-hint=page-main]");
      const heading = root?.querySelector("h1");
      if (launched || !heading || /loading|not found|could not load/i.test(heading.textContent ?? "")) return;
      launched = true;
      window.dispatchEvent(new Event("erp:guide:start"));
      const url = new URL(window.location.href); url.searchParams.delete("learn");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    };
    const timer = window.setTimeout(launch, 250);
    const observer = new MutationObserver(launch);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { window.clearTimeout(timer); observer.disconnect(); };
  }, [guide]);
  if (!guide) return null;
  const info = { chapterId: original?.chapterId ?? pathname.split("/")[1], chapterTitle: original?.chapterTitle ?? guide.title, hrefToChapter: original?.hrefToChapter ?? "/tutorial", copilotPrompt: `Explain ${guide.title}.`, itemLabel: guide.title, guideSummary: guide.summary, guideSteps: guide.tasks, guideTips: guide.kind === "workspace" || guide.kind === "report" ? original?.guideTips ?? [] : [], elementHints: guide.hints, recommendedNextStep: original?.recommendedNextStep };
  const startFromSheet = () => {
    setSheetOpen(false);
    let attempts = 0;
    const launchWhenReady = () => {
      if (window.location.pathname !== pathname) return;
      const root = document.querySelector<HTMLElement>("[data-tutorial-hint=page-main]");
      if (!root || !isGuideTargetVisible(root) || [...document.querySelectorAll("[role=dialog]")].some(isGuideTargetVisible)) {
        if (++attempts < 40) window.setTimeout(launchWhenReady, 50);
        return;
      }
      window.dispatchEvent(new Event("erp:guide:start"));
    };
    window.setTimeout(launchWhenReady, 0);
  };
  const ask = () => window.dispatchEvent(new CustomEvent("gaia:ask", { detail: { message: `ERP handbook reference (${TUTORIAL_REVISION}). Explain ${guide.title} using this screen's workflow: ${guide.summary}\n\n${guide.tasks.map((task, index) => `${index + 1}. ${task}`).join("\n")}\n\nThe user's role controls available actions. Explain the task without performing it.` } }));
  return <>
    <div className="flex flex-wrap items-center gap-1" data-tutorial-hint="page-help">
      <InteractiveGuide key={`${TUTORIAL_REVISION}:${pathname}:${templateId}:${context}`} guideId={`${TUTORIAL_REVISION}:${templateId ?? "default"}:${guide.identity}:${context}`} title={`${guide.title} · guide`} steps={[]} startEvent referenceTasks={guide.tasks}
        launcherLabel="Start tour — Help with this page" getSteps={() => {
          const root = document.querySelector<HTMLElement>("[data-tutorial-hint=page-main]");
          return root ? buildScreenSteps(guide, root) : [];
        }} />
      <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} title="Read this screen's guide" aria-label="Tutorial — read this screen's guide" onClick={() => setSheetOpen(true)}>
        <BookOpen className="h-4 w-4" />{!compact && <span className="ml-2">Written guide</span>}
      </Button>
      {copilot && <Button type="button" variant="ghost" size="icon" title="Ask Gaia about this page" aria-label="Ask Gaia about this page" onClick={ask}><Sparkles className="h-4 w-4" /></Button>}
    </div>
    <PageGuideSheet open={sheetOpen} onOpenChange={setSheetOpen} info={info} route={pathname} copilotAvailable={copilot} onAskCopilot={ask} hasTour onStartTour={startFromSheet} />
  </>;
}
