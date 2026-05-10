"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { getSectionExpanded, setSectionExpanded } from "@/lib/sidebar-state";
import * as Icons from "lucide-react";
interface NavSectionLike {
  id: string;
  label: string;
  items: Array<{
    id: string;
    label: string;
    href?: string;
    icon: string;
    children?: NavSectionLike["items"];
    badge?: { type: "count" | "text"; value: string };
    navGroupLabel?: string;
  }>;
}

interface NavSectionProps {
  section: NavSectionLike;
  isCollapsed: boolean;
}

export function NavSection({ section, isCollapsed }: NavSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  React.useEffect(() => {
    const stored = getSectionExpanded(section.id);
    if (stored !== undefined) setIsExpanded(stored);
  }, [section.id]);

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    setSectionExpanded(section.id, next);
  };

  if (isCollapsed) {
    return null; // Hide section headers when collapsed
  }

  return (
    <section className="border-t border-border/45 pt-5 first:border-0 first:pt-0">
      <h2 className="sr-only">{section.label}</h2>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "group sticky top-0 z-10 mb-3 flex min-h-[2.25rem] w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors sm:items-center sm:gap-2.5",
          "border border-transparent bg-muted/35 shadow-sm backdrop-blur-sm hover:border-border/40 hover:bg-muted/55",
          isExpanded ? "text-foreground/80" : "text-muted-foreground"
        )}
        aria-expanded={isExpanded}
      >
        <Icons.ChevronRight
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors transition-transform sm:mt-0 group-hover:text-foreground/80",
            isExpanded && "rotate-90"
          )}
        />
        <span className="min-w-0 flex-1 break-words text-sm font-semibold uppercase leading-snug tracking-[0.1em] text-foreground/90">
          {section.label}
        </span>
      </button>
      {isExpanded && (
        <div className="flex flex-col gap-0.5">
          {section.items.map((item, idx) => {
            const prev = section.items[idx - 1];
            const showGroup =
              item.navGroupLabel && item.navGroupLabel !== prev?.navGroupLabel;
            return (
              <div key={item.id}>
                {showGroup && (
                  <div className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
                    <span className="border-b border-border/50 pb-0.5">{item.navGroupLabel}</span>
                  </div>
                )}
                <NavItem item={item} isCollapsed={isCollapsed} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}





