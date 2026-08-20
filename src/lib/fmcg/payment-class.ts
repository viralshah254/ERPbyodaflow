/** Display names for SFA ledger payment class (Cash vs sundry debtors). */
export function paymentTermDisplayName(term: { code?: string; name?: string } | null | undefined): string {
  const code = String(term?.code ?? "").trim().toUpperCase();
  if (code === "CASH" || code === "IMM") return "Cash";
  if (code === "CREDIT" || code === "DEBTORS" || code === "DEBITORS") return "Credit (Debtors)";
  return term?.name?.trim() || code || "—";
}

export function sortPaymentTerms<T extends { code?: string; name?: string }>(terms: T[]): T[] {
  const rank = (code?: string) => {
    const value = String(code ?? "").toUpperCase();
    if (value === "CASH") return 0;
    if (value === "CREDIT") return 1;
    return 10;
  };
  return [...terms].sort((a, b) => {
    const byClass = rank(a.code) - rank(b.code);
    if (byClass !== 0) return byClass;
    return String(a.name ?? a.code).localeCompare(String(b.name ?? b.code));
  });
}
