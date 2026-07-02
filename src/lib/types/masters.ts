export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  /** High-level line for grouping in pickers and grids (e.g. Tilapia, Nile Perch). */
  productFamily?: string;
  /** Category id (raw reference). */
  category?: string;
  /** Human-readable category name resolved by the backend. */
  categoryName?: string;
  unit?: string;
  baseUom?: string;
  productType?: "RAW" | "FINISHED" | "BOTH";
  defaultTaxCodeId?: string;
  status: string;
  currentStock?: number;
  /** Internal notes / long description (not printed on docs unless configured). */
  description?: string;
  updatedAt?: string;
};

export type PartyRole = "customer" | "supplier" | "franchisee";

export type CustomerType =
  | "DISTRIBUTOR"
  | "WHOLESALER"
  | "RETAILER"
  | "FRANCHISEE"
  | "END_CUSTOMER";

export type SupplierType = "RAW_MATERIAL" | "SERVICE" | "LOGISTICS" | "OTHER";

/** CoolCatch: direct farm gate vs broker/aggregator supplier. */
export type CoolcatchSupplierKind = "FARM" | "BROKER";

export type PartyRow = {
  id: string;
  name: string;
  code?: string;
  type: "customer" | "supplier";
  roles?: PartyRole[];
  customerType?: CustomerType;
  supplierType?: SupplierType;
  coolcatchSupplierKind?: CoolcatchSupplierKind;
  contactPersonFirstName?: string;
  contactPersonLastName?: string;
  customerCategoryId?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  pinCertificateUrl?: string;
  companyRegistrationUrl?: string;
  supplierPaymentMethod?: "BANK" | "MPESA" | "PAYBILL" | "TILL";
  supplierBankName?: string;
  supplierBankAccountName?: string;
  supplierBankAccountNumber?: string;
  supplierBankBranchName?: string;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  creditControlMode?: "AMOUNT" | "DAYS" | "HYBRID";
  creditLimitAmount?: number;
  maxOutstandingInvoiceAgeDays?: number;
  perInvoiceDaysToPayCap?: number;
  creditWarningThresholdPct?: number;
  status: string;
};

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  branch?: string;
  status: string;
};
