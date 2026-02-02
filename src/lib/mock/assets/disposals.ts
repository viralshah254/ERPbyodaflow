/**
 * Mock asset disposals for /assets/disposals.
 */

export interface DisposalRow {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  disposalDate: string;
  salePrice: number;
  bookValue: number;
  gainLoss: number;
  reason: string;
  status: "DRAFT" | "POSTED";
}

export const MOCK_DISPOSALS: DisposalRow[] = [
  {
    id: "d1",
    assetId: "a0",
    assetCode: "FA-000",
    assetName: "Old Printer",
    disposalDate: "2025-01-10",
    salePrice: 5000,
    bookValue: 4500,
    gainLoss: 500,
    reason: "Replaced",
    status: "POSTED",
  },
];

export function getMockDisposals(): DisposalRow[] {
  return [...MOCK_DISPOSALS];
}
