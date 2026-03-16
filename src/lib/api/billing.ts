import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type BillingLineItem = {
  category?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  prorated: boolean;
  periodStart?: string;
  periodEnd?: string;
};

export type BillingUsagePreview = {
  orgId: string;
  periodStart: string;
  periodEnd: string;
  activeUserCount: number;
  copilotEnabledCount: number;
  franchiseCount: number;
  includedSeatCount: number;
  billableAdditionalUserCount: number;
  standardUserCount: number;
  isFranchiseBilling: boolean;
  pendingProrationCents: number;
  projectedTotalCents: number;
  lineBreakdown: BillingLineItem[];
};

export type BillingInvoiceRow = {
  id: string;
  subscriptionId: string;
  orgId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: string;
  totalCents: number;
  currency: string;
  billingKind?: string;
  checkoutId?: string;
  lineItems: BillingLineItem[];
  createdAt: string;
};

export type BillingCheckoutItem = {
  id: string;
  itemType: "USER" | "FRANCHISE_OUTLET";
  label: string;
  payload: Record<string, unknown>;
};

export type BillingCheckout = {
  id: string | null;
  status: string;
  items: BillingCheckoutItem[];
  quoteTotalCents: number;
  quoteLineItems: BillingLineItem[];
  projectedMonthlyCents: number;
  finalizedInvoiceId: string | null;
  liveUsage: BillingUsagePreview;
  stagedUserCount?: number;
  stagedFranchiseCount?: number;
};

export type BillingPricing = {
  standardPerUserPerMonth: number;
  franchiseBasePerMonth: number;
  franchiseIncludedLicenses: number;
  franchiseAdditionalUserPerMonth: number;
  copilotPerUserPerMonth: number;
  annualDiscountPercent: number;
};

export async function fetchBillingUsageApi(): Promise<BillingUsagePreview> {
  requireLiveApi("Billing usage");
  return apiRequest<BillingUsagePreview>("/api/billing/usage");
}

export async function fetchBillingInvoicesApi(): Promise<BillingInvoiceRow[]> {
  requireLiveApi("Billing invoices");
  const payload = await apiRequest<{ items: BillingInvoiceRow[] }>("/api/billing/invoices");
  return payload.items ?? [];
}

export async function fetchBillingPricingApi(): Promise<BillingPricing> {
  requireLiveApi("Billing pricing");
  return apiRequest<BillingPricing>("/api/billing/pricing");
}

export async function fetchBillingCheckoutApi(): Promise<BillingCheckout> {
  requireLiveApi("Billing checkout");
  return apiRequest<BillingCheckout>("/api/billing/checkout");
}

export async function removeBillingCheckoutItemApi(itemId: string): Promise<BillingCheckout> {
  requireLiveApi("Remove checkout item");
  return apiRequest<BillingCheckout>(`/api/billing/checkout/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

export async function confirmBillingCheckoutApi(): Promise<{
  checkoutId: string;
  invoiceId: string;
  quoteTotalCents: number;
  lineItems: BillingLineItem[];
}> {
  requireLiveApi("Confirm billing checkout");
  return apiRequest("/api/billing/checkout/confirm", { method: "POST" });
}

export async function cancelBillingCheckoutApi(): Promise<BillingCheckout> {
  requireLiveApi("Cancel billing checkout");
  return apiRequest<BillingCheckout>("/api/billing/checkout/cancel", { method: "POST" });
}
