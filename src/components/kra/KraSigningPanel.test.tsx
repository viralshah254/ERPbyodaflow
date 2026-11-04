import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/kra-integration", () => ({ retryKraDocumentApi: vi.fn() }));
import { KraSigningPanel } from "./KraSigningPanel";
afterEach(cleanup);
describe("fiscal recovery guidance", () => {
  it("shows a signed-but-unposted invoice and never offers to sign it again", () => {
    render(<KraSigningPanel typeKey="invoice" documentId="synthetic" documentStatus="DRAFT" canRetry kraSigning={{ status: "signed", provider: "incotex", cuInvoiceNumber: "SYNTHETIC" }} />);
    expect(screen.getByText("Signed · ledger posting needs recovery")).toBeInTheDocument();
    expect(screen.getByText(/Keep its values frozen/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC")).toBeInTheDocument();
  });
  it("does not expose the posted-only signing retry for an unposted failed document", () => {
    render(<KraSigningPanel typeKey="credit-note" documentId="synthetic" documentStatus="DRAFT" canRetry kraSigning={{ status: "failed", errorMessage: "Provider timeout" }} />);
    expect(screen.getAllByText("Provider timeout").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
