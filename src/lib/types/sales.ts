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
  /** Channel the order was placed through (e.g. WHATSAPP). Used for list badges. */
  orderChannel?: string;
  reference?: string;
};
