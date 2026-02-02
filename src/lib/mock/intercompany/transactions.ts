/**
 * Mock intercompany transactions (IC invoice, IC bill).
 */

export type ICTransactionType = "IC_INVOICE" | "IC_BILL";

export interface ICTransactionRow {
  id: string;
  type: ICTransactionType;
  number: string;
  date: string;
  fromEntityId: string;
  fromEntityName: string;
  toEntityId: string;
  toEntityName: string;
  amount: number;
  currency: string;
  status: "DRAFT" | "POSTED";
}

export const MOCK_IC_TRANSACTIONS: ICTransactionRow[] = [
  {
    id: "ic1",
    type: "IC_INVOICE",
    number: "IC-INV-001",
    date: "2025-01-15",
    fromEntityId: "e1",
    fromEntityName: "OdaFlow Kenya",
    toEntityId: "e2",
    toEntityName: "OdaFlow Uganda",
    amount: 150000,
    currency: "KES",
    status: "POSTED",
  },
  {
    id: "ic2",
    type: "IC_BILL",
    number: "IC-BILL-001",
    date: "2025-01-20",
    fromEntityId: "e2",
    fromEntityName: "OdaFlow Uganda",
    toEntityId: "e1",
    toEntityName: "OdaFlow Kenya",
    amount: 50000,
    currency: "UGX",
    status: "DRAFT",
  },
];

export function getMockICTransactions(): ICTransactionRow[] {
  return [...MOCK_IC_TRANSACTIONS];
}
