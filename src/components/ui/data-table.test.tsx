"use client";

import * as React from "react";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
