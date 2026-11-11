import type { DocumentDetailRecord } from "@/lib/types/documents";
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
/** Preview from this credit's stored gross and VAT evidence, without changing agreed prices. */
export function creditQuantityPreview(lines: DocumentDetailRecord["lines"], quantities: Record<string, string>) {
  let total = 0, tax = 0, selected = 0;
  for (const line of lines) {
    if (!line.id) return { total, tax, selected, error: "Reload this credit before editing a line without an identifier." };
    const raw = quantities[line.id] ?? String(line.qty ?? 0);
    const input = Number(raw);
    if (!raw.trim() || !Number.isFinite(input) || input < 0) return { total, tax, selected, error: "Enter a valid non-negative quantity on every line. Use 0 to leave a line off." };
    const qty = Math.round(input * 100) / 100;
    if (line.creditCapacity && qty > line.creditCapacity.available + 0.001) return { total, tax, selected, error: `${line.description} has only ${line.creditCapacity.available} available to credit.` };
    if (!line.creditCapacity && line.sourceQuantity != null && line.sourceQuantity > 0 && qty > line.sourceQuantity + 0.001) return { total, tax, selected, error: `${line.description} exceeds its original source quantity.` };
    if (!qty) continue;
    const original = line.qty ?? 0;
    if (!(original > 0)) return { total, tax, selected, error: "Reload this credit from its original document before increasing a zero-quantity line." };
    selected++;
    total += money((line.amount ?? 0) * qty / original);
    tax += money((line.tax ?? 0) * qty / original);
  }
  return { total: money(total), tax: money(tax), selected, error: null };
}
