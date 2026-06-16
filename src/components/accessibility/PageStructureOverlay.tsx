"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Landmark = {
  id: string;
  label: string;
  element: HTMLElement;
  color: string;
};

const LANDMARK_COLORS = [
  "#1E88E5",
  "#43A047",
  "#FB8C00",
  "#8E24AA",
  "#E53935",
  "#00897B",
  "#5E35B1",
  "#F4511E",
];

const LANDMARK_SELECTORS: { selector: string; label: string }[] = [
  { selector: "header", label: "Header" },
  { selector: "nav", label: "Navigation" },
  { selector: "main", label: "Main" },
  { selector: "footer", label: "Footer" },
  { selector: "[role='banner']", label: "Banner" },
  { selector: "[role='navigation']", label: "Nav (ARIA)" },
  { selector: "[role='main']", label: "Main (ARIA)" },
  { selector: "[role='contentinfo']", label: "Content Info" },
  { selector: "[role='complementary']", label: "Complementary" },
  { selector: "aside", label: "Aside" },
];

function collectLandmarks(): Landmark[] {
  const seen = new Set<HTMLElement>();
  const landmarks: Landmark[] = [];
  let colorIndex = 0;

  for (const { selector, label } of LANDMARK_SELECTORS) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    nodes.forEach((el, idx) => {
      if (seen.has(el)) return;
      seen.add(el);
      const color = LANDMARK_COLORS[colorIndex % LANDMARK_COLORS.length];
      colorIndex += 1;
      el.classList.add("a11y-landmark-highlight");
      el.style.setProperty("--a11y-landmark-color", color);
      if (!el.dataset.a11yLandmarkId) {
        el.dataset.a11yLandmarkId = `landmark-${landmarks.length}`;
      }
      landmarks.push({
        id: el.dataset.a11yLandmarkId,
        label: nodes.length > 1 ? `${label} ${idx + 1}` : label,
        element: el,
        color,
      });
    });
  }

  return landmarks;
}

function clearHighlights() {
  document.querySelectorAll(".a11y-landmark-highlight").forEach((el) => {
    el.classList.remove("a11y-landmark-highlight");
    (el as HTMLElement).style.removeProperty("--a11y-landmark-color");
  });
}

export function PageStructureOverlay({ active }: { active: boolean }) {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  const refresh = useCallback(() => {
    clearHighlights();
    if (!active) {
      setLandmarks([]);
      return;
    }
    setLandmarks(collectLandmarks());
  }, [active]);

  useEffect(() => {
    refresh();
    if (!active) return;
    const observer = new MutationObserver(() => refresh());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      clearHighlights();
    };
  }, [active, refresh]);

  if (!active || landmarks.length === 0) return null;

  return (
    <div
      className="fixed left-4 top-20 z-[10050] w-[min(240px,calc(100vw-2rem))] rounded-lg border bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-sm"
      role="complementary"
      aria-label="Page structure"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Page Structure</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            clearHighlights();
            setLandmarks([]);
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close page structure</span>
        </Button>
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {landmarks.map((lm) => (
          <li key={lm.id}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              )}
              onClick={() => {
                lm.element.scrollIntoView({ behavior: "smooth", block: "center" });
                lm.element.focus({ preventScroll: true });
              }}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm border"
                style={{ backgroundColor: lm.color }}
                aria-hidden
              />
              {lm.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
