import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "./page";
import { fetchApprovalPolicyApi, saveApprovalPolicyApi } from "@/lib/api/approval-policy";
import { fetchUsersApi } from "@/lib/api/users-roles";
vi.mock("@/lib/api/approval-policy", () => ({ fetchApprovalPolicyApi: vi.fn(), saveApprovalPolicyApi: vi.fn() }));
vi.mock("@/lib/api/users-roles", () => ({ fetchUsersApi: vi.fn() }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ actions }: any) => <header>{actions}</header> }));
vi.mock("@/components/layout/page-shell", () => ({ PageShell: ({ children }: any) => <main>{children}</main> }));
beforeEach(() => { vi.resetAllMocks(); vi.mocked(fetchUsersApi).mockResolvedValue([]); });
it("blocks editing and saving until the existing policy loads", async () => {
  let resolve!: (value: any) => void;
  vi.mocked(fetchApprovalPolicyApi).mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<Page />);
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Add rule" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(saveApprovalPolicyApi).not.toHaveBeenCalled();
  resolve({ version: 7, rules: [] });
  await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
  expect(screen.getByText("Rules · version 7")).toBeInTheDocument();
});
it("keeps failed loads blocked and lets the user retry the authoritative data", async () => {
  vi.mocked(fetchApprovalPolicyApi).mockRejectedValueOnce(new Error("Connection unavailable")).mockResolvedValueOnce({ version: 8, rules: [] } as never);
  render(<Page />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Changes cannot be saved");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(saveApprovalPolicyApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retry loading policy" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
});
it("does not treat unavailable approver data as an empty editable user list", async () => {
  vi.mocked(fetchApprovalPolicyApi).mockResolvedValue({ version: 7, rules: [] } as never);
  vi.mocked(fetchUsersApi).mockRejectedValue(new Error("User list unavailable"));
  render(<Page />);
  expect(await screen.findByRole("alert")).toHaveTextContent("User list unavailable");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
