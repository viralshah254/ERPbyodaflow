"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  sticky?: boolean;
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

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = "No data available",
  selectable,
  selectedIds = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const selectedSet = React.useMemo(
    () => new Set(selectedIds),
    [selectedIds]
  );
  const allIds = React.useMemo(
    () => data.map((r) => r.id).filter(Boolean) as string[],
    [data]
  );
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

  return (
    <div className={cn("rounded-md border", className)}>
      <ScrollArea className="h-[calc(100vh-24rem)]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
            <TableRow>
              {selectable && (
                <TableHead className="sticky left-0 z-20 w-12 bg-muted/50">
                  <Checkbox
                    checked={allSelected || (someSelected ? "indeterminate" : false)}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.sticky && "sticky left-0 z-20 bg-muted/50",
                    selectable && column.sticky && "left-12",
                    column.className
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => {
                const id = row.id as string | undefined;
                const checked = id ? selectedSet.has(id) : false;
                return (
                  <TableRow
                    key={row.id || rowIndex}
                    className={cn(
                      onRowClick && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell
                        className="sticky left-0 z-10 w-12 bg-background"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => id && toggleRow(id)}
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
                            column.sticky && "sticky left-0 z-10 bg-background",
                            selectable && column.sticky && "left-12",
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
        </Table>
      </ScrollArea>
    </div>
  );
}


