import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "./page";
import { apiRequest } from "@/lib/api/client";
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) => selector({ user: { orgId: "own" } }),
}));
vi.mock("@/lib/rbac/can", () => ({ can: () => true }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: any) => <main>{children}</main>,
}));
vi.mock("@/components/layout/page-header", () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));
vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
const settings = {
  revision: 1,
  mode: "OWN_ACCOUNT",
  fromEmail: "orders@example.test",
  fromName: "Company",
  replyTo: "buyer@example.test",
  webhookKey: "",
  verified: true,
  enabled: true,
  configured: true,
  encryptionConfigured: true,
  dnsName: "_odaflow-email.example.test",
  dnsValue: "odaflow-verification=proof",
};
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  vi.mocked(apiRequest).mockResolvedValue(settings);
});
it("never loads an API key into the form and disables verification while unsaved", async () => {
  render(<Page />);
  await screen.findByText(/Enabled \/ domain verified/);
  const key = screen.getByLabelText(/SendGrid API key/);
  expect(key).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Company sender name"), {
    target: { value: "Changed company" },
  });
  expect(
    screen.getByRole("button", { name: "Verify domain and enable sending" }),
  ).toBeDisabled();
  expect(
    screen.getByText(/Disabled until saved and verified/),
  ).toBeInTheDocument();
});
it("clears the entered key after saving and shows the company-specific DNS record", async () => {
  vi.mocked(apiRequest).mockImplementation(async (_path, options: any) =>
    options?.method === "PUT"
      ? { ...settings, revision: 2, verified: false, enabled: false }
      : settings,
  );
  render(<Page />);
  const key = await screen.findByLabelText(/SendGrid API key/);
  fireEvent.change(key, { target: { value: "SG.synthetic-test-key" } });
  fireEvent.click(screen.getByRole("button", { name: "Save sender settings" }));
  await screen.findByText(/Saved. Verify the domain/);
  expect(key).toHaveValue("");
  expect(
    screen.getByText(/Name: _odaflow-email.example.test/),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/settings/company-email",
      expect.objectContaining({
        method: "PUT",
        body: expect.objectContaining({
          apiKey: "SG.synthetic-test-key",
          revision: 1,
        }),
      }),
    ),
  );
});
