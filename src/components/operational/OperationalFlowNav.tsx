"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
const FLOWS = {
  sales: [
    { label: "Orders", href: "/sales/orders", permissions: ["sales.orders.read", "sales.read"] },
    { label: "Delivery", href: "/sales/deliveries", permissions: ["sales.deliveries.read", "sales.read"] },
    { label: "Invoicing", href: "/sales/invoices", permissions: ["sales.invoices.read", "finance.ar.read", "finance.read"] },
    { label: "Returns", href: "/sales/returns", permissions: ["sales.returns.read", "sales.read"] },
    { label: "Statements", href: "/ar/statements", permissions: ["finance.ar.read", "finance.read"] },
  ],
  purchasing: [
    { label: "Requests", href: "/purchasing/requests", permissions: ["purchase.read"] },
    { label: "Orders", href: "/purchasing/orders", permissions: ["purchasing.orders.read", "purchase.read"] },
    { label: "Receive & QC", href: "/purchasing/goods-receipt", permissions: ["purchasing.grn.read", "purchase.read"] },
    { label: "Supplier bills", href: "/purchasing/supplier-invoices", permissions: ["purchasing.bills.read", "finance.ap.read", "finance.read"] },
    { label: "Returns", href: "/purchasing/purchase-returns", permissions: ["purchase.read"] },
    { label: "Statements", href: "/ap/statements", permissions: ["finance.ap.read", "finance.read"] },
  ],
  manufacturing: [
    { label: "Recipes", href: "/manufacturing/boms", permissions: ["manufacturing.bom.read", "manufacturing.read"] },
    { label: "Daily plan", href: "/manufacturing/production-plan", permissions: ["manufacturing.production.read", "manufacturing.read"] },
    { label: "Work orders", href: "/manufacturing/work-orders", permissions: ["manufacturing.workorders.read", "manufacturing.read"] },
    { label: "Quality", href: "/manufacturing/quality", permissions: ["inventory.read"] },
    { label: "Reports", href: "/reports", permissions: ["reports.read"] },
  ],
};
export function OperationalFlowNav({ flow, current }: { flow: keyof typeof FLOWS; current: string }) {
  const permissions = useAuthStore((state) => state.permissions);
  return <nav aria-label={`${flow} workflow navigation`} className="shrink-0 rounded-xl border bg-card p-3">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{flow === "sales" ? "Order to collection" : flow === "purchasing" ? "Purchase to settlement" : "Recipe to finished goods"}</p>
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">{FLOWS[flow].map((step, index) => { const active = step.label === current; const allowed = permissions.includes("*") || step.permissions.some((permission) => permissions.includes(permission)); return <li key={step.label} className="flex shrink-0 items-center gap-2">{index > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />}{allowed ? <Link href={step.href} aria-current={active ? "page" : undefined} className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{step.label}</Link> : <span title="This step belongs to another authorized role" className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-muted-foreground"><LockKeyhole className="h-3 w-3" aria-hidden="true" />{step.label}</span>}</li>; })}</ol>
  </nav>;
}
