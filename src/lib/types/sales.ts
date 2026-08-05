export type SalesDocRow = {
  id: string;
  number: string;
  date: string;
  /** ISO timestamp when the document was created (preferred for list display). */
  createdAt?: string;
  party?: string;
  partyId?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status: string;
  /** Channel the order was placed through (e.g. WHATSAPP). Used for list badges. */
  orderChannel?: string;
  reference?: string;
  /** Odaflow SFA sync metadata (sales orders only). */
  externalSource?: string;
  odaflowChannel?: string;
  odaflowSourcePdfUrl?: string;
};
