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

  React.useEffect(() => {
    if (!hasChildren) return;
    const stored = getItemExpanded(item.id);
    if (stored !== undefined) setIsExpanded(stored);
    else if (isActive || isChildActive) setIsExpanded(true);
  }, [item.id, hasChildren, isActive, isChildActive]);

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    setItemExpanded(item.id, next);
  };

  if (hasChildren && !isCollapsed) {
    return (
      <div>
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer w-full text-left",
            level > 0 && "ml-6",
            isActive
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={toggle}
        >
          <IconComponent className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto shrink-0">
              {item.badge.value}
            </Badge>
          )}
          <Icons.ChevronRight
            className={cn(
              "h-4 w-4 transition-transform shrink-0",
              isExpanded && "rotate-90"
            )}
          />
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
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
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        level > 0 && "ml-6",
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        isCollapsed && "justify-center"
      )}
    >
      <IconComponent className="h-4 w-4 shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto">
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
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover border rounded-md shadow-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {item.label}
          </div>
        </div>
      ) : (
        content
      )}
    </Link>
  );
}





