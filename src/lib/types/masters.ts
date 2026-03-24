export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category?: string;
  unit?: string;
  baseUom?: string;
  productType?: "RAW" | "FINISHED" | "BOTH";
  defaultTaxCodeId?: string;
  status: string;
  currentStock?: number;
  /** Internal notes / long description (not printed on docs unless configured). */
  description?: string;
};

export type PartyRole = "customer" | "supplier" | "franchisee";

export type CustomerType =
  | "DISTRIBUTOR"
  | "WHOLESALER"
  | "RETAILER"
  | "FRANCHISEE"
  | "END_CUSTOMER";

export type SupplierType = "RAW_MATERIAL" | "SERVICE" | "LOGISTICS" | "OTHER";

export type PartyRow = {
  id: string;
  name: string;
  code?: string;
  type: "customer" | "supplier";
  roles?: PartyRole[];
  customerType?: CustomerType;
  supplierType?: SupplierType;
  customerCategoryId?: string;
  email?: string;
  phone?: string;
  taxId?: string;
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
