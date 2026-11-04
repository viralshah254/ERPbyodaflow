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
  className?: string;
}

interface PageHeaderProps {
  title: string;
  /** Optional page-specific help override. */
  help?: React.ReactNode;
  description?: React.ReactNode;
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
  titleClassName?: string;
}

export function PageHeader({
  title,
  help,
  description,
  breadcrumbs,
  actions,
  sticky = true,
  showCommandHint = true,
  showRightPanelToggle = false,
  dense = false,
  className,
  titleClassName,
}: PageHeaderProps) {
  const { rightPanelOpen, toggleRightPanel } = useUIStore();
  const visibleCrumbs = (breadcrumbs ?? []).filter((crumb, i, all) => {
    const isLast = i === all.length - 1;
    return !(isLast && crumb.label === title);
  });

  return (
    <div
      className={cn(
        "shrink-0 border-b bg-card px-4 sm:px-5",
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
                <Link href={crumb.href} className={cn("hover:text-foreground transition-colors", crumb.className)}>
                  {crumb.label}
                </Link>
              ) : (
                <span className={crumb.className}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1" data-tutorial-hint="page-title">
          <h1 className={cn("text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl", titleClassName)}>
            {title}
          </h1>
          {description ? (
            <div data-page-purpose className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {description}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end lg:max-w-[55%] lg:shrink-0 [&>div]:max-w-full" data-tutorial-hint="page-actions">
          {help === undefined ? <PageHelp compact /> : help}
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
