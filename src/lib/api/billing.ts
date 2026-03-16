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
  lineItems: BillingLineItem[];
  createdAt: string;
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
