import type { OdaflowQueueItem, OdaflowQueueOrderSummary } from "@/lib/api/odaflow-integration";

const CHANNEL_LABELS: Record<string, string> = {
  modern_trade: "Modern Trade",
  distributor: "General Trade · Distributor",
  direct: "General Trade · Customer order",
  van_sales: "Van Sales",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  "order.modern_trade": "Modern Trade",
  "order.distributor": "General Trade · Distributor",
  "order.direct": "General Trade · Customer order",
  "order.van_sales": "Van Sales",
};

function payloadRecord(item: OdaflowQueueItem): Record<string, unknown> | undefined {
  return item.rawPayload as Record<string, unknown> | undefined;
}

export function channelLabelFromEventType(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType.replace(/^order\./, "").replace(/_/g, " ");
}

export function orderTypeLabel(item: OdaflowQueueItem, summary?: OdaflowQueueOrderSummary | null): string {
  if (summary?.orderTitle?.trim()) return summary.orderTitle.trim();
  if (summary?.channel && CHANNEL_LABELS[summary.channel]) return CHANNEL_LABELS[summary.channel];
  return channelLabelFromEventType(item.eventType);
}

function customerNameFromPayload(payload: Record<string, unknown> | undefined): string | undefined {
  if (!payload) return undefined;
  if (typeof payload.customerName === "string" && payload.customerName.trim()) {
    return payload.customerName.trim();
  }
  const nested = payload.customer as Record<string, unknown> | undefined;
  if (nested) {
    const businessInfo = nested.businessInfo as Record<string, unknown> | undefined;
    const fromNested =
      (typeof nested.name === "string" && nested.name.trim()) ||
      (typeof businessInfo?.businessName === "string" && businessInfo.businessName.trim()) ||
      (typeof businessInfo?.tradingName === "string" && businessInfo.tradingName.trim()) ||
      (typeof nested.businessName === "string" && nested.businessName.trim()) ||
      "";
    if (fromNested) return fromNested;
  }
  return undefined;
}

export function resolveCustomerLabel(
  item: OdaflowQueueItem,
  summary?: OdaflowQueueOrderSummary | null
): string {
  if (summary?.customerName?.trim()) return summary.customerName.trim();

  const fromPayload = customerNameFromPayload(payloadRecord(item));
  if (fromPayload) return fromPayload;

  const customerMapping = item.unresolvedMappings?.find((m) => m.type === "customer");
  if (customerMapping?.displayName?.trim()) return customerMapping.displayName.trim();

  const payload = payloadRecord(item);
  const customerId =
    summary?.odaflowCustomerId ??
    (typeof payload?.odaflowCustomerId === "string" ? payload.odaflowCustomerId : undefined) ??
    customerMapping?.odaflowId;

  if (customerId) return `SFA customer ${customerId.slice(-8)}`;
  return "Unknown customer";
}

export function resolveSalesRepName(
  item: OdaflowQueueItem,
  summary?: OdaflowQueueOrderSummary | null
): string | undefined {
  if (summary?.salesRepName?.trim()) return summary.salesRepName.trim();

  const payload = payloadRecord(item);
  if (typeof payload?.salesRepName === "string" && payload.salesRepName.trim()) {
    return payload.salesRepName.trim();
  }

  const meta = payload?.metadata as Record<string, unknown> | undefined;
  if (typeof meta?.salesRepName === "string" && meta.salesRepName.trim()) {
    return meta.salesRepName.trim();
  }

  const notes = typeof payload?.notes === "string" ? payload.notes : "";
  const byMatch = notes.match(/\bby\s+(.+)$/i);
  if (byMatch?.[1]?.trim()) return byMatch[1].trim();

  return undefined;
}

export function resolveSalesRepPhone(
  item: OdaflowQueueItem,
  summary?: OdaflowQueueOrderSummary | null
): string | undefined {
  if (summary?.salesRepPhone?.trim()) return summary.salesRepPhone.trim();
  const payload = payloadRecord(item);
  if (typeof payload?.salesRepPhone === "string" && payload.salesRepPhone.trim()) {
    return payload.salesRepPhone.trim();
  }
  const meta = payload?.metadata as Record<string, unknown> | undefined;
  if (typeof meta?.salesRepPhone === "string" && meta.salesRepPhone.trim()) {
    return meta.salesRepPhone.trim();
  }
  return undefined;
}

export function resolveOrderTotal(
  item: OdaflowQueueItem,
  summary?: OdaflowQueueOrderSummary | null
): { amount: number; currency: string } | undefined {
  if (summary?.totalAmount != null && summary.totalAmount > 0) {
    return { amount: summary.totalAmount, currency: summary.currency ?? "KES" };
  }
  const payload = payloadRecord(item);
  const total = Number(payload?.totalAmount);
  if (!Number.isNaN(total) && total > 0) {
    return { amount: total, currency: (payload?.currency as string) ?? "KES" };
  }
  return undefined;
}

export function formatOrderAmount(
  item: OdaflowQueueItem,
  summary?: OdaflowQueueOrderSummary | null
): string | undefined {
  const total = resolveOrderTotal(item, summary);
  if (!total) return undefined;
  const decimals = total.amount % 1 === 0 ? 0 : 2;
  return `${total.currency} ${total.amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
