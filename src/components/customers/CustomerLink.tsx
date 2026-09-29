"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function customerPageHref(customerId: string, tab?: string) {
  const base = `/sales/customers/${encodeURIComponent(customerId)}`;
  return tab ? `${base}?tab=${encodeURIComponent(tab)}` : base;
}

/** Customer name that opens that customer’s record. Plain text when there is no id. */
export function CustomerLink({
  id,
  name,
  className,
  tab,
}: {
  id?: string | null;
  name?: string | null;
  className?: string;
  tab?: string;
}) {
  const label = name?.trim();
  if (!id?.trim()) {
    return <span className={className}>{label || "—"}</span>;
  }
  return (
    <Link
      href={customerPageHref(id.trim(), tab)}
      className={cn("text-primary hover:underline", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {label || "Customer"}
    </Link>
  );
}
