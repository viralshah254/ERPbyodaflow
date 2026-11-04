import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest: mocks.request }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ org: { orgId: "synthetic" }, user: { userId: "maker" }, permissions: ["manufacturing.bom.read", "manufacturing.write", "manufacturing.production.approve"] }) }));
vi.mock("@/components/layout/page-layout", () => ({ PageLayout: ({ title, children }: { title: string; children: React.ReactNode }) => <main className="mx-auto min-h-screen max-w-[1500px] bg-background p-4 text-foreground sm:p-6"><p className="mb-2 text-xs text-muted-foreground">SYNTHETIC QA PREVIEW · NO CLIENT DATA</p><h1 className="mb-5 text-2xl font-semibold">{title}</h1>{children}</main> }));
import Page from "./page";
beforeEach(() => { vi.clearAllMocks(); mocks.request.mockResolvedValue({ contract: "recipe-governance-v1", recipes: [{ id: "effective", code: "BOM-001", name: "Queen cakes · approved", version: "1", lifecycle: "EFFECTIVE", isActive: true }, { id: "draft", code: "BOM-002", name: "Queen cakes · new formula", version: "2", lifecycle: "DRAFT", isActive: false }], requests: [{ _id: "case", subjectId: "draft", kind: "RECIPE_RELEASE", digest: "frozen-proposal", sourceDigest: "frozen-source", state: "PENDING", proposedBy: "maker", reason: "Updated flour specification and revised yield trial", evidenceReference: "Synthetic trial report 42", payload: { recipe: { name: "Queen cakes", quantity: 100, uom: "EA", items: [{ product: "Flour", quantity: 12, uom: "KG", warehouse: "Raw materials" }, { product: "Sugar", quantity: 4, uom: "KG", warehouse: "Raw materials" }] }, retires: [{ code: "BOM-001", version: "1" }] }, createdAt: "2026-11-01T08:00:00Z" }], hasMore: false, recipesHasMore: false }); });
afterEach(cleanup);
it("offers only draft revisions for release and keeps the preparer from approving", async () => {
  const view = render(<Page/>);
  await screen.findByText("Recipe revisions");
  expect(screen.getByRole("combobox", { name: "Draft recipe" })).toHaveTextContent("BOM-002");
  expect(screen.getByRole("combobox", { name: "Draft recipe" })).not.toHaveTextContent("BOM-001");
  fireEvent.click(screen.getByRole("button", { name: /Awaiting independent review/ }));
  expect(screen.queryByRole("button", { name: "Confirm independent review" })).not.toBeInTheDocument();
  expect(mocks.request).toHaveBeenCalledTimes(1);
  if (process.env.ERP_UI_EVIDENCE === "1") { mkdirSync("/private/tmp/erp-wave2-ui", { recursive: true }); writeFileSync("/private/tmp/erp-wave2-ui/recipes.html", `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="styles.css"></head><body>${view.container.innerHTML}</body></html>`); }
});
it("shows backend incompatibility instead of an apparently empty recipe queue", async () => {
  mocks.request.mockResolvedValue({ recipes: [], requests: [] }); render(<Page/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("updated backend");
  expect(screen.queryByText("No recipes yet.")).not.toBeInTheDocument();
});
