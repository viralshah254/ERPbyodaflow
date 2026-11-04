"use client";
import * as React from "react";
import { apiRequest } from "./client";
export type InvoicePostingMode = "ACCOUNTING_ONLY" | "KRA_REQUIRED";
export const fetchInvoicePostingMode = () => apiRequest<{ mode: InvoicePostingMode }>("/api/settings/invoice-posting");
export const saveInvoicePostingMode = (mode: InvoicePostingMode) => apiRequest<{ mode: InvoicePostingMode }>("/api/settings/invoice-posting", { method: "PATCH", body: { mode } });
export function useAccountingOnly() {
  const [accountingOnly, setAccountingOnly] = React.useState(false);
  React.useEffect(() => { let active = true; void fetchInvoicePostingMode().then(data => { if (active) setAccountingOnly(data.mode === "ACCOUNTING_ONLY"); }).catch(() => {}); return () => { active = false; }; }, []);
  return accountingOnly;
}
