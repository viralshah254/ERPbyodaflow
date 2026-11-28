"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers to show: first, last, and the pages around the current one. `null` is a gap. */
export function pageNumberWindow(current: number, last: number): Array<number | null> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, last - 1, last, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push(null);
    out.push(p);
  });
  return out;
}

export interface NumberedPaginationProps {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading?: boolean;
  className?: string;
}

/** `‹ 1 2 3 … 10 ›` with a total and a rows-per-page picker. Page buttons never scroll the page away from the footer. */
export function NumberedPagination({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  loading = false,
  className,
}: NumberedPaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), lastPage);
  const rangeStart = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const rangeEnd = Math.min(current * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {total === 0 ? "No items" : `${rangeStart}–${rangeEnd} of ${total}`}
      </p>
      <nav aria-label="Pages" className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={loading || current <= 1}
          onClick={() => onPageChange(current - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageNumberWindow(current, lastPage).map((p, i) =>
          p == null ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={p === current ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-8 px-2 text-xs tabular-nums"
              disabled={loading}
              aria-label={`Page ${p}`}
              aria-current={p === current ? "page" : undefined}
              onClick={() => p !== current && onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={loading || current >= lastPage}
          onClick={() => onPageChange(current + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-muted-foreground">Rows</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))} disabled={loading}>
          <SelectTrigger className="h-8 w-[4.5rem] text-xs tabular-nums" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs tabular-nums">
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
