"use client";

import * as React from "react";
import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AsyncSearchableSelect,
  type AsyncSearchableSelectOption,
} from "./async-searchable-select";

function Harness({
  loadOptions,
  recentStorageKey,
}: {
  loadOptions: (query: string) => Promise<AsyncSearchableSelectOption[]>;
  recentStorageKey?: string;
}) {
  const [value, setValue] = React.useState("");
  const [selectedOption, setSelectedOption] = React.useState<AsyncSearchableSelectOption | null>(null);

  return (
    <AsyncSearchableSelect
      value={value}
      onValueChange={setValue}
      onOptionSelect={setSelectedOption}
      selectedOption={selectedOption}
      loadOptions={loadOptions}
      placeholder="Select customer"
      searchPlaceholder="Search customer"
      recentStorageKey={recentStorageKey}
    />
  );
}

describe("AsyncSearchableSelect", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("supports keyboard navigation and enter selection", async () => {
    const user = userEvent.setup();
    const options: AsyncSearchableSelectOption[] = [
      { id: "cust-1", label: "Acme Retail", description: "ACM001" },
      { id: "cust-2", label: "Beta Wholesale", description: "BET002" },
    ];
    const loadOptions = vi.fn(async () => options);

    render(<Harness loadOptions={loadOptions} />);

    await user.click(screen.getByRole("button", { name: /select customer/i }));
    const input = await screen.findByPlaceholderText("Search customer");

    await waitFor(() => expect(loadOptions).toHaveBeenCalled());
    await user.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /beta wholesale/i })).toBeInTheDocument();
    });
  });

  it("persists and shows recent selections", async () => {
    const user = userEvent.setup();
    const options: AsyncSearchableSelectOption[] = [
      { id: "cust-1", label: "Acme Retail", description: "ACM001" },
    ];
    const loadOptions = vi.fn(async () => options);

    render(<Harness loadOptions={loadOptions} recentStorageKey="lookup:test-customers" />);

    await user.click(screen.getByRole("button", { name: /select customer/i }));
    await screen.findByPlaceholderText("Search customer");
    await waitFor(() => expect(loadOptions).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /acme retail/i }));

    await user.click(screen.getByRole("button", { name: /acme retail/i }));

    expect(await screen.findByText("Recent")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Retail").length).toBeGreaterThan(0);
  });

  it("renders result badges", async () => {
    const user = userEvent.setup();
    const options: AsyncSearchableSelectOption[] = [
      {
        id: "cust-1",
        label: "Acme Retail",
        description: "ACM001 · 0712345678",
        badges: [
          { label: "Retailer", variant: "secondary" },
          { label: "Over credit", variant: "destructive" },
        ],
      },
    ];

    render(<Harness loadOptions={async () => options} />);

    await user.click(screen.getByRole("button", { name: /select customer/i }));
    await screen.findByPlaceholderText("Search customer");

    expect(await screen.findByText("Retailer")).toBeInTheDocument();
    expect(screen.getByText("Over credit")).toBeInTheDocument();
  });
});
