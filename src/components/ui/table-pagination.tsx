"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export interface TablePaginationProps {
  pageOffset: number;
  pageSize: number;
  itemCount: number;
  hasMore: boolean;
  loading?: boolean;
  busy?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** e.g. "purchase orders" — used in the range summary when idle */
  entityLabel?: string;
  className?: string;
  /** Pin footer to bottom of scroll area for long tables */
  sticky?: boolean;
}

export function TablePagination({
  pageOffset,
  pageSize,
  itemCount,
  hasMore,
  loading = false,
  busy = false,
  onPrevious,
  onNext,
  entityLabel,
  className,
  sticky = false,
}: TablePaginationProps) {
  const pageNumber = Math.floor(pageOffset / pageSize) + 1;
  const rangeStart = itemCount > 0 ? pageOffset + 1 : 0;
  const rangeEnd = pageOffset + itemCount;
  const canGoBack = pageOffset > 0;
  const disabled = loading || busy;

  let summary: string;
  if (loading) {
    summary = entityLabel ? `Loading ${entityLabel}…` : "Loading…";
  } else if (busy) {
    summary = entityLabel ? `Updating ${entityLabel}…` : "Updating…";
  } else if (itemCount === 0) {
    summary = entityLabel ? `No ${entityLabel} match your filters.` : "No results match your filters.";
  } else {
    summary = `Showing ${rangeStart}–${rangeEnd}`;
    if (hasMore) summary += "+";
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between",
        sticky && "sticky bottom-0 z-10 mt-4",
        className
      )}
    >
      <p className="text-sm text-muted-foreground tabular-nums">{summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !canGoBack}
          onClick={onPrevious}
          aria-label="Previous page"
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ChevronLeft className="mr-1 h-4 w-4" />
          )}
          Previous
        </Button>
        <span className="min-w-[5.5rem] text-center text-sm text-muted-foreground tabular-nums px-1">
          Page {pageNumber}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !hasMore}
          onClick={onNext}
          aria-label="Next page"
        >
          Next
          {loading ? (
            <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="ml-1 h-4 w-4" />
          )}
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums sm:ml-1">{pageSize} per page</span>
      </div>
    </div>
  );
}
