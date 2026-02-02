/**
 * Mock data for /treasury/bank-accounts.
 */

export interface BankAccountRow {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
  branch?: string;
  currency: string;
  glAccountCode?: string;
  glAccountName?: string;
  active: boolean;
}

export const MOCK_BANK_ACCOUNTS: BankAccountRow[] = [
  {
    id: "ba1",
    name: "Operating KES",
    accountNumber: "***1234",
    bank: "KCB",
    branch: "Nairobi Main",
    currency: "KES",
    glAccountCode: "1120",
    glAccountName: "Main Bank",
    active: true,
  },
  {
    id: "ba2",
    name: "Payroll KES",
    accountNumber: "***5678",
    bank: "Equity",
    branch: "Westlands",
    currency: "KES",
    glAccountCode: "1121",
    glAccountName: "Payroll Account",
    active: true,
  },
];

export function getMockBankAccounts(): BankAccountRow[] {
  return [...MOCK_BANK_ACCOUNTS];
}
