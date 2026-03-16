export type ReconcileSession = {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  statementCurrency: string;
  baseCurrency: string;
  status: "OPEN" | "RECONCILED";
};

export type BankStatementLine = {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  matchedId?: string | null;
  currency?: string;
};

export type SystemTransaction = {
  id: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  matchedId?: string | null;
};
