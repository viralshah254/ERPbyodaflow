"use client";

import * as React from "react";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableSortState } from "./data-table";

type Row = { id: string; name: string; barcode: string };

const rows: Row[] = [
  { id: "1", name: "Zebra", barcode: "900" },
  { id: "2", name: "Apple", barcode: "100" },
];

const columns = [
  { id: "name", header: "Name", accessor: "name" as const, sortable: true },
  {
    id: "barcode",
    header: "Barcode",
    accessor: "barcode" as const,
    sortable: true,
    sortValue: (r: Row) => r.barcode,
  },
];

function ControlledTable({
  disableClientSort,
}: {
  disableClientSort?: boolean;
}) {
  const [sort, setSort] = React.useState<DataTableSortState>(null);
  return (
    <DataTable
      data={rows}
      columns={columns}
      sort={sort}
      onSortChange={setSort}
      disableClientSort={disableClientSort}
    />
  );
}

describe("DataTable sort", () => {
  it("reorders the current rows when client sort is on", async () => {
    const user = userEvent.setup();
    render(<DataTable data={rows} columns={columns} />);
    await user.click(screen.getByRole("button", { name: /barcode/i }));
    const cells = screen.getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["Apple", "100", "Zebra", "900"]);
  });

  it("keeps server order when disableClientSort is set", async () => {
    const user = userEvent.setup();
    render(<ControlledTable disableClientSort />);
    await user.click(screen.getByRole("button", { name: /barcode/i }));
    const cells = screen.getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["Zebra", "900", "Apple", "100"]);
  });
});

it('searches formatted columns and sorts their underlying numeric values', async () => {
  const user = userEvent.setup();
  render(<DataTable data={[{ id: 'a', amount: 1000 }, { id: 'b', amount: 25 }]} columns={[{ id: 'amount', header: 'Amount', accessor: row => <span>KES {row.amount.toLocaleString()}</span> }]} />);
  await user.click(screen.getByRole('button', { name: 'Amount' }));
  expect(screen.getAllByRole('cell').map(cell => cell.textContent)).toEqual(['KES 25', 'KES 1,000']);
  await user.type(screen.getByRole('searchbox'), '1,000');
  expect(screen.getAllByRole('cell').map(cell => cell.textContent)).toEqual(['KES 1,000']);
});
it('sorts the complete loaded list before applying client pagination', async () => {
  const user = userEvent.setup();
  const all = [{ id: '1', name: 'Zebra' }, { id: '2', name: 'Berry' }, { id: '3', name: 'Apple' }];
  render(<DataTable data={all.slice(0, 2)} allData={all} pageSize={2} columns={[{ id: 'name', header: 'Name', accessor: 'name' }]} />);
  await user.click(screen.getByRole('button', { name: 'Name' }));
  expect(screen.getAllByRole('cell').map(cell => cell.textContent)).toEqual(['Apple', 'Berry']);
  expect(all.map(row => row.name)).toEqual(['Zebra', 'Berry', 'Apple']);
});
it('keeps selection outside the current search when toggling visible rows', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DataTable data={rows} columns={columns} selectable selectedIds={['hidden']} onSelectionChange={onChange} />);
  await user.type(screen.getByRole('searchbox'), 'Apple');
  await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
  expect(onChange).toHaveBeenCalledWith(['hidden', '2']);
});
