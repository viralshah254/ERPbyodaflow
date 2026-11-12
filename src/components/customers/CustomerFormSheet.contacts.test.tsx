import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CustomerFormSheet } from "./CustomerFormSheet";
import { fetchPartyByIdApi, fetchPartyContactsApi, syncPartyContactsApi } from "@/lib/api/parties";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";

vi.mock("@/lib/api/parties", () => ({
  fetchPartyByIdApi: vi.fn(),
  fetchPartyContactsApi: vi.fn(),
  fetchSalesRepsApi: vi.fn().mockResolvedValue([]),
  updatePartyApi: vi.fn().mockResolvedValue({}),
  syncPartyContactsApi: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/api/payment-terms", () => ({ fetchPaymentTermsApi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/pricing", () => ({
  fetchPriceListOptions: vi.fn().mockResolvedValue([]),
  fetchTaxConfigsApi: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/components/location/LocationPickerField", () => ({ LocationPickerField: () => null }));
vi.mock("@/components/parties/KraTaxPinField", () => ({ KraTaxPinField: () => null }));

it.each([
  ["fmcg-manufacturer", "Heet Top Foods customer fixture"],
  ["seafood-distributor", "Seafood customer fixture"],
])("edits multiple contacts and saves billing choices on %s", async (template, name) => {
  vi.clearAllMocks();
  vi.mocked(fetchPartyByIdApi).mockResolvedValue({ id: "customer", name, roles: ["customer"] } as never);
  vi.mocked(fetchPartyContactsApi).mockResolvedValue([
    { id: "ap", partyId: "customer", name: "Accounts Payable", role: "Finance lead", email: "ap@example.test", isPrimary: true, isActive: true, billingEmail: true },
  ]);
  render(<CustomerFormSheet open onOpenChange={vi.fn()} customerId="customer" fmcg={isFmcgOrg(template)} />);
  expect(await screen.findByDisplayValue("Finance lead")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Use for billing emails" })).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Add contact" }));
  fireEvent.change(screen.getAllByLabelText(/Designation/)[1], { target: { value: "Billing assistant" } });
  fireEvent.change(screen.getAllByPlaceholderText("email@example.com")[1], { target: { value: "billing@example.test" } });
  fireEvent.click(screen.getAllByRole("checkbox", { name: "Use for billing emails" })[1]);
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(syncPartyContactsApi).toHaveBeenCalledWith("customer", [
    expect.objectContaining({ id: "ap", role: "Finance lead", billingEmail: true }),
    expect.objectContaining({ role: "Billing assistant", email: "billing@example.test", billingEmail: true }),
  ]));
});
