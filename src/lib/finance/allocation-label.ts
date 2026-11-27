type AllocationLike = { documentId?: string; documentNumber?: string; amount?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What a clerk calls the document a payment settled: its number, or "Opening balance <ref>". */
export function allocationLabel(line: AllocationLike): string {
  const id = line.documentId?.trim() ?? "";
  const number = line.documentNumber?.trim() ?? "";
  if (number && number !== id && !number.startsWith("opening:")) return number;
  if (id.startsWith("opening:")) {
    const reference = id.split(":").slice(2).join(":").trim();
    return reference && !/^OB-/i.test(reference) ? `Opening balance ${reference}` : "Opening balance";
  }
  if (UUID.test(id)) return "Document";
  return number || id || "Document";
}

/** "INV-0042, Opening balance 1234 +3 more". */
export function allocationSummary(lines: AllocationLike[] | undefined, show = 2): { text: string; full: string } {
  const labels = [...new Set((lines ?? []).map(allocationLabel))];
  if (!labels.length) return { text: "—", full: "" };
  const extra = labels.length - show;
  return {
    text: extra > 0 ? `${labels.slice(0, show).join(", ")} +${extra} more` : labels.join(", "),
    full: labels.join(", "),
  };
}
