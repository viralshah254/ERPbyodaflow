"use client";

import * as React from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from './input';
import { compareTableValues, matchesTableSearch, tableText } from '@/lib/tables/values';
import { cn } from "@/lib/utils";
import { isProductNameColumn, CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  sticky?: boolean;
  /**
   * Click header to sort. Defaults to on when `accessor` is a field key or
   * `sortValue` is set. Set false for actions / non-data columns.
   */
  sortable?: boolean;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  searchValue?: (row: T) => string | number | null | undefined;
}

function columnCanSort<T>(col: Column<T>): boolean {
  return !!col.header.trim() && col.sortable !== false && !/^(actions?|select|selection|checkbox|menu)$/i.test(col.id) && !/^actions?$/i.test(col.header.trim());
}
function columnValue<T>(col: Column<T>, row: T): React.ReactNode {
  return typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor] as React.ReactNode;
}
function sortValue<T>(col: Column<T>, row: T): unknown {
  if (col.sortValue) return col.sortValue(row);
  if (typeof col.accessor === 'string') return row[col.accessor];
  const raw = (row as Record<string, unknown>)[col.id];
  if (raw == null || typeof raw === 'string' || typeof raw === 'number' || raw instanceof Date) { if (raw != null) return raw; }
  return tableText(columnValue(col, row));
}

export type DataTableScrollMode = "fixed" | "fill" | "auto" | "natural";
export type DataTableSize = "default" | "comfortable" | "compact";
export type DataTableSortState = { columnId: string; dir: "asc" | "desc" } | null;

interface DataTableProps<T> {
  data: T[];
  /** Supply the full filtered list when the parent paginates in memory. */
  allData?: T[];
  pageOffset?: number;
  pageSize?: number;
  onPageOffsetChange?: (offset: number) => void;
  dataScope?: 'all' | 'page';
  /** Disable the built-in input when a page already supplies its search toolbar. */
  searchable?: boolean;
  search?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Controlled sort. When set with `onSortChange`, the parent owns sort state
   * (e.g. server-side list queries). Omit both to keep table-local sort.
   */
  sort?: DataTableSortState;
  onSortChange?: (sort: DataTableSortState) => void;
  /**
   * Skip in-memory reorder. Use when the parent already fetched data in this
   * sort order (paginated server sort).
   */
  disableClientSort?: boolean;
  /**
   * auto — height follows row count up to maxVisibleRows, then scrolls inside the table (default).
   * fill — flex child; scroll only inside parent flex column (parent needs min-h-0 flex-1).
   * fixed — capped scrollport (max 70dvh); avoid on list pages inside dashboard shell.
   * natural — grow with content; page scrolls (detail views).
   */
  scrollMode?: DataTableScrollMode;
  /** Cap visible body rows before scrolling (auto mode; defaults to 25). */
  maxVisibleRows?: number;
  /** Row/cell padding — comfortable for detail pages, compact for long lists. */
  size?: DataTableSize;
}

export function DataTable<T extends object>({
  data,
  allData,
  pageOffset = 0,
  pageSize,
  onPageOffsetChange,
  dataScope = "all",
  searchable = true,
  search: searchProp,
  onSearchChange,
  searchPlaceholder = "Search table…",
  columns,
  onRowClick,
  className,
  emptyMessage = "No data available",
  selectable,
  selectedIds = [],
  onSelectionChange,
  sort: sortProp,
  onSortChange,
  disableClientSort = false,
  scrollMode = "auto",
  maxVisibleRows = 25,
  size = "default",
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = React.useState('');
  const search = searchProp ?? internalSearch;
  const [internalSort, setInternalSort] = React.useState<DataTableSortState>(null);
  const isSortControlled = onSortChange != null;
  const sort = isSortControlled ? (sortProp ?? null) : internalSort;

  const displayData = React.useMemo(() => {
    const source = allData ?? data;
    const filtered = search.trim() ? source.filter(row => matchesTableSearch(columns.filter(columnCanSort).map(col => col.searchValue ? col.searchValue(row) : `${tableText(columnValue(col, row))} ${sortValue(col, row) ?? ''}`).join(' '), search)) : source;
    const page = (rows: T[]) => allData && pageSize ? rows.slice(pageOffset, pageOffset + pageSize) : rows;
    if (disableClientSort || !sort) return page(filtered);
    const col = columns.find(c => c.id === sort.columnId);
    if (!col || !columnCanSort(col)) return page(filtered);
    return page([...filtered].sort((a, b) => compareTableValues(sortValue(col, a), sortValue(col, b), sort.dir)));
  }, [data, allData, pageOffset, pageSize, search, sort, columns, disableClientSort]);

  const nextSortState = (
    prev: DataTableSortState,
    columnId: string,
  ): DataTableSortState => {
    if (!prev || prev.columnId !== columnId) return { columnId, dir: "asc" };
    if (prev.dir === "asc") return { columnId, dir: "desc" };
    return null;
  };

  const toggleSort = (columnId: string) => {
    onPageOffsetChange?.(0);
    const col = columns.find((c) => c.id === columnId);
    if (!col || !columnCanSort(col)) return;
    if (isSortControlled) {
      onSortChange(nextSortState(sort, columnId));
      return;
    }
    setInternalSort((prev) => nextSortState(prev, columnId));
  };

  const checkboxClassName =
    "h-4 w-4 rounded-sm border border-primary accent-primary disabled:cursor-not-allowed disabled:opacity-50";
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
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
    if (allSelected) onSelectionChange(selectedIds.filter(id => !allIds.includes(id)));
    else onSelectionChange([...new Set([...selectedIds, ...allIds])]);
  };

  const colSpan = columns.length + (selectable ? 1 : 0);

  /** Narrower min width avoids forcing page-level horizontal scroll on dense operational tables. */
  const stickyCell =
    "sticky z-20 min-w-[10rem] max-w-[20rem] border-r border-border/70 bg-background shadow-[4px_0_12px_-6px_rgba(0,0,0,0.25)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.45)]";
  const useStickyHeader = scrollMode !== "natural";
  const stickyHead = useStickyHeader
    ? "sticky top-0 z-30 min-w-[10rem] max-w-[20rem] border-r border-border/70 bg-muted/95 backdrop-blur-sm shadow-[4px_0_12px_-6px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.45)]"
    : "z-10 min-w-[10rem] max-w-[20rem] border-r border-border/70 bg-muted/95";
  const headerCell = useStickyHeader
    ? "sticky top-0 z-10 bg-muted/95 backdrop-blur-sm"
    : "z-10 bg-muted/95";

  const needsAutoScroll =
    scrollMode === "auto" && displayData.length > maxVisibleRows;
  const autoScrollRows = needsAutoScroll
    ? Math.min(displayData.length, maxVisibleRows)
    : 0;
  const autoMaxHeight = needsAutoScroll
    ? `min(70dvh, calc(2.75rem * ${autoScrollRows} + 3.25rem))`
    : undefined;

  const scrollClassName = cn(
    "w-full min-w-0 max-w-full",
    scrollMode === "natural" && "overflow-x-auto overflow-y-visible",
    scrollMode === "auto" &&
      !needsAutoScroll &&
      "overflow-x-auto overflow-y-visible",
    (scrollMode === "fixed" ||
      scrollMode === "fill" ||
      (scrollMode === "auto" && needsAutoScroll)) &&
      "overflow-auto",
    scrollMode === "fixed" && "max-h-[min(28rem,70dvh)] min-h-0",
    scrollMode === "fill" && "min-h-0 h-full flex-1 overflow-x-auto overflow-y-auto",
    scrollMode === "auto" && needsAutoScroll && "min-h-0",
  );

  const tableSizeClass =
    size === "comfortable"
      ? "[&_td]:h-auto [&_td]:py-3.5 [&_td]:px-4 [&_th]:h-auto [&_th]:min-h-10 [&_th]:py-3 [&_th]:px-4 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground"
      : size === "compact"
        ? "[&_td]:min-h-9 [&_td]:py-1.5 [&_td]:px-3 [&_th]:h-9 [&_th]:py-1.5 [&_th]:px-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground"
        : "[&_td]:h-auto [&_th]:h-auto [&_th]:min-h-10";

  return (
    <div
      className={cn(
        "min-w-0 max-w-full rounded-md border",
        scrollMode === "fill" && "flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      {searchable && <div className="flex shrink-0 flex-wrap items-center gap-3 border-b p-3 print:hidden"><Input type="search" aria-label="Search table" placeholder={dataScope === "page" ? "Search this page…" : searchPlaceholder} value={search} onChange={event => { setInternalSearch(event.target.value); onPageOffsetChange?.(0); onSearchChange?.(event.target.value); }} className="max-w-sm" /><span className="text-xs text-muted-foreground" role="status">{displayData.length} of {data.length} rows</span></div>}
      {dataScope === "page" && <p className="shrink-0 px-3 py-2 text-xs text-muted-foreground print:hidden">Column sorting applies to the loaded page.</p>}
      <div
        className={scrollClassName}
        style={autoMaxHeight ? { maxHeight: autoMaxHeight } : undefined}
      >
        {/* Native <table> — avoid Table component's inner overflow wrapper (breaks sticky columns). */}
        <table
          className={cn(
            "caption-bottom text-sm",
            "w-full min-w-0",
            scrollMode === "natural" && "min-w-full",
            tableSizeClass,
          )}
        >
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead
                  className={cn(headerCell, "sticky left-0 z-20 w-12")}
                >
                  <input
                    type="checkbox"
                    className={checkboxClassName}
                    checked={allSelected}
                    ref={(node) => {
                      if (node)
                        node.indeterminate = !allSelected && someSelected;
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
                    column.className,
                    column.className?.includes("text-right") && "text-right",
                  )}
                  aria-sort={
                    columnCanSort(column)
                      ? sort?.columnId === column.id
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                >
                  {columnCanSort(column) ? (
                    <button
                      type="button"
                      className={cn(
                        "-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm font-medium hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSort(column.id);
                      }}
                    >
                      {column.header}
                      {sort?.columnId === column.id ? (
                        sort.dir === "asc" ? (
                          <ArrowUp
                            className="h-3.5 w-3.5 shrink-0 opacity-70"
                            aria-hidden
                          />
                        ) : (
                          <ArrowDown
                            className="h-3.5 w-3.5 shrink-0 opacity-70"
                            aria-hidden
                          />
                        )
                      ) : (
                        <ArrowUpDown
                          className="h-3.5 w-3.5 shrink-0 opacity-40"
                          aria-hidden
                        />
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
                      onRowClick && "cursor-pointer hover:bg-muted/50",
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
                              cn(
                                stickyCell,
                                "group-hover:bg-muted/50",
                                selectable ? "left-12" : "left-0",
                              ),
                            column.className,
                            isProductNameColumn(column) && CAPS_ON_PRODUCT_CLASS,
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
