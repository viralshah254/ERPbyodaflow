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
  payIn: number;
  payOut: number;
  balance?: number;
  reference?: string;
  matchedId?: string | null;
  matchedDocumentId?: string | null;
  status: "PENDING" | "MATCHED";
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

export type BankReconOpenItemSuggestion = {
  id: string;
  number: string;
  date: string;
  partyId: string;
  partyName: string;
  outstanding: number;
  total: number;
  currency?: string;
  documentType: "invoice" | "bill";
  side: "AR" | "AP";
};
