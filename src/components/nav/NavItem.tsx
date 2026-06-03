"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getItemExpanded, setItemExpanded } from "@/lib/sidebar-state";
import * as Icons from "lucide-react";
interface NavItemLike {
  id: string;
  label: string;
  href?: string;
  icon: string;
  children?: NavItemLike[];
  badge?: { type: "count" | "text"; value: string };
}

interface NavItemProps {
  item: NavItemLike;
  isCollapsed: boolean;
  level?: number;
}

export function NavItem({ item, isCollapsed, level = 0 }: NavItemProps) {
  const pathname = usePathname();
  const IconComponent = (Icons[item.icon as keyof typeof Icons] || Icons.Circle) as React.ComponentType<{ className?: string }>;
  const isActive = item.href ? pathname === item.href || pathname?.startsWith(item.href + "/") : false;
  const isChildActive = item.children?.some(
    (c) => c.href && (pathname === c.href || pathname?.startsWith(c.href + "/"))
  );
  const hasChildren = item.children && item.children.length > 0;
  const [isExpanded, setIsExpanded] = React.useState(isActive || !!isChildActive);
  const itemRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!hasChildren) return;
    const stored = getItemExpanded(item.id);
    if (stored !== undefined) setIsExpanded(stored);
    else if (isActive || isChildActive) setIsExpanded(true);
  }, [item.id, hasChildren, isActive, isChildActive]);

  React.useEffect(() => {
    const el = itemRef.current;
    if (!isActive || !el) return;
    const scrollParent = el.closest("[data-sidebar-scroll]") as HTMLElement | null;
    if (!scrollParent) return;
    try {
      // Keep scroll inside the sidebar rail only — block:"center" on scrollIntoView
      // also scrolls the document and clips the global header on deep nav items.
      const elRect = el.getBoundingClientRect();
      const parentRect = scrollParent.getBoundingClientRect();
      if (elRect.top < parentRect.top) {
        scrollParent.scrollTop -= parentRect.top - elRect.top;
      } else if (elRect.bottom > parentRect.bottom) {
        scrollParent.scrollTop += elRect.bottom - parentRect.bottom;
      }
    } catch {
      // ignore scroll errors
    }
  }, [isActive]);

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    setItemExpanded(item.id, next);
  };

  const nested = level > 0;

  if (hasChildren && !isCollapsed) {
    return (
      <div>
        <button
          type="button"
          className={cn(
            "flex items-center rounded-md px-2.5 font-medium transition-colors cursor-pointer w-full text-left",
            nested
              ? "gap-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              : "gap-2.5 py-2 text-[13px] text-foreground/90 hover:bg-muted/40 hover:text-foreground",
            nested && isActive && "bg-muted/70 text-foreground",
            !nested && isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
            !nested && !isActive && "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
          onClick={toggle}
        >
          <IconComponent
            className={cn(
              "shrink-0 opacity-85",
              nested ? "h-3.5 w-3.5" : "h-[1.0625rem] w-[1.0625rem]"
            )}
          />
          <span className="flex-1 min-w-0 text-left truncate">{item.label}</span>
          {item.badge && (
            <Badge
              variant={item.badge.type === "count" ? "destructive" : "secondary"}
              className={cn("ml-auto shrink-0", nested && "text-[10px] px-1 py-0 h-5")}
            >
              {item.badge.value}
            </Badge>
          )}
          <Icons.ChevronRight
            className={cn(
              "transition-transform shrink-0 opacity-60",
              nested ? "h-3 w-3" : "h-3.5 w-3.5",
              isExpanded && "rotate-90"
            )}
          />
        </button>
        {isExpanded && (
          <div
            className={cn(
              "space-y-0.5 rounded-md bg-muted/20 py-1 pl-1.5 pr-1 ring-1 ring-border/50",
              nested ? "mt-1 ml-4" : "mt-1.5 ml-8"
            )}
          >
            {item.children?.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                isCollapsed={isCollapsed}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const content = (
    <div
      ref={itemRef}
      className={cn(
        "flex items-center rounded-md px-2.5 font-medium transition-colors",
        nested ? "gap-2 py-1 text-[11px]" : "gap-2.5 py-2 text-[13px]",
        nested
          ? isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          : isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        isCollapsed && "justify-center"
      )}
    >
      <IconComponent className={cn("shrink-0 opacity-85", nested ? "h-3.5 w-3.5" : "h-[1.0625rem] w-[1.0625rem]")} />
      {!isCollapsed && (
        <>
          <span className={cn("flex-1 text-left truncate", nested && "font-normal")}>{item.label}</span>
          {item.badge && (
            <Badge variant={item.badge.type === "count" ? "destructive" : "secondary"} className="ml-auto">
              {item.badge.value}
            </Badge>
          )}
        </>
      )}
    </div>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link href={item.href}>
      {isCollapsed ? (
        <div className="relative group">
          {content}
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover border rounded-md shadow-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {item.label}
          </div>
        </div>
      ) : (
        content
      )}
    </Link>
  );
}





