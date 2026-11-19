import { describe, expect, it } from "vitest";
import { orderReceiptCustomers, type ReceiptCustomerRow } from "./receipt-customers";

function row(
  label: string,
  outstandingBalance: number,
  nextDueDate: string | null,
): ReceiptCustomerRow {
  return { id: label, label, outstandingBalance, nextDueDate };
}

describe("orderReceiptCustomers", () => {
  const customers = [
    row("Naivas Limited", 10000, "2026-11-20"),
    row("Aggie Kayy", 1500, "2026-11-12"),
    row("Abdi Ewaso", 9000, "2026-11-12"),
    row("Paid Up Shop", 0, null),
  ];

  it("lists unpaid customers with the soonest due date first, then the larger balance", () => {
    expect(orderReceiptCustomers(customers, "").map((customer) => customer.label)).toEqual([
      "Abdi Ewaso",
      "Aggie Kayy",
      "Naivas Limited",
    ]);
  });

  it("puts a customer with no due date after dated balances of the same size order", () => {
    const undated = row("Walk In", 20000, null);
    expect(orderReceiptCustomers([...customers, undated], "")[3]?.label).toBe("Walk In");
  });

  it("keeps a paid-up customer at the top when the clerk types their name", () => {
    expect(orderReceiptCustomers(customers, "Paid Up")[0]?.label).toBe("Paid Up Shop");
  });
});
