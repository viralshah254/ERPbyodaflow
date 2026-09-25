/** USB scanner read: product barcode, optional space, pieces in the pack. */

export type PackBarcode = {
  barcode: string;
  unitsPer?: number;
};

export type PackScanLine = {
  id: string;
  sku?: string;
  barcode?: string;
  packBarcodes?: PackBarcode[];
  /** Ordered quantity in base pieces. */
  quantity: number;
  unitsPer?: number;
  documentUnit?: string;
  baseUom?: string;
};

export type ParsedPackScan = {
  code: string;
  /** Set when the scan includes a piece count. */
  pieces?: number;
};

export type PackScanHit = {
  ok: true;
  lineId: string;
  addPieces: number;
  nextPicked: number;
};

export type PackScanMiss = {
  ok: false;
  error: string;
  lineId?: string;
  over?: boolean;
};

const UNIT_WORDS: Record<string, [string, string]> = {
  carton: ["carton", "cartons"],
  box: ["box", "boxes"],
  bale: ["bale", "bales"],
  outer: ["outer", "outers"],
};

/** Catalog weight/volume (a 25kg tub) is the product size, not the order quantity unit. */
const SIZE_UOMS = new Set(["kg", "g", "mg", "ton", "tonne", "l", "ml", "lb"]);
const PIECE_UOMS = new Set(["ea", "pc", "pcs", "piece", "pieces", "unit", "rrp"]);

function norm(value: string | undefined | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function trimNum(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

function unitWord(unit: string, count: number): string {
  const lower = unit.trim().toLowerCase();
  const pair = UNIT_WORDS[lower];
  if (pair) return count === 1 ? pair[0] : pair[1];
  return lower || "pack";
}

export function parsePackScan(raw: string): ParsedPackScan | { error: string } {
  const text = raw.trim();
  if (!text) return { error: "Scan a barcode" };
  const tokens = text.split(/\s+/);
  if (tokens.length === 1) return { code: tokens[0] };
  if (tokens.length === 2) {
    const pieces = Number(tokens[1]);
    if (!Number.isFinite(pieces) || pieces <= 0) {
      return { error: "Piece count must be greater than zero" };
    }
    return { code: tokens[0], pieces };
  }
  return { error: "Unrecognised scan. Use the product barcode, or barcode then pieces." };
}

function productHits(code: string, lines: PackScanLine[], pieces: number | undefined): Array<{ line: PackScanLine; pieces: number }> {
  const n = norm(code);
  const matched = lines.filter((line) => norm(line.barcode) === n || (line.sku && norm(line.sku) === n));
  if (!matched.length) return [];
  const add = pieces ?? 1;
  return matched.map((line) => ({ line, pieces: add }));
}

function packHits(code: string, lines: PackScanLine[], pieces: number | undefined): Array<{ line: PackScanLine; pieces: number }> {
  const n = norm(code);
  const hits: Array<{ line: PackScanLine; pieces: number }> = [];
  for (const line of lines) {
    const pack = (line.packBarcodes ?? []).find((row) => norm(row.barcode) === n);
    if (!pack) continue;
    const fromPack = pack.unitsPer && pack.unitsPer > 0 ? pack.unitsPer : line.unitsPer && line.unitsPer > 1 ? line.unitsPer : 1;
    hits.push({ line, pieces: pieces ?? fromPack });
  }
  return hits;
}

export function matchPackScan(
  raw: string,
  lines: PackScanLine[],
  pickedByLineId: Record<string, number>
): PackScanHit | PackScanMiss {
  const parsed = parsePackScan(raw);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const hits = productHits(parsed.code, lines, parsed.pieces);
  const resolved = hits.length ? hits : packHits(parsed.code, lines, parsed.pieces);
  if (!resolved.length) {
    return { ok: false, error: "Not on this order" };
  }
  for (const hit of resolved) {
    const picked = pickedByLineId[hit.line.id] ?? 0;
    const next = picked + hit.pieces;
    if (next <= hit.line.quantity + 1e-9) {
      return { ok: true, lineId: hit.line.id, addPieces: hit.pieces, nextPicked: next };
    }
  }
  return {
    ok: false,
    error: "Scan would exceed the ordered quantity",
    lineId: resolved[0].line.id,
    over: true,
  };
}

/**
 * Count unit for a line that is not broken into a larger pack.
 * A 25kg product ordered as 1 PCS stays "1 pcs". Weight on the product master is ignored.
 * A configured pack unit on the order (carton, box) is kept.
 */
function countUnitLabel(line: { documentUnit?: string }, count: number): string {
  const doc = norm(line.documentUnit);
  if (!doc || PIECE_UOMS.has(doc) || SIZE_UOMS.has(doc)) return "pcs";
  return unitWord(line.documentUnit || doc, count);
}

/** Pieces shown in the order’s pack (carton, box) plus leftover pieces. */
export function formatPackQty(
  pieces: number,
  line: { unitsPer?: number; documentUnit?: string; baseUom?: string }
): string {
  const n = Number.isFinite(pieces) ? Math.max(0, pieces) : 0;
  const per = line.unitsPer ?? 0;
  if (!(per > 1)) return `${trimNum(n)} ${countUnitLabel(line, n)}`;
  const unit = line.documentUnit || "carton";
  const cartons = Math.floor(n / per + 1e-9);
  const rem = Math.round((n - cartons * per) * 1000) / 1000;
  if (cartons > 0 && rem > 1e-9) {
    return `${cartons} ${unitWord(unit, cartons)} + ${trimNum(rem)} pcs`;
  }
  if (cartons > 0) return `${cartons} ${unitWord(unit, cartons)}`;
  if (n <= 1e-9) return `0 ${unitWord(unit, 0)}`;
  return `${trimNum(rem)} pcs`;
}

export function suggestedCartonsCount(
  lines: Array<{ id: string; unitsPer?: number }>,
  pickedByLineId: Record<string, number>
): number {
  let total = 0;
  for (const line of lines) {
    const per = line.unitsPer ?? 0;
    if (!(per > 1)) continue;
    const picked = pickedByLineId[line.id] ?? 0;
    total += Math.floor(picked / per + 1e-9);
  }
  return total;
}

export function pickedPiecesByLine(draft: Record<string, string>, fallback: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = { ...fallback };
  for (const [id, raw] of Object.entries(draft)) {
    const n = Number(raw);
    out[id] = Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return out;
}
