"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { BookOpen, CheckCircle2, MoveVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitTutorialEvent } from "@/lib/api/tutorial-events";
import { useAuthStore } from "@/stores/auth-store";

import { guideTarget, isGuideTargetVisible, type InteractiveGuideStep } from "@/lib/tutorial/interactive-types";

/** Shared, non-modal guide. Tasks observe user interactions; they never invoke business actions. */
export function InteractiveGuide({ guideId, title, steps, launcherLabel = "Help with this page", regionLabel = "Interactive page guide", closeLabel = "Close guide", storagePrefix = "erp-page-guide:v2", startEvent = false, getSteps, referenceTasks = [] }: {
  guideId: string; title: string; steps: InteractiveGuideStep[]; launcherLabel?: string;
  regionLabel?: string; closeLabel?: string; storagePrefix?: string; startEvent?: boolean;
  getSteps?: () => InteractiveGuideStep[]; referenceTasks?: string[];
}) {
  const userId = useAuthStore((s) => s.user?.userId);
  const orgId = useAuthStore((s) => s.org?.orgId);
  const key = `${storagePrefix}:${userId ?? "local"}:${orgId ?? "local"}:${guideId}`;
  const [dialogContainer, setDialogContainer] = React.useState<HTMLElement | null>(null);
  const [prepared, setPrepared] = React.useState<InteractiveGuideStep[] | null>(null);
  const currentSteps = prepared ?? steps;
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [finished, setFinished] = React.useState(false);
  const [top, setTop] = React.useState(false);
  const [actedStep, setActedStep] = React.useState<string | null>(null);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [foundStep, setFoundStep] = React.useState<string | null>(null);
  const launcher = React.useRef<HTMLButtonElement>(null);
  const activeRun = React.useRef(false);
  const step = currentSteps[index];
  const targetSelector = step?.target;
  const acted = !!step && actedStep === step.id;
  const found = !!step && foundStep === step.id;
  const panelId = React.useId();
  const dynamic = !!getSteps;
  const ready = found && step?.complete !== false && (!step?.action || acted);

  React.useEffect(() => {
    if (open) document.documentElement.setAttribute("data-erp-guide-open", "true");
    return () => {
      if (!document.querySelector("[data-interactive-guide]")) document.documentElement.removeAttribute("data-erp-guide-open");
    };
  }, [open]);

  React.useEffect(() => {
    setOpen(false);
    setIndex(0);
    setFinished(false);
    setSkipped([]);
  }, [key]);

  React.useEffect(() => {
    if (!open || !targetSelector || finished) return;

    let target: HTMLElement | null = null;
    let original = "";
    let originalTabIndex: string | null = null;
    let originalActive: string | null = null;
    const locate = () => {
      const activeDialog = [...document.querySelectorAll<HTMLElement>("[role=dialog]")].filter(isGuideTargetVisible).at(-1);
      if (activeDialog && !activeDialog.contains(launcher.current)) { setOpen(false); return; }
      const next = guideTarget({ id: "target", target: targetSelector, title: "", description: "" });
      if (step?.action === "tab" && next?.getAttribute("aria-selected") === "true") setActedStep(step?.id ?? null);
      if (next === target) return;
      if (target) { target.style.boxShadow = original; if (originalActive === null) target.removeAttribute("data-guide-active"); else target.setAttribute("data-guide-active", originalActive); target.removeAttribute("data-guide-active-step"); if (originalTabIndex === null) target.removeAttribute("tabindex"); else target.setAttribute("tabindex", originalTabIndex); }
      target = next;
      setFoundStep(target ? step?.id ?? null : null);
      if (target) {
        original = target.style.boxShadow;
        originalTabIndex = target.getAttribute("tabindex");
        originalActive = target.getAttribute("data-guide-active");
        target.setAttribute("data-guide-active", "true");
        target.setAttribute("data-guide-active-step", step?.id ?? "");
        if (step?.action === "inspect" && originalTabIndex === null) target.setAttribute("tabindex", "0");
        target.style.boxShadow = "0 0 0 3px hsl(var(--primary) / .65)";
        target.scrollIntoView?.({ block: "center", behavior: "instant" });
      }
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-hidden", "aria-selected", "data-state", "disabled"] });
    const interact = (event: Event) => {
      if (!target || !(event.target instanceof Element) || !target.contains(event.target)) return;
      if (step?.action === "inspect" && ["click", "focusin"].includes(event.type)) setActedStep(step?.id ?? null);
      if (step?.action === "input" && ["input", "change"].includes(event.type) && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        setActedStep(event.target.type !== "password" && event.target.value.trim().length > 0 && event.target.checkValidity() ? step?.id ?? null : null);
      }
      if (step?.action === "select" && ["pointerdown", "click", "keydown", "change"].includes(event.type)) setActedStep(step?.id ?? null);
    };
    for (const name of ["input", "change", "pointerdown", "click", "focusin", "keydown"]) document.addEventListener(name, interact, true);
    return () => {
      observer.disconnect();
      for (const name of ["input", "change", "pointerdown", "click", "focusin", "keydown"]) document.removeEventListener(name, interact, true);
      if (target) { target.style.boxShadow = original; if (originalActive === null) target.removeAttribute("data-guide-active"); else target.setAttribute("data-guide-active", originalActive); target.removeAttribute("data-guide-active-step"); if (originalTabIndex === null) target.removeAttribute("tabindex"); else target.setAttribute("tabindex", originalTabIndex); }
    };
  }, [open, targetSelector, step?.id, step?.action, finished]);

  const save = (status: "in-progress" | "completed" | "reviewed", nextIndex = index, nextSkipped = skipped) => {
    try { localStorage.setItem(key, JSON.stringify({ status, index: nextIndex, stepId: currentSteps[nextIndex]?.id, skipped: nextSkipped, title, href: window.location.pathname, updatedAt: Date.now() })); } catch { /* Storage can be disabled. */ }
    if (status !== "in-progress") {
      activeRun.current = false;
      void emitTutorialEvent({ event: status === "completed" ? "tour_completed" : "tour_skipped", tourId: guideId, page: guideId });
    }
  };
  const close = React.useCallback(() => {
    setOpen(false);
    launcher.current?.focus();
  }, []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.target instanceof HTMLSelectElement) return; if ([...document.querySelectorAll("[role=listbox]")].some(isGuideTargetVisible)) return; if (e.key === "Escape" && !e.defaultPrevented && !(e.target instanceof Element && e.target.closest("[role=dialog], [role=listbox]"))) { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  function start() {
    const activeDialog = [...document.querySelectorAll<HTMLElement>("[role=dialog]")].filter(isGuideTargetVisible).at(-1) ?? null;
    setDialogContainer(activeDialog && activeDialog.contains(launcher.current) ? activeDialog : null);
    const available = getSteps?.() ?? steps;
    if (!available.length) return;
    setPrepared(getSteps ? available : null);
    let next = 0;
    let restoredSkipped: string[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      if (saved?.status === "in-progress") {
        const byId = available.findIndex(step => step.id === saved.stepId);
        next = byId >= 0 ? byId : Number.isInteger(saved.index) ? Math.max(0, Math.min(saved.index, available.length - 1)) : 0;
        if (Array.isArray(saved.skipped)) restoredSkipped = saved.skipped.filter((id: unknown) => typeof id === "string");
      }
    } catch { /* Start at the beginning if progress is unavailable. */ }
    try { localStorage.setItem(key, JSON.stringify({ status: "in-progress", index: next, stepId: available[next]?.id, skipped: restoredSkipped, title, href: window.location.pathname, updatedAt: Date.now() })); } catch { /* Optional browser progress. */ }
    activeRun.current = true;
    void emitTutorialEvent({ event: "tour_started", tourId: guideId, page: guideId });
    window.dispatchEvent(new CustomEvent("erp:guide:opened", { detail: panelId }));
    setSkipped(restoredSkipped);
    setIndex(next);
    setFinished(false);
    setOpen(true);
  }

  React.useEffect(() => {
    if (!open && activeRun.current) { activeRun.current = false; void emitTutorialEvent({ event: "tour_skipped", tourId: guideId, page: guideId }); }
  }, [open, guideId]);
  React.useEffect(() => () => {
    if (activeRun.current) { activeRun.current = false; void emitTutorialEvent({ event: "tour_skipped", tourId: guideId, page: guideId }); }
  }, [guideId]);

  React.useEffect(() => {
    const closeOther = (event: Event) => { if ((event as CustomEvent).detail !== panelId) setOpen(false); };
    const closeForAssistant = () => setOpen(false);
    window.addEventListener("erp:guide:opened", closeOther);
    window.addEventListener("gaia:ask", closeForAssistant);
    return () => { window.removeEventListener("erp:guide:opened", closeOther); window.removeEventListener("gaia:ask", closeForAssistant); };
  }, [panelId]);

  React.useEffect(() => {
    if (!startEvent) return;
    const launch = () => {
      const active = [...document.querySelectorAll<HTMLElement>("[role=dialog]")].filter(isGuideTargetVisible).at(-1);
      if (active && !active.contains(launcher.current)) return;
      launcher.current?.click();
    };
    window.addEventListener("erp:guide:start", launch);
    const auto = !dynamic && new URLSearchParams(window.location.search).get("learn") === "1";
    const timer = auto ? window.setTimeout(() => {
      launch();
      const url = new URL(window.location.href); url.searchParams.delete("learn");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }, 250) : undefined;
    return () => { window.removeEventListener("erp:guide:start", launch); if (timer) window.clearTimeout(timer); };
  }, [startEvent, dynamic]);

  return <>
    <Button type="button" ref={launcher} variant="outline" size="sm" onClick={start} data-page-help aria-label={launcherLabel} aria-expanded={open} aria-controls={panelId}>
      <BookOpen className="mr-2 h-4 w-4" /> Help
    </Button>
    {open && createPortal(
      <section id={panelId} data-interactive-guide data-guide-step={step?.id} aria-label={regionLabel} className={`z-[100000] overflow-y-auto rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl max-h-[40dvh] sm:max-h-[45dvh] ${dialogContainer ? `sticky w-full ${top ? "top-0 order-first" : "bottom-0"}` : `fixed right-3 w-[calc(100vw-1.5rem)] max-w-sm ${top ? "top-20" : "bottom-20"}`}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</span>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Move guide panel" onClick={() => setTop(!top)}><MoveVertical className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={closeLabel} onClick={() => { if (!finished) save("in-progress"); close(); }}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        {finished ? <div role="status" className="space-y-3">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <h2 className="text-lg font-semibold">{skipped.length ? "Walkthrough reviewed" : "Page walkthrough complete"}</h2>
          <p className="text-sm text-muted-foreground">{skipped.length ? `${skipped.length} task(s) were skipped. Replay when the required data or access is available.` : "You have reviewed this screen. Business changes still require your own save or confirmation."}</p>
          <Button type="button" variant="outline" onClick={() => { activeRun.current = true; void emitTutorialEvent({ event: "tour_started", tourId: guideId, page: guideId }); setIndex(0); setFinished(false); setSkipped([]); save("in-progress", 0, []); }}>Replay walkthrough</Button>
        </div> : step && <>
          <p className="mb-2 text-xs text-muted-foreground">Step {index + 1} of {currentSteps.length} · Work directly on the highlighted area</p>
          <div role="status" aria-live="polite">
            <h2 className="text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            {step.instruction && <p className="mt-3 rounded-lg bg-primary/10 p-3 text-sm">{(step.complete === true || acted) ? "✓ " : "→ "}{step.instruction}</p>}
            {!found && <p className="mt-2 text-sm text-muted-foreground">This area is loading, hidden by a tab, or unavailable to your role. Open the relevant section, or skip this task and review it later.</p>}
          </div>
          {referenceTasks.length > 0 && <details className="mt-3 rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Workflow checklist</summary><ol className="mt-3 list-decimal space-y-2 pl-4 text-muted-foreground">{referenceTasks.map((task, i) => <li key={i}>{task}</li>)}</ol></details>}
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => { setIndex(index - 1); save("in-progress", index - 1); }}>Back</Button>
            <Button type="button" size="sm" disabled={!ready} onClick={() => {
              if (index === currentSteps.length - 1) { save(skipped.length ? "reviewed" : "completed"); setFinished(true); }
              else { setIndex(index + 1); save("in-progress", index + 1); }
            }}>{index === currentSteps.length - 1 ? "Finish walkthrough" : "Next"}</Button>
          </div>
          <div className="mt-2 flex justify-between">
            <Button type="button" variant="link" size="sm" onClick={() => { save("in-progress"); close(); }}>Save and exit guide</Button>
            <Button type="button" variant="link" size="sm" onClick={() => {
              const nextSkipped = [...new Set([...skipped, step.id])]; setSkipped(nextSkipped);
              if (index === currentSteps.length - 1) { save("reviewed", index, nextSkipped); setFinished(true); }
              else { setIndex(index + 1); save("in-progress", index + 1, nextSkipped); }
            }}>Skip task</Button>
          </div>
        </>}
      </section>, dialogContainer ?? document.body)}
  </>;
}
