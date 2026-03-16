/**
 * Drill-through link helpers for cross-module navigation.
 * Used throughout the app for consistent deep-linking.
 */

export interface DrillLink {
  href: string;
  label: string;
}

export interface NotificationDrillContext {
  entityType?: string;
  entityId?: string;
  dedupeKey?: string;
  title?: string;
  message?: string;
}

/** Get drill link for a product/SKU */
export function drillToProduct(productId: string): DrillLink {
  return {
    href: `/master/products/${productId}`,
    label: "View product",
  };
}

/** Get drill link for a customer */
export function drillToCustomer(customerId?: string): DrillLink {
  if (customerId) {
    return {
      href: `/ar/customers?id=${customerId}`,
      label: "View customer",
    };
  }
  return {
    href: "/ar/customers",
    label: "View customers",
  };
}

/** Get drill link for a supplier */
export function drillToSupplier(supplierId?: string): DrillLink {
  if (supplierId) {
    return {
      href: `/ap/suppliers?id=${supplierId}`,
      label: "View supplier",
    };
  }
  return {
    href: "/ap/suppliers",
    label: "View suppliers",
  };
}

/** Get drill link for a warehouse */
export function drillToWarehouse(warehouseId?: string): DrillLink {
  return {
    href: "/master/warehouses",
    label: "View warehouses",
  };
}

/** Get drill link for an employee */
export function drillToEmployee(employeeId?: string): DrillLink {
  return {
    href: "/payroll/employees",
    label: "View employees",
  };
}

/** Get drill link for a document */
export function drillToDocument(
  docType: string,
  docId: string
): DrillLink {
  return {
    href: `/docs/${docType}/${docId}`,
    label: `View ${docType}`,
  };
}

/** Get drill link for an approval item */
export function drillToApproval(
  docType: string,
  docId: string
): DrillLink {
  return {
    href: `/docs/${docType}/${docId}?approval=true`,
    label: "Review & approve",
  };
}

export function drillToApprovalInbox(approvalId?: string): DrillLink {
  return {
    href: approvalId ? `/approvals/inbox?approvalId=${encodeURIComponent(approvalId)}` : "/approvals/inbox",
    label: "Review approval",
  };
}

export function drillFromNotification(notification: NotificationDrillContext): DrillLink {
  if (notification.entityType === "approval" && notification.entityId) {
    return drillToApprovalInbox(notification.entityId);
  }
  if (notification.entityType === "invoice" && notification.entityId) {
    return drillToDocument("invoice", notification.entityId);
  }
  if (
    notification.entityType === "Party" ||
    notification.entityType === "party" ||
    notification.entityType === "customer"
  ) {
    return drillToCustomer(notification.entityId);
  }
  if (notification.entityType === "bill" && notification.entityId) {
    return drillToDocument("bill", notification.entityId);
  }
  if (notification.entityType === "journal" && notification.entityId) {
    return drillToDocument("journal", notification.entityId);
  }
  if (notification.dedupeKey?.startsWith("approval-")) {
    return drillToApprovalInbox(notification.entityId);
  }
  if (
    notification.entityId &&
    (notification.dedupeKey?.startsWith("credit-warning:") || notification.dedupeKey?.startsWith("invoice-overdue:"))
  ) {
    return drillToDocument("invoice", notification.entityId);
  }
  return {
    href: "/automation/alerts",
    label: "View alert",
  };
}

/** Get drill link for analytics segment */
export function drillToAnalytics(
  metric: string,
  filters?: Record<string, string>
): DrillLink {
  const params = new URLSearchParams(filters || {});
  params.set("metric", metric);
  return {
    href: `/analytics/explore?${params.toString()}`,
    label: "Explore in analytics",
  };
}

/** Get resolve link for work queue items */
export function getWorkQueueResolveLink(
  category: string,
  itemType: string,
  itemId?: string
): DrillLink {
  const links: Record<string, DrillLink> = {
    "payroll:approval": { href: "/payroll/pay-runs", label: "Review pay run" },
    "payroll:posting": { href: `/payroll/pay-runs/${itemId || ""}`, label: "Post journal" },
    "tax:mapping": { href: "/settings/tax/tax-mappings", label: "Fix mapping" },
    "tax:vat": { href: "/reports/vat-summary", label: "Review VAT" },
    "pricing:anomaly": { href: "/analytics/pricing", label: "Review pricing" },
    "pricing:tier": { href: "/settings/products/pricing-rules", label: "Fix tiers" },
    "inventory:stockout": { href: "/inventory/stock-levels", label: "Review stock" },
    "inventory:reorder": { href: "/purchasing/requests", label: "Create PR" },
    "ar:overdue": { href: "/ar/payments", label: "Collect payment" },
    "ap:due": { href: "/ap/payments", label: "Process payment" },
    "bank:unmatched": { href: "/finance/bank-recon", label: "Match transactions" },
    "approval:pending": { href: "/approvals/inbox", label: "Review approval" },
  };

  const key = `${category}:${itemType}`;
  return links[key] || { href: "/work/queue", label: "View queue" };
}

/** Get entity type from context */
export type EntityType =
  | "product"
  | "customer"
  | "supplier"
  | "warehouse"
  | "employee"
  | "document"
  | "approval";

/** Universal drill helper */
export function drillTo(
  entityType: EntityType,
  id?: string,
  meta?: Record<string, string>
): DrillLink {
  switch (entityType) {
    case "product":
      return drillToProduct(id || "");
    case "customer":
      return drillToCustomer(id);
    case "supplier":
      return drillToSupplier(id);
    case "warehouse":
      return drillToWarehouse(id);
    case "employee":
      return drillToEmployee(id);
    case "document":
      return drillToDocument(meta?.type || "invoice", id || "");
    case "approval":
      return drillToApproval(meta?.type || "invoice", id || "");
    default:
      return { href: "/", label: "Go home" };
  }
}
