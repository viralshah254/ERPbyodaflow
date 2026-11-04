export interface InteractiveGuideStep {
  id: string;
  target: string | (() => Element | null);
  title: string;
  description: string;
  complete?: boolean;
  instruction?: string;
  action?: "input" | "select" | "inspect" | "tab";
}
export interface GuideProgress {
  status: "in-progress" | "completed" | "reviewed";
  stepId: string;
  skipped: string[];
}

export function isGuideTargetVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  if (element.closest("[hidden], [aria-hidden='true'], [inert], [data-state='inactive'][role='tabpanel'], [data-state='closed'][role='dialog'], [data-state='closed'][role='listbox']")) return false;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}

export function guideTarget(step: InteractiveGuideStep): HTMLElement | null {
  try {
    const element = typeof step.target === "function" ? step.target() : document.querySelector(step.target);
    return isGuideTargetVisible(element) ? element : null;
  } catch { return null; }
}
