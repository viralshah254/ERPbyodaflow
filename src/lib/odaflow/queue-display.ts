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

export function channelLabelFromEventType(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType.replace(/^order\./, "").replace(/_/g, " ");
}

export function orderTypeLabel(item: OdaflowQueueItem, summary?: OdaflowQueueOrderSummary | null): string {
  if (summary?.orderTitle?.trim()) return summary.orderTitle.trim();
  if (summary?.channel && CHANNEL_LABELS[summary.channel]) return CHANNEL_LABELS[summary.channel];
  return channelLabelFromEventType(item.eventType);
}

export function resolveCustomerLabel(
  item: OdaflowQueueItem,
  summary?: OdaflowQueueOrderSummary | null
): string {
  if (summary?.customerName?.trim()) return summary.customerName.trim();

  const payload = item.rawPayload as Record<string, unknown> | undefined;
  if (typeof payload?.customerName === "string" && payload.customerName.trim()) {
    return payload.customerName.trim();
  }

  const customerMapping = item.unresolvedMappings?.find((m) => m.type === "customer");
  if (customerMapping?.displayName?.trim()) return customerMapping.displayName.trim();

  const customerId =
    summary?.odaflowCustomerId ??
    (typeof payload?.odaflowCustomerId === "string" ? payload.odaflowCustomerId : undefined) ??
    customerMapping?.odaflowId;

  if (customerId) return `SFA customer ${customerId.slice(-8)}`;
  return "Unknown customer";
}

export function resolveSalesRepLabel(
  item: OdaflowQueueItem,
  summary?: OdaflowQueueOrderSummary | null
): string | undefined {
  if (summary?.salesRepName?.trim()) return summary.salesRepName.trim();

  const payload = item.rawPayload as Record<string, unknown> | undefined;
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
  const payload = item.rawPayload as Record<string, unknown> | undefined;
  if (typeof payload?.salesRepPhone === "string" && payload.salesRepPhone.trim()) {
    return payload.salesRepPhone.trim();
  }
  const meta = payload?.metadata as Record<string, unknown> | undefined;
  if (typeof meta?.salesRepPhone === "string" && meta.salesRepPhone.trim()) {
    return meta.salesRepPhone.trim();
  }
  return undefined;
}

export function formatOrderAmount(summary?: OdaflowQueueOrderSummary | null): string | undefined {
  if (summary?.totalAmount == null) return undefined;
  const currency = summary.currency ?? "KES";
  return `${currency} ${summary.totalAmount.toLocaleString()}`;
}
