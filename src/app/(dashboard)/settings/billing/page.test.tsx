"use client";

import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import BillingPage from "./page";

const {
  fetchBillingCheckoutApiMock,
  fetchBillingInvoicesApiMock,
  fetchBillingPricingApiMock,
  confirmBillingCheckoutApiMock,
  cancelBillingCheckoutApiMock,
  removeBillingCheckoutItemApiMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  fetchBillingCheckoutApiMock: vi.fn(),
  fetchBillingInvoicesApiMock: vi.fn(),
  fetchBillingPricingApiMock: vi.fn(),
  confirmBillingCheckoutApiMock: vi.fn(),
  cancelBillingCheckoutApiMock: vi.fn(),
  removeBillingCheckoutItemApiMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/lib/api/billing", () => ({
  fetchBillingCheckoutApi: fetchBillingCheckoutApiMock,
  fetchBillingInvoicesApi: fetchBillingInvoicesApiMock,
  fetchBillingPricingApi: fetchBillingPricingApiMock,
  confirmBillingCheckoutApi: confirmBillingCheckoutApiMock,
  cancelBillingCheckoutApi: cancelBillingCheckoutApiMock,
  removeBillingCheckoutItemApi: removeBillingCheckoutItemApiMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe("Settings billing page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchBillingPricingApiMock.mockResolvedValue({
      standardPerUserPerMonth: 35,
      franchiseBasePerMonth: 50,
      franchiseIncludedLicenses: 2,
      franchiseAdditionalUserPerMonth: 25,
      copilotPerUserPerMonth: 5,
      annualDiscountPercent: 20,
    });
    fetchBillingInvoicesApiMock.mockResolvedValue([]);
    fetchBillingCheckoutApiMock
      .mockResolvedValueOnce({
        id: "checkout-1",
        status: "OPEN",
        items: [{ id: "item-1", itemType: "USER", label: "new.user@example.com", payload: {} }],
        quoteTotalCents: 2200,
        quoteLineItems: [{ description: "Standard users (1)", quantity: 1, unitPriceCents: 2200, amountCents: 2200, prorated: true }],
        projectedMonthlyCents: 5700,
        finalizedInvoiceId: null,
        liveUsage: {
          orgId: "org-1",
          periodStart: "2026-03-01",
          periodEnd: "2026-03-31",
          activeUserCount: 2,
          copilotEnabledCount: 0,
          franchiseCount: 0,
          includedSeatCount: 0,
          billableAdditionalUserCount: 0,
          standardUserCount: 2,
          isFranchiseBilling: false,
          pendingProrationCents: 0,
          projectedTotalCents: 7000,
          lineBreakdown: [{ description: "Standard users (2)", quantity: 2, unitPriceCents: 3500, amountCents: 7000, prorated: false }],
        },
        stagedUserCount: 1,
        stagedFranchiseCount: 0,
      })
      .mockResolvedValueOnce({
        id: null,
        status: "OPEN",
        items: [],
        quoteTotalCents: 0,
        quoteLineItems: [],
        projectedMonthlyCents: 7000,
        finalizedInvoiceId: null,
        liveUsage: {
          orgId: "org-1",
          periodStart: "2026-03-01",
          periodEnd: "2026-03-31",
          activeUserCount: 3,
          copilotEnabledCount: 0,
          franchiseCount: 0,
          includedSeatCount: 0,
          billableAdditionalUserCount: 0,
          standardUserCount: 3,
          isFranchiseBilling: false,
          pendingProrationCents: 2200,
          projectedTotalCents: 10500,
          lineBreakdown: [{ description: "Standard users (3)", quantity: 3, unitPriceCents: 3500, amountCents: 10500, prorated: false }],
        },
        stagedUserCount: 0,
        stagedFranchiseCount: 0,
      });
    confirmBillingCheckoutApiMock.mockResolvedValue({
      checkoutId: "checkout-1",
      invoiceId: "invoice-1",
      quoteTotalCents: 2200,
      lineItems: [],
    });
  });

  it("renders staged items and refreshes after checkout confirmation", async () => {
    const user = userEvent.setup();
    render(<BillingPage />);

    expect(await screen.findByText("Pending checkout")).toBeInTheDocument();
    expect(screen.getByText("new.user@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("$22.00").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /confirm checkout/i }));

    await waitFor(() => expect(confirmBillingCheckoutApiMock).toHaveBeenCalled());
    await waitFor(() => expect(fetchBillingCheckoutApiMock).toHaveBeenCalledTimes(2));
    expect(toastSuccessMock).toHaveBeenCalled();
  });
});
