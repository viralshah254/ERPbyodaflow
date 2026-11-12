import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";
import { fetchPartyByIdApi, fetchPartyContactsApi, fetchPartyCreditSummaryApi } from "@/lib/api/parties";
import { fetchArOpenPageApi } from "@/lib/api/payments";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "customer" }), useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (selector: any) => selector({ user: {} }) }));
const orgFixture = vi.hoisted(() => ({ templateId: "bakex" }));
vi.mock("@/stores/orgContextStore", () => ({ useOrgContext: () => orgFixture }));
vi.mock("@/lib/rbac/can", () => ({ can: () => true }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteFinance: () => true, useCanWriteSales: () => true }));
vi.mock("@/lib/org/useFinancialSettings", () => ({ useFinancialSettings: () => ({ settings: { baseCurrency: "KES" } }) }));
vi.mock("@/components/layout/page-shell", () => ({ PageShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ title, actions }: any) => <header><h1>{title}</h1>{actions}</header> }));
vi.mock("@/components/customers/CustomerCreditTab", () => ({ CustomerCreditTab: () => null }));
vi.mock("@/components/customers/CustomerVatWithholdingCard", () => ({ CustomerVatWithholdingCard: () => null }));
vi.mock("@/components/customers/CustomerLedger", () => ({ CustomerLedger: () => null }));
vi.mock("@/components/customers/CustomerFormSheet", () => ({ CustomerFormSheet: () => null }));
vi.mock("@/lib/api/parties", () => ({ fetchPartyByIdApi: vi.fn(), fetchPartyContactsApi: vi.fn().mockResolvedValue([]), fetchPartyCreditSummaryApi: vi.fn() }));
vi.mock("@/lib/api/payments", () => ({ fetchArOpenPageApi: vi.fn(), fetchArPaymentsPageApi: vi.fn() }));
vi.mock("@/lib/api/documents", () => ({ fetchDocumentListPageApi: vi.fn() }));
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); vi.mocked(fetchPartyByIdApi).mockResolvedValue({ id: "customer", name: "Synthetic customer", roles: ["customer"] } as never); vi.mocked(fetchArOpenPageApi).mockResolvedValue({ items: [], openCount: 267, outstandingTotal: 1000, hasMore: true }); });
it("renders the customer before slow finance data and never downloads hidden histories on Overview", async () => {
  vi.mocked(fetchPartyCreditSummaryApi).mockReturnValue(new Promise(() => {}));
  render(<Page />);
  await screen.findByRole("heading", { name: "Synthetic customer" });
  expect(await screen.findByText("267")).toBeInTheDocument();
  expect(screen.getByText("Loading…")).toBeInTheDocument();
  expect(fetchArOpenPageApi).toHaveBeenCalledWith("customer", { limit: 1, offset: 0 });
  expect(fetchDocumentListPageApi).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "New invoice" })).toHaveAttribute("href", "/docs/invoice/new?party=customer");
});
it("shows unavailable credit information explicitly rather than a zero balance", async () => {
  vi.mocked(fetchPartyCreditSummaryApi).mockResolvedValue(null);
  render(<Page />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Credit information is unavailable");
  expect(screen.queryByText("KES 0.00")).not.toBeInTheDocument();
});


it.each(["fmcg-manufacturer", "seafood-distributor"])("shows contact designations and billing selection for the %s customer fixture", async (template) => {
  orgFixture.templateId = template;
  vi.mocked(fetchPartyByIdApi).mockResolvedValue({ id: "customer", name: template === "fmcg-manufacturer" ? "Heet Top Foods test customer" : "Seafood distributor test customer", roles: ["customer"] } as never);
  vi.mocked(fetchPartyCreditSummaryApi).mockResolvedValue(null);
  vi.mocked(fetchPartyContactsApi).mockResolvedValue([
    { id: "billing", partyId: "customer", name: "Finance team", role: "Accounts payable", email: "accounts@example.test", isPrimary: true, isActive: true, billingEmail: true },
    { id: "store", partyId: "customer", name: "Receiving team", role: "Store manager", email: "stores@example.test", isPrimary: false, isActive: true },
  ]);
  render(<Page />);
  expect(await screen.findByText("Accounts payable")).toBeInTheDocument();
  expect(screen.getByText("Store manager")).toBeInTheDocument();
  expect(screen.getAllByText("Billing email")).toHaveLength(1);
});
