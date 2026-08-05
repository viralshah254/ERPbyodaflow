export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  /** Commercial barcode / EAN — unique per org; join key for SFA MT+GT. */
  barcode?: string;
  /** FMCG / SFA size label (e.g. 500ml, 12x330ml). */
  size?: string;
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
  /** Catalog logistics weight (kg) per sellable unit / pack. */
  grossWeightKg?: number;
  /** Catalog logistics volume (m³) per sellable unit / pack. */
  grossVolumeM3?: number;
  status: string;
  currentStock?: number;
  /** Available at fulfilment warehouse when fetched with includeStock + warehouseId. */
  availableQuantity?: number;
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

export type PartyChannel = "MODERN_TRADE" | "GENERAL_TRADE" | "E_COM" | "HORECA" | "OTHER";

export type SfaSegment =
  | "MODERN_TRADE_HQ"
  | "MODERN_TRADE_BRANCH"
  | "GENERAL_TRADE_CLIENT"
  | "DISTRIBUTOR"
  | "VAN_SALES";

export type SupplierType = "RAW_MATERIAL" | "SERVICE" | "LOGISTICS" | "OTHER";

/** CoolCatch: direct farm gate vs broker/aggregator supplier. */
export type CoolcatchSupplierKind = "FARM" | "BROKER";

export type PartyRow = {
  id: string;
  name: string;
  tradingName?: string;
  code?: string;
  type: "customer" | "supplier";
  roles?: PartyRole[];
  customerType?: CustomerType;
  channel?: PartyChannel;
  sfaSegment?: SfaSegment;
  parentPartyId?: string;
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
  route?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
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
  /** Customer price tag (PriceList id). */
  defaultPriceListId?: string;
  /** FMCG tax tag (TaxConfig id). */
  defaultTaxConfigId?: string;
  status: string;
};

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  branch?: string;
  status: string;
};
