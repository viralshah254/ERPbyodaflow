"use client";

import * as React from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  sticky?: boolean;
  /** Click header to sort; provide sortValue or use accessor when it is a keyof T. */
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
}

function compareSortValues(a: unknown, b: unknown, dir: "asc" | "desc"): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1 * mul;
  if (b == null) return -1 * mul;
  if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
    return (a - b) * mul;
  }
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true }) * mul;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T extends object>({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = "No data available",
  selectable,
  selectedIds = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ columnId: string; dir: "asc" | "desc" } | null>(null);

  const displayData = React.useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortable) return data;
    const getter: ((row: T) => unknown) | null =
      col.sortValue ??
      (typeof col.accessor === "string"
        ? (row: T) => row[col.accessor as keyof T] as unknown
        : null);
    if (!getter) return data;
    const arr = [...data];
    arr.sort((a, b) => compareSortValues(getter(a), getter(b), sort.dir));
    return arr;
  }, [data, sort, columns]);

  const toggleSort = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId);
    if (!col?.sortable) return;
    const getter =
      col.sortValue ??
      (typeof col.accessor === "string" ? (row: T) => row[col.accessor as keyof T] as unknown : null);
    if (!getter) return;
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, dir: "asc" };
      if (prev.dir === "asc") return { columnId, dir: "desc" };
      return null;
    });
  };

  const checkboxClassName =
    "h-4 w-4 rounded-sm border border-primary accent-primary disabled:cursor-not-allowed disabled:opacity-50";
  const selectedSet = React.useMemo(
    () => new Set(selectedIds),
    [selectedIds]
  );
  const allIds = React.useMemo(() => {
    return displayData
      .map((row) => (row as { id?: string }).id)
      .filter(Boolean) as string[];
  }, [displayData]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const someSelected = allIds.some((id) => selectedSet.has(id));

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = selectedSet.has(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange([]);
    else onSelectionChange([...allIds]);
  };

  const colSpan = columns.length + (selectable ? 1 : 0);

  const stickyCell =
    "sticky z-20 min-w-[14rem] max-w-[24rem] border-r border-border/70 bg-background shadow-[4px_0_12px_-6px_rgba(0,0,0,0.25)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.45)]";
  const stickyHead =
    "sticky top-0 z-30 min-w-[14rem] max-w-[24rem] border-r border-border/70 bg-muted/95 backdrop-blur-sm shadow-[4px_0_12px_-6px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.45)]";
  const headerCell =
    "sticky top-0 z-10 bg-muted/95 backdrop-blur-sm";

  return (
    <div className={cn("rounded-md border", className)}>
      <div className="h-[calc(100vh-24rem)] w-full overflow-auto">
        {/* Native <table> — avoid Table component's inner overflow wrapper (breaks sticky columns). */}
        <table className="w-max min-w-full caption-bottom text-sm">
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className={cn(headerCell, "sticky left-0 z-20 w-12")}>
                  <input
                    type="checkbox"
                    className={checkboxClassName}
                    checked={allSelected}
                    ref={(node) => {
                      if (node) node.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    !column.sticky && headerCell,
                    column.sticky && stickyHead,
                    column.sticky && (selectable ? "left-12" : "left-0"),
                    column.className
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className={cn(
                        "-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm font-medium hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSort(column.id);
                      }}
                      aria-sort={
                        sort?.columnId === column.id
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      {column.header}
                      {sort?.columnId === column.id ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((row, rowIndex) => {
                const id = (row as { id?: string }).id;
                const checked = id ? selectedSet.has(id) : false;
                return (
                  <TableRow
                    key={id || rowIndex}
                    className={cn(
                      "group",
                      onRowClick && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell
                        className="sticky left-0 z-10 w-12 bg-background"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className={checkboxClassName}
                          checked={checked}
                          onChange={() => id && toggleRow(id)}
                          aria-label={`Select row ${id ?? rowIndex}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value =
                        typeof column.accessor === "function"
                          ? column.accessor(row)
                          : (row[column.accessor] as React.ReactNode);
                      return (
                        <TableCell
                          key={column.id}
                          className={cn(
                            column.sticky &&
                              cn(stickyCell, "group-hover:bg-muted/50", selectable ? "left-12" : "left-0"),
                            column.className
                          )}
                        >
                          {value ?? ""}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}


