export type DepreciationMethod = "STRAIGHT_LINE";

export type AssetRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  acquisitionDate: string;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  linkedVendorId?: string;
  linkedInvoiceId?: string;
  status: "ACTIVE" | "DISPOSED";
};

export type DisposalRow = {
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
  journalId?: string;
};
