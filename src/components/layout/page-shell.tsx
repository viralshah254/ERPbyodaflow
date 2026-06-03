"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

/** List pages: constrain height so tables scroll inside the shell, not the window. */
export const LIST_PAGE_SHELL_CLASS = "min-h-0 flex-1 overflow-hidden";

/** Toolbar + table column below PageHeader. */
export const LIST_PAGE_BODY_CLASS =
  "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6";

/** Bordered surface wrapping DataTable scrollMode="fill" (scroll inside the card). */
export const LIST_TABLE_SURFACE_CLASS =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm";

/** Flex child between LIST_TABLE_SURFACE and DataTable scrollMode="fill". */
export const LIST_TABLE_SCROLL_BODY_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200";

/** Pagination footer pinned below a fill-mode table card. */
export const LIST_TABLE_PAGINATION_CLASS = "shrink-0 border-t px-4";

/** Paginated lists: table grows with rows — no inner scrollport (use with scrollMode="natural"). */
export const LIST_TABLE_STATIC_CLASS =
  "relative shrink-0 overflow-visible rounded-xl border bg-card shadow-sm";

/** Body for paginated list pages — page scrolls; table does not. */
export const LIST_PAGE_BODY_PAGINATED_CLASS =
  "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 sm:p-6";

interface PageShellProps {
  children: React.ReactNode;
  /** Optional right-side panel (validations, next steps, Copilot). Visibility controlled by RightPanel toggle. */
  rightSlot?: React.ReactNode;
  className?: string;
}

/** Outer container for app pages: flex column inside dashboard scroll area (see MainLayout). Supports optional right panel. */
export function PageShell({ children, rightSlot, className }: PageShellProps) {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  if (rightSlot == null) {
    return (
      <div
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
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-0">
          {children}
        </div>
        <div
          className={cn(
            "shrink-0 border-l bg-card transition-all overflow-auto",
            rightPanelOpen
              ? "w-[min(100%,16rem)] lg:w-[18rem] max-w-[18rem]"
              : "w-0 border-0 overflow-hidden",
          )}
        >
          {rightPanelOpen ? rightSlot : null}
        </div>
      </div>
    </div>
  );
}
