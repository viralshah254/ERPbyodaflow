import {
  fetchApReceiptItemsApi,
  fetchArOpenItemsApi,
  previewApSettlementApi,
  previewArSettlementApi,
  searchApSupplierOptionsApi,
  searchReceiptCustomerOptionsApi,
} from "@/lib/api/payments";
import type { PartyLookupOption } from "@/lib/api/parties";
import type { ArOpenItem, CreditNoteApplicationLine, SettlementPreview } from "@/lib/types/ar";
import { sortByDue, type SettlementSide } from "@/lib/finance/settlement-batch";

export type PartyOpenItems = {
  invoices: ArOpenItem[];
  creditNotes: ArOpenItem[];
  /** Server plan for netting credit notes against their own invoices first. */
  credits: CreditNoteApplicationLine[];
};

type Source = {
  loadParties: (search?: string) => Promise<PartyLookupOption[]>;
  loadItems: (partyId: string) => Promise<{ invoices: ArOpenItem[]; creditNotes: ArOpenItem[] }>;
  preview: (body: { partyId: string; amount: number }) => Promise<SettlementPreview>;
};

export const SETTLEMENT_SOURCES: Record<SettlementSide, Source> = {
  AR: {
    loadParties: searchReceiptCustomerOptionsApi,
    loadItems: fetchArOpenItemsApi,
    preview: previewArSettlementApi,
  },
  AP: {
    loadParties: searchApSupplierOptionsApi,
    loadItems: async (partyId) => {
      const items = await fetchApReceiptItemsApi(partyId);
      return { invoices: sortByDue(items.invoices), creditNotes: items.creditNotes };
    },
    preview: previewApSettlementApi,
  },
};

/** Open documents, credit notes and the credit-note plan for one party. Credits are skipped when there are none. */
export async function loadPartyOpenItems(side: SettlementSide, partyId: string): Promise<PartyOpenItems> {
  const source = SETTLEMENT_SOURCES[side];
  const items = await source.loadItems(partyId);
  if (items.creditNotes.length === 0) return { ...items, credits: [] };
  const credits = await source
    .preview({ partyId, amount: 0.01 })
    .then((preview) => preview.creditNoteApplications)
    .catch(() => []);
  return { ...items, credits };
}
