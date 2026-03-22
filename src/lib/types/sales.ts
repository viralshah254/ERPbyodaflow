export type SalesDocRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  partyId?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status: string;
};
