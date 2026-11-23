"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DocumentSummaryDrawer, useDockedDocumentSummary } from "./document-panel";
import { useUIStore } from "@/stores/ui-store";

/**
 * List pages: the table card fills the window on tall screens. On short screens
 * it keeps LIST_TABLE_MIN_H and the page scrolls, so filters never squeeze it
 * down to a handful of rows.
 */
export const LIST_PAGE_SHELL_CLASS = "min-h-0 min-w-0 flex-1";

/** Toolbar + table column below PageHeader. */
export const LIST_PAGE_BODY_CLASS =
  "flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6";

/** Header row plus 10–12 body rows before the table scrolls inside its card. */
const LIST_TABLE_MIN_H = "min-h-[36rem]";

/** Bordered surface wrapping DataTable scrollMode="fill" (scroll inside the card). */
export const LIST_TABLE_SURFACE_CLASS =
  `relative flex ${LIST_TABLE_MIN_H} flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm`;

/** Inventory-style lists: tall table body from the viewport, pager stays in the card footer. */
export const LIST_TABLE_VIEWPORT_CLASS =
  `relative flex h-[calc(100dvh-14.5rem)] ${LIST_TABLE_MIN_H} flex-col overflow-hidden rounded-xl border bg-card shadow-sm`;

/**
 * Purchasing worklists (optional KPI strip above): table is the primary pane —
 * taller than chrome above it, scrolls inside the card.
 */
export const LIST_TABLE_WORKLIST_CLASS =
  `relative flex h-[calc(100dvh-20.5rem)] ${LIST_TABLE_MIN_H} flex-col overflow-hidden rounded-xl border bg-card shadow-sm`;

/** Compact body under PageHeader when the table uses LIST_TABLE_VIEWPORT_CLASS. */
export const LIST_PAGE_BODY_VIEWPORT_CLASS =
  "flex min-w-0 flex-1 flex-col gap-3 px-0 py-3";

/** Flex child between LIST_TABLE_SURFACE and DataTable — scrolls when rows overflow. */
export const LIST_TABLE_SCROLL_BODY_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto transition-opacity duration-200";

/** Pagination footer pinned below a fill-mode table card. */
export const LIST_TABLE_PAGINATION_CLASS = "shrink-0 border-t px-4";

/** Paginated lists: table grows with rows — no inner scrollport (use with scrollMode="natural"). */
export const LIST_TABLE_STATIC_CLASS =
  "relative shrink-0 overflow-visible rounded-xl border bg-card shadow-sm";

/** Body for paginated list pages — page scrolls; table does not. */
export const LIST_PAGE_BODY_PAGINATED_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 sm:p-6";

interface PageShellProps {
  children: React.ReactNode;
  /** Optional right-side panel (validations, next steps, Copilot). Visibility controlled by RightPanel toggle. */
  rightSlot?: React.ReactNode;
  className?: string;
}

/** Outer container for app pages: flex column inside dashboard scroll area (see MainLayout). Supports optional right panel. */
export function PageShell({ children, rightSlot, className }: PageShellProps) {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const docked = useDockedDocumentSummary();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const hasRightSlot = rightSlot != null;
  React.useEffect(() => {
    if (docked || !hasRightSlot) setDrawerOpen(false);
  }, [docked, hasRightSlot]);

  if (rightSlot == null) {
    return (
      <div
        data-guide-scroll
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <Sheet open={!docked && drawerOpen} onOpenChange={setDrawerOpen}>
      <DocumentSummaryDrawer.Provider value={!docked}>
        <div className={cn("flex min-h-0 min-w-0 flex-1 overflow-hidden", className)}>
          <div data-guide-scroll className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {children}
          </div>
          {docked && rightPanelOpen && (
            <aside aria-label="Document summary" className="w-72 shrink-0 overflow-auto border-l bg-card">
              {rightSlot}
            </aside>
          )}
        </div>
        {!docked && (
          <SheetContent className="w-full max-w-md overflow-y-auto p-0 pt-12 sm:w-[24rem]" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Document summary</SheetTitle>
            {rightSlot}
          </SheetContent>
        )}
      </DocumentSummaryDrawer.Provider>
    </Sheet>
  );
}
