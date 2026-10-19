/**
 * Client-side product search. Same rules as the API:
 * a barcode matches the barcode, and a number is the pack size.
 * g, gm, gms, and kg are ignored, so "blackforest 250g" and "250 gms"
 * both return every Black Forest whose size is 250.
 */
import { FMCG_SIZE_UNIT_ALIASES } from "@/lib/products/fmcg-size";

const UNIT_ALT = Object.keys(FMCG_SIZE_UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .join("|");

const SIZE_RE = new RegExp(
  `(?<!\\d)(\\d{1,4}(?:\\.\\d+)?)\\s*(?:${UNIT_ALT})\\b|(?:^|\\s|(?<=[a-z]))(\\d{1,4}(?:\\.\\d+)?)(?!\\s*(?:${UNIT_ALT})\\b)(?=\\s|$)(?!\\s*[xX])`,
  "gi"
);

const BARCODE_RE = /(?<!\d)(\d{6,})(?!\d)/g;

export type ProductSearchFields = {
  name?: string | null;
  sku?: string | null;
  code?: string | null;
  barcode?: string | null;
  size?: string | null;
};

export function productSearchLabel(product: {
  sku?: string | null;
  name?: string | null;
  size?: string | null;
}): string {
  const name = product.name?.trim() || "Product";
  const size = product.size?.trim();
  const titled =
    size && !name.toLowerCase().includes(size.toLowerCase()) ? `${name} · ${size}` : name;
  const sku = product.sku?.trim();
  return sku ? `${sku} — ${titled}` : titled;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function flexibleLiteral(token: string): string {
  const compact = compactToken(token);
  if (!compact) return escapeRegExp(token);
  return compact.split("").map(escapeRegExp).join("[^a-z0-9]*");
}

function pull(input: string, re: RegExp): { rest: string; matches: RegExpMatchArray[] } {
  const matches = [...input.matchAll(re)];
  let rest = input;
  for (const match of [...matches].reverse()) {
    const start = match.index ?? 0;
    rest = `${rest.slice(0, start)} ${rest.slice(start + match[0].length)}`;
  }
  return { rest, matches };
}

type Atom =
  | { type: "barcode"; digits: string }
  | { type: "size"; number: string }
  | { type: "text"; pattern: string };

function plan(query: string): Atom[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const barcodes = pull(trimmed, BARCODE_RE);
  const sizes = pull(barcodes.rest, SIZE_RE);
  const atoms: Atom[] = [];
  for (const match of barcodes.matches) {
    if (match[1]) atoms.push({ type: "barcode", digits: match[1] });
  }
  const numbers = sizes.matches
    .map((match) => match[1] || match[2])
    .filter((value): value is string => Boolean(value));
  const sizeNumber = numbers[numbers.length - 1];
  if (sizeNumber) atoms.push({ type: "size", number: sizeNumber });
  const tokens = sizes.rest
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !FMCG_SIZE_UNIT_ALIASES[token]);
  for (const token of tokens) atoms.push({ type: "text", pattern: flexibleLiteral(token) });
  return atoms;
}

export function productMatchesSearch(product: ProductSearchFields, query: string): boolean {
  const atoms = plan(query);
  if (!atoms.length) return false;
  return atoms.every((atom) => {
    if (atom.type === "barcode") {
      return (
        String(product.barcode ?? "").startsWith(atom.digits) ||
        String(product.code ?? "").startsWith(atom.digits)
      );
    }
    if (atom.type === "size") {
      const code = String(product.code ?? "").trim().toLowerCase();
      const sku = String(product.sku ?? "").trim().toLowerCase();
      if (code === atom.number.toLowerCase() || sku === atom.number.toLowerCase()) return true;
      const re = new RegExp(`(^|[^0-9])${escapeRegExp(atom.number)}([^0-9]|$)`, "i");
      return re.test(String(product.size ?? "")) || re.test(String(product.name ?? ""));
    }
    const re = new RegExp(atom.pattern, "i");
    return [product.name, product.sku, product.code, product.barcode]
      .some((value) => re.test(String(value ?? "")));
  });
}
