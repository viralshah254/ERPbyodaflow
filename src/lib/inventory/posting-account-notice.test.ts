import { describe, expect, it } from "vitest";
import { postingAccountNotice } from "./posting-account-notice";

describe("posting account notice", () => {
  it("names Work in progress and links to Posting accounts", () => {
    const notice = postingAccountNotice(new Error("Production valuation cannot post: missing_wip_or_inventory_account. Configure costs and posting accounts first."));
    expect(notice?.message).toContain("Work in progress is not set");
    expect(notice?.href).toBe("/settings/financial/posting-mappings");
  });
});
