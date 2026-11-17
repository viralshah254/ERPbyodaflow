"use client";
import * as React from "react";
import { apiRequest } from "./client";
export type InvoicePostingMode = "ACCOUNTING_ONLY" | "KRA_REQUIRED";
type InvoicePostingPolicy = { mode: InvoicePostingMode; requireCustomerKraPin?: boolean };
export const fetchInvoicePostingMode = () => apiRequest<InvoicePostingPolicy>("/api/settings/invoice-posting");
export const saveInvoicePostingMode = (mode: InvoicePostingMode, requireCustomerKraPin?: boolean) =>
  apiRequest<InvoicePostingPolicy>("/api/settings/invoice-posting", {
    method: "PATCH", body: { mode, requireCustomerKraPin },
  });
export function useAccountingOnly() {
  const [accountingOnly, setAccountingOnly] = React.useState(false);
  React.useEffect(() => { let active = true; void fetchInvoicePostingMode().then(data => { if (active) setAccountingOnly(data.mode === "ACCOUNTING_ONLY"); }).catch(() => {}); return () => { active = false; }; }, []);
  return accountingOnly;
}
