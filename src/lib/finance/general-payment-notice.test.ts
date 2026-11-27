import { describe, expect, it } from "vitest";
import type { FinanceAccount } from "@/lib/api/finance";
import type { BankAccountRow } from "@/lib/types/treasury";
import { cashBookSetupIssues, generalPaymentNotice, safeReturnTo, withReturnTo } from "./general-payment-notice";

const bank = (patch: Partial<BankAccountRow>): BankAccountRow => ({
  id: "b1",
  name: "Petty cash",
  accountNumber: "PC",
  bank: "Cash",
  currency: "KES",
  active: true,
  glAccountId: "gl1",
  ...patch,
});
const account = (patch: Partial<FinanceAccount>): FinanceAccount => ({ id: "a1", code: "6100", name: "Fuel", type: "EXPENSE", ...patch });
const apiError = (code: string, message: string) => Object.assign(new Error(message), { body: { code, error: message } });

describe("general payment notice", () => {
  it("keeps the server message and links to where the fix is made", () => {
    const notice = generalPaymentNotice(apiError("GP_PAID_FROM_NOT_LINKED", "Petty cash is not linked to a ledger account."));
    expect(notice?.message).toBe("Petty cash is not linked to a ledger account.");
    expect(notice?.href).toBe("/treasury/bank-accounts");
    expect(notice?.label).toBe("Open Bank accounts");
  });

  it("sends a closed period to Period close and a missing period to Fiscal years", () => {
    expect(generalPaymentNotice(apiError("GP_PERIOD_CLOSED", "closed"))?.href).toBe("/finance/period-close");
    expect(generalPaymentNotice(apiError("GP_PERIOD_MISSING", "none"))?.href).toBe("/settings/financial/fiscal-years");
  });

  it("sends header accounts to the chart of accounts and control accounts to supplier payments", () => {
    expect(generalPaymentNotice(apiError("GP_LEDGER_HEADER", "header"))?.href).toBe("/finance/chart-of-accounts");
    expect(generalPaymentNotice(apiError("GP_LEDGER_CONTROL", "control"))?.href).toBe("/ap/payments");
  });

  it("reuses the posting accounts link for unmapped posting roles", () => {
    const notice = generalPaymentNotice(apiError("POSTING_ACCOUNT", "Open Settings → Financial → Posting accounts, choose Accounts payable, save, then post again."));
    expect(notice?.href).toBe("/settings/financial/posting-mappings");
  });

  it("has nothing to add for ordinary field errors", () => {
    expect(generalPaymentNotice(new Error("Enter the cheque number."))).toBeNull();
  });

  it("says what is missing before the first save", () => {
    expect(cashBookSetupIssues({ bankAccounts: [], accounts: [account({})] }).map((i) => i.key)).toEqual(["no-cash-book"]);
    const unlinked = cashBookSetupIssues({ bankAccounts: [bank({ glAccountId: undefined })], accounts: [account({})] });
    expect(unlinked[0]).toMatchObject({ key: "unlinked-cash-book", severity: "error", href: "/treasury/bank-accounts" });
    expect(unlinked[0]!.message).toContain("Petty cash");
    const partial = cashBookSetupIssues({ bankAccounts: [bank({}), bank({ id: "b2", name: "Float", glAccountId: undefined })], accounts: [account({})] });
    expect(partial[0]?.severity).toBe("warning");
    expect(cashBookSetupIssues({ bankAccounts: [bank({})], accounts: [account({ type: "ASSET" })] }).map((i) => i.key)).toEqual(["no-expense-account"]);
    expect(cashBookSetupIssues({ bankAccounts: [bank({})], accounts: [account({})] })).toEqual([]);
  });

  it("only follows return links inside the app", () => {
    expect(safeReturnTo("/ap/general-payments")).toBe("/ap/general-payments");
    expect(safeReturnTo("https://evil.example")).toBeNull();
    expect(safeReturnTo("//evil.example")).toBeNull();
    expect(withReturnTo("/treasury/bank-accounts")).toBe("/treasury/bank-accounts?returnTo=%2Fap%2Fgeneral-payments");
  });
});
