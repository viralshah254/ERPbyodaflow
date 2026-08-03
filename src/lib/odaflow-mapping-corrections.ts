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
    label: "Wrong mapped product",
    amendMapping: true,
  },
  {
    id: "substitution",
    label: "Replacement",
    amendMapping: false,
  },
  {
    id: "other",
    label: "Other",
    amendMapping: false,
  },
];

export function mergeOdaflowMappingCorrections(
  existing: OdaflowMappingCorrectionsPayload,
  incoming: OdaflowMappingCorrectionsPayload
): OdaflowMappingCorrectionsPayload {
  const products = [...(existing.products ?? [])];
  for (const product of incoming.products ?? []) {
    const index = products.findIndex((item) => item.lineId === product.lineId);
    if (index >= 0) products[index] = product;
    else products.push(product);
  }
  return {
    ...(incoming.customer ? { customer: incoming.customer } : existing.customer ? { customer: existing.customer } : {}),
    ...(products.length ? { products } : {}),
  };
}

export function filterUnconfirmedOdaflowChanges(
  preview: OdaflowEditChangePreview,
  confirmed: OdaflowMappingCorrectionsPayload
): OdaflowEditChangePreview {
  const result: OdaflowEditChangePreview = { products: [] };

  if (preview.customer) {
    const confirmedCustomer = confirmed.customer;
    if (!confirmedCustomer || confirmedCustomer.newPartyId !== preview.customer.toPartyId) {
      result.customer = preview.customer;
    }
  }

  for (const product of preview.products) {
    const match = confirmed.products?.find(
      (item) => item.lineId === product.lineId && item.newProductId === product.toProductId
    );
    if (!match) result.products.push(product);
  }

  return result;
}

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
