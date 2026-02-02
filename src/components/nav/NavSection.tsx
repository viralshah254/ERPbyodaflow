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
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "sticky top-0 z-10 flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-md hover:bg-accent/50 bg-card backdrop-blur-sm"
        )}
      >
        <Icons.ChevronRight
          className={cn(
            "h-3 w-3 transition-transform shrink-0",
            isExpanded && "rotate-90"
          )}
        />
        <span className="truncate">{section.label}</span>
      </button>
      {isExpanded && (
        <div className="space-y-1">
          {section.items.map((item) => (
            <NavItem key={item.id} item={item} isCollapsed={isCollapsed} />
          ))}
        </div>
      )}
    </div>
  );
}





