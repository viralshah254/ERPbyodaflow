import * as React from 'react';

/** Read only visible labels/values; never index arbitrary record properties or hidden identifiers. */
export function tableText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(tableText).join(' ');
  if (!React.isValidElement(node)) return '';
  const props = node.props as Record<string, unknown>;
  if (props.children != null) return tableText(props.children as React.ReactNode);
  for (const key of ['value', 'label', 'amount', 'name', 'status', 'title']) {
    if (typeof props[key] === 'string' || typeof props[key] === 'number') return String(props[key]);
  }
  return '';
}
export function matchesTableSearch(value: string, query: string): boolean {
  const normalize = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f,]/g, '').toLocaleLowerCase();
  const haystack = normalize(value);
  return normalize(query).trim().split(/\s+/).every(token => haystack.includes(token));
}
export function sortableTableValue(value: unknown): string | number | null {
  if (value == null || value === '' || value === '—' || value === '–') return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  // Currency, percentages, grouping separators and accounting negatives; leave document numbers as text.
  const currency = '(?:KES|USD|EUR|GBP|UGX|TZS|RWF|BIF|ZAR|ETB|NGN|GHS|AED|CAD|AUD|CHF|JPY|CNY|INR|ZMW|MWK|SSP|SOS|KSh)';
  const numeric = text.replace(new RegExp(`^(?:${currency}\\s*|[$€£]\\s*)`, 'i'), '').replace(new RegExp(`\\s*(?:${currency}|%)$`, 'i'), '').replace(/,/g, '').trim();
  if (/^\(?-?\d+(?:\.\d+)?\)?$/.test(numeric)) return Number(numeric.replace(/[()]/g, '')) * (numeric.startsWith('(') ? -1 : 1);
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text) || /^\d{1,2}[ /-][A-Za-z]{3,9}[ /,-]\s*\d{4}$/.test(text)) {
    const date = Date.parse(text);
    if (Number.isFinite(date)) return date;
  }
  return text;
}
export function compareTableValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  const left = sortableTableValue(a), right = sortableTableValue(b);
  // Missing values stay last in both directions.
  if (left == null) return right == null ? 0 : 1;
  if (right == null) return -1;
  const multiplier = direction === 'asc' ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
}
