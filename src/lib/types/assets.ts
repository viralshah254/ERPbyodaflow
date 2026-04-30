export type DepreciationMethod = "STRAIGHT_LINE" | "REDUCING_BALANCE";

export type CustodyType = "ORG_STOCK" | "FRANCHISE_OUTLET" | "EMPLOYEE" | "IN_TRANSIT";

export type AssetRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryId?: string;
  branchId?: string;
  serialNumber?: string;
  assetTag?: string;
  model?: string;
  inServiceDate?: string;
  usefulLifeMonths?: number;
  depreciationRatePct?: number;
  acquisitionDate: string;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  linkedVendorId?: string;
  linkedInvoiceId?: string;
  status: "ACTIVE" | "DISPOSED" | "FULLY_DEPRECIATED";
  accumulatedDepreciation?: number;
  currentCustodyType?: CustodyType;
  currentCustodianOutletId?: string;
  currentCustodianEmployeeId?: string;
  custodySince?: string;
  custodianEmployeeName?: string;
  custodianOutletName?: string;
};

export type AssetAssignmentRow = {
  id: string;
  assetId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  custodyType: CustodyType;
  custodianOutletId?: string;
  custodianEmployeeId?: string;
  monthlyEquipmentFee?: number;
  securityDepositAmount?: number;
  currency?: string;
  notes?: string;
  attachmentUrl?: string;
  createdBy?: string;
  createdAt?: string;
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
