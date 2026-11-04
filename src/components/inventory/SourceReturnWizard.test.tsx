import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), create: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("@/lib/api/documents", () => ({ fetchDocumentListApi: state.list, fetchDocumentDetailApi: state.detail, createDocumentApi: state.create }));
vi.mock("@/lib/api/lookups", () => ({ fetchWarehouseOptions: async () => [{id:"a",label:"Main"}] }));
vi.mock("@/stores/auth-store", () => ({useAuthStore: (select: (s: unknown) => unknown) => select({org:{orgId:"org"}})}));
import { SourceReturnWizard } from "./SourceReturnWizard";
beforeEach(() => { vi.clearAllMocks(); state.list.mockResolvedValue([{id:"invoice",number:"INV-1",party:"Customer",date:"2026-11-01"}]); state.detail.mockResolvedValue({id:"invoice",type:"invoice",number:"INV-1",status:"POSTED",partyId:"customer",branchId:"branch",currency:"KES",lines:[{id:"original",productId:"sku",description:"Flour",qty:10,unit:"BOX",amount:1160,tax:160,taxCodeId:"vat",unitPrice:116}]}); state.create.mockResolvedValue({id:"return"}); });
afterEach(cleanup);
describe("source-led physical returns", () => {
 it("creates a draft with exact original line, proportional VAT and no direct post", async () => {
  render(<SourceReturnWizard/>); fireEvent.click(screen.getByRole("button",{name:"Create customer return"})); fireEvent.click(await screen.findByRole("button",{name:/INV-1/}));
  fireEvent.change(await screen.findByLabelText("Return quantity Flour"),{target:{value:"2"}});
  fireEvent.change(screen.getByLabelText("Warehouse branch for quarantine routing"),{target:{value:"a"}});
  fireEvent.change(screen.getByLabelText("Return reason"),{target:{value:"Damaged original goods"}});
  fireEvent.click(screen.getByRole("button",{name:"Create draft and open review"}));
  await waitFor(() => expect(state.create).toHaveBeenCalledWith("credit-note",expect.objectContaining({sourceDocumentId:"invoice",sourceDocumentType:"invoice",adjustmentEffect:"PHYSICAL_RETURN",total:232,tax:32,lines:[expect.objectContaining({sourceLineId:"original",productId:"sku",quantity:2,unit:"BOX",amount:232,tax:32})]})));
  expect(state.push).toHaveBeenCalledWith("/docs/credit-note/return");
 });
 it("refuses excessive quantities before creating a supplier return", async () => {
  render(<SourceReturnWizard supplier/>); fireEvent.click(screen.getByRole("button",{name:"Create supplier return"})); fireEvent.click(await screen.findByRole("button",{name:/INV-1/}));
  fireEvent.change(await screen.findByLabelText("Return quantity Flour"),{target:{value:"11"}}); fireEvent.change(screen.getByLabelText("Warehouse to issue from"),{target:{value:"a"}}); fireEvent.change(screen.getByLabelText("Return reason"),{target:{value:"Damaged original goods"}});fireEvent.click(screen.getByRole("button",{name:"Create draft and open review"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("valid quantity"); expect(state.create).not.toHaveBeenCalled();
 });
});
