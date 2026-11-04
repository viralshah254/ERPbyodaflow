"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { PageHelp } from "./PageHelp";
import { isGuideTargetVisible } from "@/lib/tutorial/interactive-types";

/** Bring help inside a modal's focus boundary, so forms and drawers remain operable. */
export function DialogHelp() {
  const pathname = usePathname();
  const [dialog, setDialog] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    const inspect = () => {
      const active = [...document.querySelectorAll<HTMLElement>("[role=dialog]")].filter(el => isGuideTargetVisible(el) && !el.closest("[data-guide-reference]")).at(-1) ?? null;
      setDialog(old => old === active ? old : active);
    };
    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-hidden", "data-state"] });
    return () => observer.disconnect();
  }, [pathname]);
  if (!dialog) return null;
  // Form structure identifies the dialog without putting record names or field values in progress/analytics.
  const schema = [...dialog.querySelectorAll("input,textarea,select,[role=combobox]")].map(el => `${el.tagName}:${el.getAttribute("name") || el.getAttribute("type") || el.getAttribute("role") || "field"}`).join("|");
  let hash = 2166136261;
  for (const character of schema) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const context = `dialog-schema-${(hash >>> 0).toString(16)}`;
  return createPortal(<div className="order-first flex shrink-0 justify-end border-b bg-card pb-2 pr-6" data-contextual-dialog-help><PageHelp compact context={context} /></div>, dialog);
}
