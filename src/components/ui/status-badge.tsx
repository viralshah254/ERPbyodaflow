"use client";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  /** Shown in place of the raw status code. */
  label?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const statusVariants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  // Order statuses
  DRAFT: "default",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  POSTED: "info",
  RECEIVED: "success",
  CONVERTED: "success",
  PROCESSING: "info",
  FULFILLED: "success",
  PARTIALLY_FULFILLED: "warning",
  CANCELLED: "danger",
  REJECTED: "danger",
  PARTIALLY_APPLIED: "warning",
  PAID: "success",
  OPEN: "warning",
  RELEASED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  DISPATCHED: "info",
  
  // Stock statuses
  "In Stock": "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
  
  // General
  Active: "success",
  Inactive: "default",
};

const badgeStyles = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800",
};

const STATUS_ACRONYMS = new Set(["QC", "VAT", "GRN", "AR", "AP", "PO", "SKU", "UOM", "WIP", "BOM", "MRP", "KRA", "FX", "WHT"]);

/** Turn DRAFT / IN_PROGRESS into Draft / In progress. Leave mixed-case labels alone. */
export function humanStatusLabel(status: string): string {
  if (!/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(status)) return status;
  const words = status.split("_").filter(Boolean).map((word) => (
    STATUS_ACRONYMS.has(word) ? word : word.toLowerCase()
  ));
  const first = status.split("_")[0];
  if (words[0] && first && !STATUS_ACRONYMS.has(first)) {
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }
  return words.join(" ");
}

export function StatusBadge({ status, label, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant || statusVariants[status] || "default";
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium",
        badgeStyles[resolvedVariant],
        className
      )}
    >
      {label ?? humanStatusLabel(status)}
    </Badge>
  );
}





