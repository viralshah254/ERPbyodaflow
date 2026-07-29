export type OdaflowMappingCorrectionReason = "wrong_match" | "substitution" | "commercial_decision" | "other";

export type OdaflowMappingCorrectionsPayload = {
  customer?: { newPartyId: string; reason: OdaflowMappingCorrectionReason };
  products?: Array<{ lineId: string; newProductId: string; reason: OdaflowMappingCorrectionReason }>;
};

export const ODAFLOW_CUSTOMER_CORRECTION_REASONS: Array<{
  id: OdaflowMappingCorrectionReason;
  label: string;
  amendMapping: boolean;
}> = [
  {
    id: "wrong_match",
    label: "Wrong customer was auto-matched from Odaflow",
    amendMapping: true,
  },
  {
    id: "substitution",
    label: "Different customer for this order only (mapping was correct)",
    amendMapping: false,
  },
  {
    id: "commercial_decision",
    label: "Manufacturer chose a different customer for this order",
    amendMapping: false,
  },
  {
    id: "other",
    label: "Other — do not change future Odaflow matching",
    amendMapping: false,
  },
];

export const ODAFLOW_PRODUCT_CORRECTION_REASONS: Array<{
  id: OdaflowMappingCorrectionReason;
  label: string;
  amendMapping: boolean;
}> = [
  {
    id: "wrong_match",
    label: "Wrong product was auto-matched from Odaflow",
    amendMapping: true,
  },
  {
    id: "substitution",
    label: "Substituting product on this order only (mapping was correct)",
    amendMapping: false,
  },
  {
    id: "commercial_decision",
    label: "Manufacturer chose a different product for this order",
    amendMapping: false,
  },
  {
    id: "other",
    label: "Other — do not change future Odaflow matching",
    amendMapping: false,
  },
];

export type OdaflowEditChangePreview = {
  customer?: {
    fromPartyId: string;
    fromLabel: string;
    toPartyId: string;
    toLabel: string;
    odaflowCustomerId?: string;
    odaflowCustomerName?: string;
  };
  products: Array<{
    lineId: string;
    fromProductId: string;
    fromLabel: string;
    toProductId: string;
    toLabel: string;
    odaflowProductId?: string;
    odaflowProductName?: string;
  }>;
};
