import type { DocumentLine } from "./DocumentLineEditor";

/** True when every line has a product and positive qty and unit price. */
export function documentLinesOperational(lines: DocumentLine[]): boolean {
  if (lines.length === 0) return false;
  for (const line of lines) {
    if (!line.productId?.trim()) return false;
    if (!Number.isFinite(line.qty) || line.qty <= 0) return false;
    if (!Number.isFinite(line.price) || line.price <= 0) return false;
  }
  return true;
}

const incompleteLinesMessage =
  "Each line needs a product, quantity > 0, and unit price > 0.";

/** User-facing copy when `documentLinesOperational` is false. */
export function documentLinesOperationalErrorMessage(
  lines: DocumentLine[],
  context: "continue" | "review" | "submit"
): string {
  if (lines.length === 0) {
    if (context === "review") return "Add at least one line item before reviewing.";
    if (context === "submit") return "Add at least one line item before submitting.";
    return "Add at least one line item before continuing.";
  }
  return incompleteLinesMessage;
}
