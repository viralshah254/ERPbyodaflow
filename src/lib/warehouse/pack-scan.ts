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

/** Keys from a USB scanner arrive faster than typing. */
export const SCANNER_KEY_GAP_MS = 50;

export type ScannerBuffer = {
  text: string;
  lastAt: number;
  rapid: boolean;
};

export function createScannerBuffer(): ScannerBuffer {
  return { text: "", lastAt: 0, rapid: true };
}

export type ScannerKeyResult = {
  buffer: ScannerBuffer;
  /** Stop the key from landing in whatever field is focused. */
  swallow: boolean;
  /** Complete barcode read, including an optional piece count. */
  scan?: string;
};

export type ScannerKeyOpts = {
  scanFieldFocused: boolean;
  /**
   * Live value of the Scan pack input. Used on Enter when that field is focused so
   * paste, backspace, and edits win over the key buffer (which ignores Backspace).
   */
  scanFieldValue?: string;
};

/** Pick field vs wedge buffer; keep a tab/space separator the input may have dropped. */
function resolveScanRaw(fromField: string, fromBuffer: string): string {
  if (fromField && fromBuffer) {
    if (/\s/.test(fromBuffer) && !/\s/.test(fromField)) return fromBuffer;
    return fromField;
  }
  return fromField || fromBuffer;
}

/**
 * A supermarket scanner types into whatever is focused and ends with Enter.
 * Top Food EAN-13 pack labels often send barcode, then Tab, then piece count.
 * Rapid keys are captured even when a product row is focused. Slow typing in
 * another field is left alone.
 */
export function pushScannerKey(
  buffer: ScannerBuffer,
  key: string,
  now: number,
  opts: ScannerKeyOpts
): ScannerKeyResult {
  if (key === "Enter") {
    const fromField = opts.scanFieldFocused ? String(opts.scanFieldValue ?? "").trim() : "";
    const fromBuffer = buffer.text.trim();
    const raw = resolveScanRaw(fromField, fromBuffer);
    const next = createScannerBuffer();
    const accept =
      raw.length > 0 && (opts.scanFieldFocused || (buffer.rapid && fromBuffer.length >= 3));
    if (!accept) return { buffer: next, swallow: false };
    return { buffer: next, swallow: true, scan: raw };
  }
  // Scanners suffix the EAN-13 with Tab before the piece count — do not move focus.
  if (key === "Tab") {
    const gap = buffer.lastAt === 0 ? SCANNER_KEY_GAP_MS + 1 : now - buffer.lastAt;
    const inScan =
      opts.scanFieldFocused || (buffer.text.length > 0 && gap <= SCANNER_KEY_GAP_MS);
    if (!inScan) return { buffer, swallow: false };
    return {
      buffer: { text: `${buffer.text}\t`, lastAt: now, rapid: true },
      swallow: true,
    };
  }
  if (key.length !== 1) return { buffer, swallow: false };
  if (opts.scanFieldFocused) {
    const gap = buffer.lastAt === 0 ? 0 : now - buffer.lastAt;
    const rapid = buffer.text.length === 0 || gap <= SCANNER_KEY_GAP_MS;
    return {
      buffer: { text: buffer.text + key, lastAt: now, rapid: buffer.text.length === 0 ? true : rapid },
      swallow: false,
    };
  }
  const gap = buffer.lastAt === 0 ? SCANNER_KEY_GAP_MS + 1 : now - buffer.lastAt;
  const continuing = buffer.text.length > 0 && gap <= SCANNER_KEY_GAP_MS;
  if (!continuing) {
    return { buffer: { text: key, lastAt: now, rapid: false }, swallow: false };
  }
  return {
    buffer: { text: buffer.text + key, lastAt: now, rapid: true },
    swallow: true,
  };
}

/**
 * USB wedge read: EAN-13 (or other product code), optional whitespace (space or tab),
 * then pieces in the pack. When Tab is swallowed, qty digits may stick to the EAN
 * (`61620052020716` → code + 6).
 */
export function parsePackScan(raw: string): ParsedPackScan | { error: string } {
  const text = raw.trim();
  if (!text) return { error: "Scan a barcode" };
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    const only = tokens[0];
    const ean13WithQty = /^(\d{13})(\d+)$/.exec(only);
    if (ean13WithQty) {
      const pieces = Number(ean13WithQty[2]);
      if (Number.isFinite(pieces) && pieces > 0) {
        return { code: ean13WithQty[1], pieces };
      }
    }
    return { code: only };
  }
  if (tokens.length === 2) {
    const pieces = Number(tokens[1]);
    if (!Number.isFinite(pieces) || pieces <= 0) {
      return { error: "Piece count must be greater than zero" };
    }
    return { code: tokens[0], pieces };
  }
  return { error: "Unrecognised scan. Use the product barcode, or barcode then pieces." };
}

/** Pieces to add for one scan of this code on a line (explicit qty wins). */
function piecesForScan(line: PackScanLine, code: string, pieces: number | undefined): number {
  if (pieces != null) return pieces;
  const n = norm(code);
  const packSizes = (line.packBarcodes ?? [])
    .filter((row) => norm(row.barcode) === n && row.unitsPer != null && row.unitsPer > 0)
    .map((row) => row.unitsPer as number);
  if (packSizes.length) {
    // Same EAN on inner + carton: prefer the smaller shrink-wrap (e.g. ×6 over ×24).
    return Math.min(...packSizes);
  }
  // Packed-box scan of the product EAN: one outer when the line is in pack UOM.
  if (line.unitsPer && line.unitsPer > 1) return line.unitsPer;
  return 1;
}

function linesMatchingCode(code: string, lines: PackScanLine[]): PackScanLine[] {
  const n = norm(code);
  return lines.filter(
    (line) =>
      norm(line.barcode) === n ||
      (line.sku != null && line.sku.length > 0 && norm(line.sku) === n) ||
      (line.packBarcodes ?? []).some((row) => norm(row.barcode) === n)
  );
}

export function matchPackScan(
  raw: string,
  lines: PackScanLine[],
  pickedByLineId: Record<string, number>
): PackScanHit | PackScanMiss {
  const parsed = parsePackScan(raw);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const matched = linesMatchingCode(parsed.code, lines);
  if (!matched.length) {
    return { ok: false, error: "Not on this order" };
  }
  const resolved = matched.map((line) => ({
    line,
    pieces: piecesForScan(line, parsed.code, parsed.pieces),
  }));
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

/**
 * A new count replaces the starting 0. Typing 5 into "0" becomes "5", not "05".
 * "0." is kept so a decimal can still be entered.
 */
export function replacePlaceholderZero(previous: string | undefined, next: string): string {
  const prev = (previous ?? "0").trim();
  if (prev !== "0") return next;
  if (next === "" || next === "0" || next.startsWith("0.")) return next;
  if (next.startsWith("0")) return next.replace(/^0+/, "") || "0";
  return next;
}

export function pickedPiecesByLine(draft: Record<string, string>, fallback: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = { ...fallback };
  for (const [id, raw] of Object.entries(draft)) {
    const n = Number(raw);
    out[id] = Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return out;
}
