import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { BusinessTitlePicker, useBusinessTitles } from "./BusinessTitlePicker";

const scope = vi.hoisted(() => ({ orgId: "business-a" }));
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (select: (state: { org: typeof scope }) => unknown) => select({ org: scope }),
}));
vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));

function Form({ kind }: { kind: "customer-designations" | "employee-job-titles" }) {
  const [value, setValue] = React.useState("Existing local title");
  const catalogue = useBusinessTitles(kind);
  return <BusinessTitlePicker id="title" kind={kind} value={value} onChange={setValue} catalogue={catalogue} />;
}

it.each([
  ["customer-designations", "designation"],
  ["employee-job-titles", "job title"],
] as const)("preserves an existing value and persists a searched custom option in %s", async (kind, label) => {
  vi.mocked(apiRequest).mockReset().mockResolvedValueOnce({ items: ["Warehouse Accounts"] }).mockResolvedValueOnce({ label: "Dispatch Accountant" });
  render(<Form kind={kind} />);
  const picker = screen.getByRole("combobox");
  expect(picker).toHaveTextContent("Existing local title");
  fireEvent.click(picker);
  const search = screen.getByPlaceholderText(`Search or add ${label}…`);
  fireEvent.change(search, { target: { value: "warehouse accounts" } });
  expect(await screen.findByRole("button", { name: "Warehouse Accounts" })).toBeVisible();
  fireEvent.change(search, { target: { value: "Dispatch Accountant" } });
  fireEvent.click(screen.getByRole("button", { name: `Add ${label} “Dispatch Accountant”` }));
  await waitFor(() => expect(picker).toHaveTextContent("Dispatch Accountant"));
  expect(apiRequest).toHaveBeenCalledWith(`/api/settings/${kind}`, { method: "POST", body: { label: "Dispatch Accountant" } });
});
