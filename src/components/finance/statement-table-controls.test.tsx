import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStatementTable } from './statement-table-controls';
const sections = [
  { key: 'revenue', label: 'Revenue', amount: 1200, lines: [{ accountId: 'a', code: '4100', name: 'Zebra', amount: 1000 }, { accountId: 'b', code: '4000', name: 'Apple', amount: 200 }] },
  { key: 'expense', label: 'Expenses', amount: 300, lines: [{ accountId: 'c', code: '5000', name: 'Cleaning', amount: 300 }] },
  { key: 'net-income', label: 'Net income', amount: 900, lines: [] },
];
describe('financial statement table controls', () => {
  it('filters account lines and expands matches without altering section totals', () => {
    const { result } = renderHook(() => useStatementTable(sections));
    act(() => result.current.setQuery('Apple'));
    expect(result.current.sections[0].lines).toEqual([sections[0].lines[1]]);
    expect(result.current.sections.map(section => section.amount)).toEqual([1200, 300, 900]);
    expect(sections[0].lines).toHaveLength(2);
  });
  it('sorts accounts inside their original sections, preserving statement order', () => {
    const { result } = renderHook(() => useStatementTable(sections));
    act(() => result.current.toggle('amount'));
    expect(result.current.sections[0].lines.map(line => line.amount)).toEqual([200, 1000]);
    expect(result.current.sections.map(section => section.key)).toEqual(['revenue', 'expense', 'net-income']);
    act(() => result.current.toggle('amount'));
    expect(result.current.sections[0].lines.map(line => line.amount)).toEqual([1000, 200]);
    act(() => result.current.toggle('amount'));
    expect(result.current.sort).toBeNull();
  });
});
