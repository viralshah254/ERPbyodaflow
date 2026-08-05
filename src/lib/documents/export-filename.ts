/** Strip characters that break file downloads / OS filenames. */
function safeFilePart(value: string, maxLen = 80): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/**
 * Delivery notes: `{DN number}-{customer name}.pdf`
 * Other docs: `{type}-{number}.pdf` (fallback).
 */
export function documentExportFileName(opts: {
  type: string;
  number?: string | null;
  partyName?: string | null;
  ext: "pdf" | "xlsx";
}): string {
  const type = String(opts.type ?? "document").trim() || "document";
  const num = safeFilePart(String(opts.number ?? "").trim()) || type;
  if (type === "delivery-note") {
    const party = safeFilePart(String(opts.partyName ?? "").trim());
    if (party) return `${num}-${party}.${opts.ext}`;
    return `${num}.${opts.ext}`;
  }
  return `${type}-${num}.${opts.ext}`;
}
