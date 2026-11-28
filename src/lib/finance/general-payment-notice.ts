import type { FinanceAccount } from "@/lib/api/finance";
import type { BankAccountRow } from "@/lib/types/treasury";
import { chartAccountPostingNotice, postingAccountsHref } from "@/lib/inventory/posting-account-notice";

export const GENERAL_PAYMENTS_HREF = "/ap/general-payments";

const BANK_ACCOUNTS_HREF = "/treasury/bank-accounts";
const CHART_OF_ACCOUNTS_HREF = "/finance/chart-of-accounts";
const PERIOD_CLOSE_HREF = "/finance/period-close";
const FISCAL_YEARS_HREF = "/settings/financial/fiscal-years";
const SUPPLIER_PAYMENTS_HREF = "/ap/payments";

export type GuidedNotice = {
  title: string;
  message: string;
  href: string;
  label: string;
};

/** Only follow return links that stay inside the app. */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

export function withReturnTo(href: string, returnTo: string = GENERAL_PAYMENTS_HREF): string {
  return `${href}${href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`;
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const body = (error as { body?: { code?: unknown } }).body;
  const code = body && typeof body === "object" ? body.code : (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

const BY_CODE: Record<string, { title: string; href: string; label: string }> = {
  GP_PAID_FROM_MISSING: { title: "Paid-from account not found", href: BANK_ACCOUNTS_HREF, label: "Open Bank accounts" },
  GP_PAID_FROM_INACTIVE: { title: "Paid-from account is inactive", href: BANK_ACCOUNTS_HREF, label: "Open Bank accounts" },
  GP_PAID_FROM_NOT_LINKED: { title: "Paid-from account has no ledger account", href: BANK_ACCOUNTS_HREF, label: "Open Bank accounts" },
  GP_SAME_ACCOUNT: { title: "Choose a different cost account", href: CHART_OF_ACCOUNTS_HREF, label: "Open Chart of accounts" },
  GP_LEDGER_MISSING: { title: "Ledger account not found", href: CHART_OF_ACCOUNTS_HREF, label: "Open Chart of accounts" },
  GP_LEDGER_HEADER: { title: "That account is a header", href: CHART_OF_ACCOUNTS_HREF, label: "Open Chart of accounts" },
  GP_LEDGER_CONTROL: { title: "Use supplier or customer payments", href: SUPPLIER_PAYMENTS_HREF, label: "Open Supplier payments" },
  GP_PERIOD_CLOSED: { title: "That date is in a closed period", href: PERIOD_CLOSE_HREF, label: "Open Period close" },
  GP_PERIOD_MISSING: { title: "No open period for that date", href: FISCAL_YEARS_HREF, label: "Open Fiscal years" },
};

/**
 * Turn a failed save into what the user needs to know and where to fix it.
 * The server message already names the screen; the link opens it.
 */
export function generalPaymentNotice(error: unknown): GuidedNotice | null {
  const message = error instanceof Error ? error.message : "";
  const mapped = BY_CODE[errorCode(error)];
  if (mapped && message) return { ...mapped, message };
  const posting = chartAccountPostingNotice(error);
  if (posting) {
    return { title: "Posting accounts are not set", message: posting.message, href: postingAccountsHref(), label: "Open Posting accounts" };
  }
  return null;
}

/** Shown before saving when the chosen paid-from account cannot post to the books. */
export function paidFromNotLinkedNotice(name: string): GuidedNotice {
  return { ...BY_CODE.GP_PAID_FROM_NOT_LINKED!, message: `${name} is not linked to a ledger account, so the payment cannot be posted to your books. Open Treasury → Bank accounts, edit it and choose its ledger account (for example Petty Cash or the M-Pesa float), then come back.` };
}

export type SetupIssue = GuidedNotice & { key: string; severity: "error" | "warning" };

export const isLinkedCashBook = (bank: BankAccountRow): boolean => Boolean(bank.glAccountId);

/**
 * What must exist before a general payment can be recorded, said up front so the
 * user is not left to find out one failed save at a time.
 */
export function cashBookSetupIssues(params: { bankAccounts: BankAccountRow[]; accounts: FinanceAccount[] }): SetupIssue[] {
  const issues: SetupIssue[] = [];
  const active = params.bankAccounts.filter((bank) => bank.active);
  const unlinked = active.filter((bank) => !isLinkedCashBook(bank));
  if (!active.length) {
    issues.push({
      key: "no-cash-book",
      severity: "error",
      title: "No paid-from account yet",
      message:
        "General payments leave a cash book: a bank, petty cash, fuel float or M-Pesa account. Open Treasury → Bank accounts, add one and link it to its ledger account, then come back here.",
      href: BANK_ACCOUNTS_HREF,
      label: "Open Bank accounts",
    });
  } else if (unlinked.length) {
    const names = unlinked.slice(0, 3).map((bank) => bank.name).join(", ");
    const more = unlinked.length > 3 ? ` and ${unlinked.length - 3} more` : "";
    issues.push({
      key: "unlinked-cash-book",
      severity: active.length === unlinked.length ? "error" : "warning",
      title: unlinked.length === 1 ? "A paid-from account has no ledger account" : `${unlinked.length} paid-from accounts have no ledger account`,
      message: `${names}${more} can't be used until it is linked. Open Treasury → Bank accounts, edit it and choose its ledger account (for example Petty Cash).`,
      href: BANK_ACCOUNTS_HREF,
      label: "Link in Bank accounts",
    });
  }
  const hasExpense = params.accounts.some((account) => account.posts !== false && account.type === "EXPENSE");
  if (params.accounts.length && !hasExpense) {
    issues.push({
      key: "no-expense-account",
      severity: "warning",
      title: "No expense accounts to post to",
      message: "Payments post to a ledger account such as fuel, repairs or contractor fees. Open Finance → Chart of accounts and add the expense accounts you need.",
      href: CHART_OF_ACCOUNTS_HREF,
      label: "Open Chart of accounts",
    });
  }
  return issues;
}
