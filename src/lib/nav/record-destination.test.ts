import { describe, expect, it } from "vitest";
import { isRecordListHref, recordHref } from "@/lib/nav/record-destination";

describe("record destinations", () => {
  it("opens a product and a customer instead of their lists", () => {
    expect(recordHref("product", "sku-951", "/master/products")).toBe("/master/products/sku-951");
    expect(recordHref("customer", "cust 1", "/master/parties")).toBe("/sales/customers/cust%201");
  });

  it("treats the catalogue and customer directory as lists", () => {
    expect(isRecordListHref("/master/products")).toBe(true);
    expect(isRecordListHref("/master/products/")).toBe(true);
    expect(isRecordListHref("/sales/customers?new=1")).toBe(true);
    expect(isRecordListHref("/master/products/sku-951")).toBe(false);
  });
});
