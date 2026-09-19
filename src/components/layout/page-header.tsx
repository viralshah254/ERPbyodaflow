"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, PanelLeftOpen, PanelRightClose } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { CommandPaletteHint } from "@/components/command/CommandPaletteHint";
import { PageHelp } from "@/components/tutorial/PageHelp";

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
  /** Extra-tight padding; default chrome is already compact. */
  dense?: boolean;
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
  dense = false,
  className,
}: PageHeaderProps) {
  const { rightPanelOpen, toggleRightPanel } = useUIStore();
  const visibleCrumbs = (breadcrumbs ?? []).filter((crumb, i, all) => {
    const isLast = i === all.length - 1;
    return !(isLast && crumb.label === title);
  });

  return (
    <div
      className={cn(
        "shrink-0 border-b bg-card px-4",
        dense ? "py-2" : "py-2.5",
        sticky && "sticky top-0 z-30 bg-card shadow-sm",
        className
      )}
    >
      {visibleCrumbs.length > 0 && (
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          {visibleCrumbs.map((crumb, i) => (
            <React.Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:line-clamp-1 sm:block">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:shrink-0">
          <PageHelp compact />
          {showCommandHint ? <CommandPaletteHint /> : null}
          {showRightPanelToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleRightPanel}
              title={rightPanelOpen ? "Hide right panel" : "Show right panel"}
            >
              {rightPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
