import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { compareTableValues, matchesTableSearch, tableText } from './values';

type Element = React.ReactElement<Record<string, any>>;
export type TableViewSort = { column: number; direction: 'asc' | 'desc' } | null;
function tag(node: React.ReactNode): string {
  if (!React.isValidElement(node)) return '';
  return typeof node.type === 'string' ? node.type : (node.type as { displayName?: string }).displayName || '';
}
export function tableChildren(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap(child => React.isValidElement(child) && child.type === React.Fragment ? tableChildren((child as Element).props.children) : [child]);
}
function cells(row: React.ReactNode): Element[] {
  if (!React.isValidElement(row) || !['tr', 'TableRow'].includes(tag(row))) return [];
  return tableChildren((row as Element).props.children).filter(child => ['th', 'td', 'TableHead', 'TableCell'].includes(tag(child))) as Element[];
}
function editable(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  if (['Checkbox'].includes(tag(node)) || ['checkbox', 'radio'].includes((node as Element).props.type)) return false;
  if (/^(input|select|textarea|Input|Select|Switch|Textarea|MoneyInput)$/.test(tag(node))) return true;
  return tableChildren((node as Element).props.children).some(editable);
}
function fixed(row: React.ReactNode): boolean {
  if (!React.isValidElement(row)) return true;
  const props = (row as Element).props;
  return props['data-table-row'] === 'fixed' || (/font-(?:bold|semibold)/.test(String(props.className || '')) && /^(?:(?:grand|sub)\s*)?total(?:s|\s|:|$)/i.test(tableText(cells(row)[0]).trim())) || cells(row).length === 0 || cells(row).some(cell => Number(cell.props.colSpan || 1) > 1 || Number(cell.props.rowSpan || 1) > 1);
}

/** Sort/filter React rows without changing source records, keys, handlers, totals, or section boundaries. */
export function buildReactTableView(children: React.ReactNode, query: string, sort: TableViewSort, toggle: (column: number) => void, sortable = true) {
  const sections = tableChildren(children);
  const head = sections.find(section => ['thead', 'TableHeader'].includes(tag(section))) as Element | undefined;
  const headers = head ? tableChildren(head.props.children).flatMap(cells) : [];
  const bodies = sections.filter(section => ['tbody', 'TableBody'].includes(tag(section))) as Element[];
  const allRows = bodies.flatMap(body => tableChildren(body.props.children));
  const dataRows = allRows.filter(row => !fixed(row));
  const hasEditableRows = dataRows.some(editable);
  const canSort = sortable && !hasEditableRows && headers.length > 0 && tableChildren(head?.props.children).length === 1 && headers.every(cell => Number(cell.props.colSpan || 1) === 1) && allRows.every(row => cells(row).length > 0);
  let visible = 0;
  const transformed = sections.map(section => {
    if (!React.isValidElement(section)) return section;
    if (section === head && canSort) {
      return React.cloneElement(section as Element, {}, tableChildren((section as Element).props.children).map(row => {
        if (!React.isValidElement(row)) return row;
        return React.cloneElement(row as Element, {}, tableChildren((row as Element).props.children).map((cell, column) => {
          if (!React.isValidElement(cell)) return cell;
          const element = cell as Element;
          const label = tableText(element.props.children).trim();
          const customButton = tableChildren(element.props.children).some(child => React.isValidElement(child) && (tag(child) === 'button' || tag(child) === 'Button'));
          if (!label || /^(actions?|select|#)$/i.test(label) || Number(element.props.colSpan || 1) > 1 || customButton || element.props.onClick || editable(element)) return cell;
          const selected = sort?.column === column;
          const Icon = selected ? sort.direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
          return React.cloneElement(element, { 'aria-sort': selected ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none' }, <button type="button" className="inline-flex items-center gap-1.5 rounded px-1 py-1 text-inherit hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.stopPropagation(); toggle(column); }}>{element.props.children}<Icon className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" /></button>);
        }));
      }));
    }
    if (!bodies.includes(section as Element)) return section;
    const output: React.ReactNode[] = [];
    let group: React.ReactNode[] = [];
    const flush = () => {
      const filtered = query.trim() ? group.filter(row => matchesTableSearch(cells(row).map(cell => `${tableText(cell)} ${cell.props['data-sort-value'] ?? ''}`).join(' '), query)) : group;
      const sorted = canSort && sort ? [...filtered].sort((a, b) => {
        const left = cells(a)[sort.column], right = cells(b)[sort.column];
        return compareTableValues(left?.props['data-sort-value'] ?? tableText(left), right?.props['data-sort-value'] ?? tableText(right), sort.direction);
      }) : filtered;
      visible += sorted.length;
      output.push(...sorted); group = [];
    };
    for (const row of tableChildren((section as Element).props.children)) {
      if (fixed(row)) { flush(); output.push(row); } else group.push(row);
    }
    flush();
    return React.cloneElement(section as Element, {}, output);
  });
  return { children: transformed, rowCount: dataRows.length, visibleCount: visible, supported: headers.length > 0 && dataRows.length > 0, hasEditableRows };
}
