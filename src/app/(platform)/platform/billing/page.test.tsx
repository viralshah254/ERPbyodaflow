"use client";

import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformBillingPage from "./page";

const {
  fetchPlatformBillingCheckoutsApiMock,
  fetchPlatformInvoicesApiMock,
  fetchPlatformBillingSummaryApiMock,
  fetchPlatformProvisioningCheckoutApiMock,
  removePlatformProvisioningCheckoutItemApiMock,
  cancelPlatformProvisioningCheckoutApiMock,
  confirmPlatformProvisioningCheckoutApiMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  fetchPlatformBillingCheckoutsApiMock: vi.fn(),
  fetchPlatformInvoicesApiMock: vi.fn(),
  fetchPlatformBillingSummaryApiMock: vi.fn(),
  fetchPlatformProvisioningCheckoutApiMock: vi.fn(),
  removePlatformProvisioningCheckoutItemApiMock: vi.fn(),
  cancelPlatformProvisioningCheckoutApiMock: vi.fn(),
  confirmPlatformProvisioningCheckoutApiMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api/platform", () => ({
  fetchPlatformBillingCheckoutsApi: fetchPlatformBillingCheckoutsApiMock,
  fetchPlatformInvoicesApi: fetchPlatformInvoicesApiMock,
  fetchPlatformBillingSummaryApi: fetchPlatformBillingSummaryApiMock,
  fetchPlatformProvisioningCheckoutApi: fetchPlatformProvisioningCheckoutApiMock,
  removePlatformProvisioningCheckoutItemApi: removePlatformProvisioningCheckoutItemApiMock,
  cancelPlatformProvisioningCheckoutApi: cancelPlatformProvisioningCheckoutApiMock,
  confirmPlatformProvisioningCheckoutApi: confirmPlatformProvisioningCheckoutApiMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe("Platform billing page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPlatformBillingCheckoutsApiMock.mockResolvedValue([]);
    fetchPlatformInvoicesApiMock.mockResolvedValue([]);
    fetchPlatformBillingSummaryApiMock.mockResolvedValue({
      activeSubscriptions: 3,
      mrrCents: 105000,
      revenueCents: 450000,
      paidInvoicesCount: 8,
    });
    fetchPlatformProvisioningCheckoutApiMock
      .mockResolvedValueOnce({
        id: "platform-checkout-1",
        status: "OPEN",
        items: [
          { id: "customer-1", itemType: "CUSTOMER_PROVISION", label: "Acme Owner / Acme HQ", payload: {} },
        ],
        quoteTotalCents: 2032,
        quoteLineItems: [
          {
            description: "Initial user seat · Acme HQ",
            quantity: 1,
            unitPriceCents: 2032,
            amountCents: 2032,
            prorated: true,
          },
        ],
        finalizedInvoices: [],
        stagedCustomerCount: 1,
        stagedOrgCount: 0,
      })
      .mockResolvedValueOnce({
        id: null,
        status: "OPEN",
        items: [],
        quoteTotalCents: 0,
        quoteLineItems: [],
        finalizedInvoices: [],
        stagedCustomerCount: 0,
        stagedOrgCount: 0,
      });
    confirmPlatformProvisioningCheckoutApiMock.mockResolvedValue({
      checkoutId: "platform-checkout-1",
      quoteTotalCents: 2032,
      lineItems: [],
      createdCustomers: [
        {
          tenantId: "tenant-1",
          orgId: "org-1",
          branchId: "branch-1",
          roleId: "role-1",
          userId: "user-1",
          adminEmail: "owner@acme.com",
          initialPassword: "Secret123!",
          mustChangePassword: true,
        },
      ],
      createdOrgs: [{ id: "org-extra-1", tenantId: "tenant-1", name: "Acme Franchise West" }],
      finalizedInvoices: [{ tenantId: "tenant-1", orgId: "org-1", invoiceId: "invoice-1", totalCents: 2032 }],
    });
  });

  it("renders staged provisioning items and refreshes after confirmation", async () => {
    const user = userEvent.setup();
    render(<PlatformBillingPage />);

    expect(await screen.findByText("Platform provisioning checkout")).toBeInTheDocument();
    expect(screen.getByText("Acme Owner / Acme HQ")).toBeInTheDocument();
    expect(screen.getAllByText("$20.32").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /confirm platform checkout/i }));

    await waitFor(() => expect(confirmPlatformProvisioningCheckoutApiMock).toHaveBeenCalled());
    await waitFor(() => expect(fetchPlatformProvisioningCheckoutApiMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Latest activation receipt")).toBeInTheDocument();
    expect(screen.getByText("owner@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Secret123!")).toBeInTheDocument();
    expect(screen.getByText("Acme Franchise West")).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalled();
  });
});
