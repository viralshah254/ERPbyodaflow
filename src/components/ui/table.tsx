"use client";

import * as React from "react";
import { Input } from './input';
import { buildReactTableView, type TableViewSort } from '@/lib/tables/react-table';
import { cn } from "@/lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  searchable?: boolean;
  sortable?: boolean;
  searchPlaceholder?: string;
  dataScope?: 'all' | 'page';
}
const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, children, searchable = true, sortable = true, searchPlaceholder = 'Search table…', dataScope = 'all', ...props }, ref) => {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<TableViewSort>(null);
  const toggle = React.useCallback((column: number) => setSort(previous => previous?.column !== column ? { column, direction: 'asc' } : previous.direction === 'asc' ? { column, direction: 'desc' } : null), []);
  const view = React.useMemo(() => buildReactTableView(children, searchable ? query : '', sort, toggle, sortable), [children, query, searchable, sort, sortable, toggle]);
  return <div className="min-w-0 w-full">
    {searchable && view.supported && <div className="flex flex-wrap items-center gap-3 pb-3 print:hidden"><Input type="search" aria-label="Search table" placeholder={dataScope === 'page' ? 'Search loaded rows…' : searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} className="max-w-sm" /><span className="text-xs text-muted-foreground" role="status">{view.visibleCount} of {view.rowCount} rows</span></div>}
    {dataScope === 'page' && view.supported && <p className="pb-2 text-xs text-muted-foreground print:hidden">Column sorting applies to the loaded page.</p>}
    <div className="relative w-full overflow-auto"><table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props}>{view.children}</table></div>
    {query && view.supported && view.visibleCount === 0 && <p className="py-4 text-sm text-muted-foreground" role="status">No rows match your search.</p>}
  </div>;
});
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};

