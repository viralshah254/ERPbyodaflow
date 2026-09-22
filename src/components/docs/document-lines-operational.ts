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

function lineLabel(line: DocumentLine): string {
  return line.name?.trim() || line.sku?.trim() || "A line";
}

function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

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
  const missingProduct = lines.filter((line) => !line.productId?.trim()).map(lineLabel);
  const missingQty = lines
    .filter((line) => line.productId?.trim() && (!Number.isFinite(line.qty) || line.qty <= 0))
    .map(lineLabel);
  const missingPrice = lines
    .filter(
      (line) =>
        line.productId?.trim() &&
        Number.isFinite(line.qty) &&
        line.qty > 0 &&
        (!Number.isFinite(line.price) || line.price <= 0)
    )
    .map(lineLabel);
  const parts: string[] = [];
  if (missingProduct.length) parts.push(`${joinNames(missingProduct)} needs a product.`);
  if (missingQty.length) parts.push(`${joinNames(missingQty)} needs a quantity above 0.`);
  if (missingPrice.length) {
    parts.push(
      `${joinNames(missingPrice)} ${missingPrice.length === 1 ? "has" : "have"} no unit price. Set a price above 0, or pick a price tag that prices ${missingPrice.length === 1 ? "it" : "them"}.`
    );
  }
  return parts.join(" ") || "Each line needs a product, a quantity above 0, and a unit price above 0.";
}
