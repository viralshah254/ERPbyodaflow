import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PurchaseOrderEmailPanel } from "./PurchaseOrderEmailPanel";
import { getPoDeliveries, sendPo } from "@/lib/api/procurement-flow";
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) => selector({ user: {} }),
}));
vi.mock("@/lib/rbac/can", () => ({ can: () => true }));
vi.mock("@/lib/api/procurement-flow", () => ({
  getPoDeliveries: vi.fn(),
  sendPo: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  vi.mocked(getPoDeliveries).mockResolvedValue({
    sourceHash: "a".repeat(64),
    jobs: [],
    supplier: { name: "Synthetic supplier", email: "supplier@example.test" },
    sender: "orders@example.test",
  });
  vi.mocked(sendPo).mockResolvedValue({});
});
it("requires explicit recipient/PDF review and uses the approve-send action, not automatic sending", async () => {
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(
    <PurchaseOrderEmailPanel
      id="po"
      status="PENDING_APPROVAL"
      onChanged={refresh}
    />,
  );
  const send = await screen.findByRole("button", {
    name: "Approve & send to supplier",
  });
  expect(send).toBeDisabled();
  expect(sendPo).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(send);
  await waitFor(() =>
    expect(sendPo).toHaveBeenCalledWith(
      "po",
      expect.any(String),
      true,
      undefined,
      expect.objectContaining({
        to: "supplier@example.test",
        sourceHash: "a".repeat(64),
      }),
    ),
  );
  expect(refresh).toHaveBeenCalled();
});
it("blocks sending when this company has not verified a sender", async () => {
  vi.mocked(getPoDeliveries).mockResolvedValue({
    sourceHash: "a".repeat(64),
    jobs: [],
    supplier: { name: "Supplier", email: "supplier@example.test" },
    sender: null,
  });
  render(
    <PurchaseOrderEmailPanel
      id="po"
      status="APPROVED"
      onChanged={async () => {}}
    />,
  );
  expect(
    await screen.findByRole("link", { name: "Set up company email" }),
  ).toHaveAttribute("href", "/settings/company-email");
  fireEvent.click(screen.getByRole("checkbox"));
  expect(
    screen.getByRole("button", { name: "Send to supplier" }),
  ).toBeDisabled();
});
it("does not offer another send after an uncertain provider outcome", async () => {
  vi.mocked(getPoDeliveries).mockResolvedValue({
    sourceHash: "a".repeat(64),
    jobs: [
      {
        _id: "job",
        status: "UNKNOWN",
        to: "supplier@example.test",
        fromEmail: "orders@example.test",
        createdAt: "2026-11-09",
      },
    ],
    supplier: { name: "Supplier", email: "supplier@example.test" },
    sender: "orders@example.test",
  });
  render(
    <PurchaseOrderEmailPanel
      id="po"
      status="APPROVED"
      onChanged={async () => {}}
    />,
  );
  expect(
    await screen.findByText(/Check SendGrid activity/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Send to supplier" }),
  ).not.toBeInTheDocument();
});
it("resends only after review and an explicit reason", async () => {
  vi.mocked(getPoDeliveries).mockResolvedValue({
    sourceHash: "a".repeat(64),
    jobs: [
      {
        _id: "job",
        status: "ACCEPTED",
        to: "supplier@example.test",
        fromEmail: "orders@example.test",
        createdAt: "2026-11-09",
      },
    ],
    supplier: { name: "Supplier", email: "changed@example.test" },
    sender: "orders@example.test",
  });
  render(
    <PurchaseOrderEmailPanel
      id="po"
      status="APPROVED"
      onChanged={async () => {}}
    />,
  );
  const resend = await screen.findByRole("button", {
    name: "Resend same approved PO",
  });
  expect(screen.getByText("To", { selector: "dt" }).nextElementSibling).toHaveTextContent("supplier@example.test");
  fireEvent.click(screen.getByRole("checkbox"));
  expect(resend).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Supplier requested another copy" },
  });
  fireEvent.click(resend);
  await waitFor(() =>
    expect(sendPo).toHaveBeenCalledWith(
      "po",
      expect.any(String),
      false,
      "Supplier requested another copy",
      expect.objectContaining({
        to: "supplier@example.test",
        sourceHash: "a".repeat(64),
      }),
    ),
  );
});
