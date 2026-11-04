"use client";
import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { compareTableValues, matchesTableSearch } from '@/lib/tables/values';
import type { FinanceStatementSection } from '@/lib/api/finance';

export function useStatementTable(sections: FinanceStatementSection[]) {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<{ column: 'account' | 'amount'; direction: 'asc' | 'desc' } | null>(null);
  const toggle = (column: 'account' | 'amount') => setSort(previous => previous?.column !== column ? { column, direction: 'asc' } : previous.direction === 'asc' ? { column, direction: 'desc' } : null);
  const visibleSections = React.useMemo(() => sections.map(section => {
    const lines = section.lines.filter(line => matchesTableSearch(`${line.code} ${line.name} ${line.amount}`, query));
    return { ...section, lines: sort ? [...lines].sort((a, b) => compareTableValues(sort.column === 'account' ? `${a.code} ${a.name}` : a.amount, sort.column === 'account' ? `${b.code} ${b.name}` : b.amount, sort.direction)) : lines };
  }), [sections, query, sort]);
  return { query, setQuery, sort, toggle, sections: visibleSections };
}
export function StatementTableSearch({ table }: { table: ReturnType<typeof useStatementTable> }) {
  return <div className="space-y-1 pb-3 print:hidden"><Input type="search" aria-label="Search statement accounts" placeholder="Search account code, name or amount…" value={table.query} onChange={event => table.setQuery(event.target.value)} className="max-w-sm" />{table.query && <p className="text-xs text-muted-foreground">Account lines are filtered; statement totals remain unchanged.</p>}</div>;
}
export function StatementTableHeader({ table }: { table: ReturnType<typeof useStatementTable> }) {
  return <thead><tr className="border-b bg-muted/30">{(['account', 'amount'] as const).map(column => {
    const active = table.sort?.column === column;
    const Icon = active ? table.sort!.direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
    return <th key={column} className={`px-4 py-2 ${column === 'amount' ? 'text-right' : 'text-left'}`} aria-sort={active ? table.sort!.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => table.toggle(column)} className="inline-flex items-center gap-2 rounded p-1 focus-visible:ring-2 focus-visible:ring-ring">{column === 'account' ? 'Account' : 'Amount'}<Icon className="h-3.5 w-3.5" aria-hidden="true" /></button></th>;
  })}</tr></thead>;
}
