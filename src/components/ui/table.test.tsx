import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell, TableFooter } from './table';

function Ledger({ action = () => {} }: { action?: () => void }) {
  return <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Debit</TableHead><TableHead>Balance</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
    <TableRow><TableCell>Zebra</TableCell><TableCell>KES 1,200.00</TableCell><TableCell data-sort-value={1200}>KES 1,200.00</TableCell><TableCell><button onClick={action}>Open Zebra</button></TableCell></TableRow>
    <TableRow><TableCell>Apple</TableCell><TableCell>KES 99.00</TableCell><TableCell data-sort-value={1299}>KES 1,299.00</TableCell><TableCell><button onClick={action}>Open Apple</button></TableCell></TableRow>
  </TableBody><TableFooter><TableRow><TableCell colSpan={4}>Total KES 1,299.00</TableCell></TableRow></TableFooter></Table>;
}
describe('plain ERP tables', () => {
  it('searches visible cells, clears the filter, and keeps totals unchanged', async () => {
    const user = userEvent.setup(); render(<Ledger />);
    await user.type(screen.getByRole('searchbox'), 'apple');
    expect(screen.queryByText('Zebra')).not.toBeInTheDocument();
    expect(screen.getByText('Total KES 1,299.00')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getByText('Zebra')).toBeInTheDocument();
  });
  it('sorts numeric amounts in both directions and restores the original order', async () => {
    const user = userEvent.setup(); render(<Ledger />);
    const debit = screen.getByRole('button', { name: 'Debit' });
    await user.click(debit);
    expect(within(screen.getAllByRole('row')[1]).getByText('Apple')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Debit' })).toHaveAttribute('aria-sort', 'ascending');
    await user.click(debit);
    expect(within(screen.getAllByRole('row')[1]).getByText('Zebra')).toBeInTheDocument();
    await user.click(debit);
    expect(within(screen.getAllByRole('row')[1]).getByText('Zebra')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });
  it('keeps chronological balances attached to their records and preserves row actions', async () => {
    const action = vi.fn(), user = userEvent.setup(); render(<Ledger action={action} />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByText('Apple')).toBeInTheDocument();
    expect(within(first).getByText('KES 1,299.00')).toBeInTheDocument();
    await user.click(within(first).getByRole('button', { name: 'Open Apple' }));
    expect(action).toHaveBeenCalledTimes(1);
  });
  it('sorts within sections while keeping section headings and subtotal rows fixed', async () => {
    const user = userEvent.setup(); render(<Table><thead><tr><th>Name</th><th>Amount</th></tr></thead><tbody>
      <tr><td colSpan={2}>First section</td></tr><tr><td>Zebra</td><td>20</td></tr><tr><td>Apple</td><td>10</td></tr>
      <tr className="font-semibold"><td>Total</td><td>30</td></tr><tr><td colSpan={2}>Second section</td></tr><tr><td>Berry</td><td>5</td></tr>
    </tbody></Table>);
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(screen.getAllByRole('row').map(row => row.textContent)).toEqual(['NameAmount', 'First section', 'Apple10', 'Zebra20', 'Total30', 'Second section', 'Berry5']);
  });
  it('does not reorder editable line-item forms', () => {
    render(<Table><thead><tr><th>Quantity</th></tr></thead><tbody><tr><td><input aria-label="Quantity" type="number" defaultValue="5" /></td></tr></tbody></Table>);
    expect(screen.queryByRole('button', { name: 'Quantity' })).not.toBeInTheDocument();
  });
  it('announces empty search results', async () => {
    const user = userEvent.setup(); render(<Ledger />); await user.type(screen.getByRole('searchbox'), 'missing');
    expect(screen.getByText('No rows match your search.')).toBeInTheDocument();
  });
});
