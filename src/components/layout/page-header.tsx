"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { CommandPaletteHint } from "@/components/command/CommandPaletteHint";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  /** Sticky header (default true for enterprise UX) */
  sticky?: boolean;
  /** Show ⌘K keyboard shortcut hint. When true, passes onCommandPalette to a hint element. */
  showCommandHint?: boolean;
  /** Show RightPanel toggle when page has a right slot */
  showRightPanelToggle?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  sticky = true,
  showCommandHint = true,
  showRightPanelToggle = false,
  className,
}: PageHeaderProps) {
  const { rightPanelOpen, toggleRightPanel } = useUIStore();

  return (
    <div
      className={cn(
        "border-b bg-card px-6 py-4 shrink-0",
        sticky && "sticky top-0 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80",
        className
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icons.ChevronRight className="h-4 w-4 shrink-0" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {showCommandHint && (
              <CommandPaletteHint />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showRightPanelToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRightPanel}
              title={rightPanelOpen ? "Hide right panel" : "Show right panel"}
            >
              {rightPanelOpen ? (
                <Icons.PanelRightClose className="h-4 w-4" />
              ) : (
                <Icons.PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
