import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "./page";
import {
  getPurchaseReview,
  getPurchaseDefault,
  savePurchaseReview,
  createPurchaseOrders,
} from "@/lib/api/procurement-flow";
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "request" }) }));
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) => selector({ user: {} }),
}));
vi.mock("@/lib/rbac/can", () => ({ can: () => true }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: any) => <main>{children}</main>,
}));
vi.mock("@/components/layout/page-header", () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));
vi.mock("@/components/ui/async-searchable-select", () => ({
  AsyncSearchableSelect: ({ placeholder, selectedOption, disabled }: any) => (
    <button disabled={disabled}>{selectedOption?.label || placeholder}</button>
  ),
}));
vi.mock("@/lib/api/procurement-flow", () => ({
  getPurchaseReview: vi.fn(),
  getPurchaseDefault: vi.fn(),
  savePurchaseReview: vi.fn(),
  createPurchaseOrders: vi.fn(),
  purchaseOptions: vi.fn(),
}));
const draft = () => ({
  request: {
    _id: "request",
    number: "PR-TEST",
    status: "DRAFT",
    currency: "KES",
    lines: [
      {
        lineId: "one",
        productId: "flour",
        description: "Flour",
        quantity: 10,
        unit: "KG",
      },
    ],
  },
  review: null,
  suppliers: [],
  taxes: [{ id: "vat", name: "VAT16", rate: 16 }],
});
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  vi.mocked(getPurchaseReview).mockResolvedValue(draft());
  vi.mocked(getPurchaseDefault).mockResolvedValue({
    supplierId: "supplier",
    supplierName: "Last supplier",
    unitPrice: 116,
    unit: "KG",
    currency: "KES",
    taxCodeId: "vat",
    linesAreTaxInclusive: true,
    sourceNumber: "BILL-OLD",
    date: "2026-10-01",
  });
});
it("loads supplier/price evidence but leaves item decisions pending until manual selection", async () => {
  render(<Page />);
  expect(
    await screen.findByRole("button", { name: "Last supplier" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Decision for item 1")).toHaveValue("PENDING");
  expect(screen.getByLabelText("Unit price for item 1")).toHaveValue(116);
  expect(screen.getByText(/BILL-OLD/)).toBeInTheDocument();
  expect(savePurchaseReview).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Create draft purchase orders" }),
  ).toBeDisabled();
});
it("saves only the user's manual quantity approval and retains last purchase tax basis", async () => {
  vi.mocked(savePurchaseReview).mockResolvedValue({
    revision: 1,
    lines: [],
    batches: [],
  });
  render(<Page />);
  await screen.findByRole("button", { name: "Last supplier" });
  fireEvent.change(screen.getByLabelText("Decision for item 1"), {
    target: { value: "APPROVED" },
  });
  fireEvent.change(screen.getByLabelText("Approved quantity for item 1"), {
    target: { value: "4" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save manual item review" }),
  );
  await waitFor(() =>
    expect(savePurchaseReview).toHaveBeenCalledWith("request", 0, [
      expect.objectContaining({
        approvedQuantity: 4,
        decision: "APPROVED",
        supplierId: "supplier",
        unitPrice: 116,
        linesAreTaxInclusive: true,
        taxCodeId: "vat",
      }),
    ]),
  );
});
it("orders only the approved remainder and freezes an already ordered line", async () => {
  const page: any = draft();
  page.request.status = "APPROVED";
  page.review = {
    revision: 2,
    lines: [
      {
        lineId: "one",
        productId: "flour",
        approvedQuantity: 4,
        orderedQuantity: 2,
        decision: "APPROVED",
        supplierId: "supplier",
        unitPrice: 116,
        unit: "KG",
        currency: "KES",
        linesAreTaxInclusive: true,
      },
    ],
    batches: [],
  };
  page.suppliers = [{ id: "supplier", name: "Last supplier" }];
  vi.mocked(getPurchaseReview).mockResolvedValue(page);
  vi.mocked(createPurchaseOrders).mockResolvedValue({ orderIds: ["po"] });
  render(<Page />);
  await screen.findByRole("button", { name: "Last supplier" });
  expect(screen.getByLabelText("Order quantity for item 1")).toHaveValue(2);
  expect(screen.getByLabelText("Decision for item 1")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Create draft purchase orders" }),
  );
  await waitFor(() =>
    expect(createPurchaseOrders).toHaveBeenCalledWith(
      "request",
      2,
      expect.any(String),
      [{ lineId: "one", quantity: 2 }],
    ),
  );
});
