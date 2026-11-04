import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { compareTableValues, matchesTableSearch, sortableTableValue, tableText } from './values';
describe('table values', () => {
  it('sorts currencies, percentages, natural document codes and dates correctly', () => {
    expect(['KES 1,200.00', 'KES 99.00', 'KES (20.00)'].sort((a, b) => compareTableValues(a, b, 'asc'))).toEqual(['KES (20.00)', 'KES 99.00', 'KES 1,200.00']);
    expect(['INV-20', 'INV-3'].sort((a, b) => compareTableValues(a, b, 'asc'))).toEqual(['INV-3', 'INV-20']);
    expect(compareTableValues('2026-10-31', '2026-11-01', 'asc')).toBeLessThan(0);
    expect(sortableTableValue('12.5%')).toBe(12.5);
    expect(sortableTableValue(new Date('2026-11-04'))).toBe(Date.parse('2026-11-04'));
  });
  it('keeps missing and invalid numeric values last in either direction', () => {
    for (const direction of ['asc', 'desc'] as const) {
      expect(compareTableValues(null, 10, direction)).toBeGreaterThan(0);
      expect(compareTableValues(NaN, 10, direction)).toBeGreaterThan(0);
    }
  });
  it('matches every word, ignores case and accents, and indexes only visible values', () => {
    expect(matchesTableSearch('Café Nairobi KES 1200', 'nairobi CAFE')).toBe(true);
    expect(matchesTableSearch('Nairobi', 'nairobi missing')).toBe(false);
    const Label = (_props: { name: string; secret: string }) => null;
    expect(tableText(React.createElement(Label, { name: 'Displayed name', secret: 'hidden secret' }))).toBe('Displayed name');
  });
});
