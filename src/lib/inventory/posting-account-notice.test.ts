import { describe, expect, it } from "vitest";
import { chartAccountPostingNotice, postingAccountNotice, postingAccountsHref } from "./posting-account-notice";

describe("posting account notice", () => {
  it("names Work in progress and links to Posting accounts", () => {
    const notice = postingAccountNotice(new Error("Production valuation cannot post: missing_wip_or_inventory_account. Configure costs and posting accounts first."));
    expect(notice?.message).toContain("Work in progress is not set");
    expect(notice?.href).toBe("/settings/financial/posting-mappings");
  });

  it("keeps the goods-receipt explanation and links back to the receipt", () => {
    const notice = chartAccountPostingNotice(new Error("Goods Received Not Invoiced cannot use account 2200 · Sundry creditors, because that account is an expense account. Open Settings → Financial → Posting accounts, set Goods Received Not Invoiced, save, then post again."));
    expect(notice?.message).toContain("account 2200");
    expect(notice?.href).toBe("/settings/financial/posting-mappings");
    expect(postingAccountsHref("/inventory/receipts/grn-1")).toBe("/settings/financial/posting-mappings?returnTo=%2Finventory%2Freceipts%2Fgrn-1");
  });
});
