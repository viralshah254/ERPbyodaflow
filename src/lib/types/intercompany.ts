export interface EntityRow {
  id: string;
  code: string;
  name: string;
  baseCurrency: string;
  isReporting: boolean;
}

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
  exchangeRate?: number;
  status: "DRAFT" | "POSTED";
}
