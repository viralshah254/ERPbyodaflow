/** Strip commas and non-numeric except one decimal point — for controlled amount/weight fields. */
export function sanitizeDecimalInput(s: string): string {
  let t = s.replace(/,/g, "").replace(/[^\d.]/g, "");
  const firstDot = t.indexOf(".");
  if (firstDot !== -1) {
    t = t.slice(0, firstDot + 1) + t.slice(firstDot + 1).replace(/\./g, "");
  }
  return t;
}

/** Parse a user-entered decimal string (commas allowed). */
export function parseDecimalString(s: string): number {
  const t = sanitizeDecimalInput(s).trim();
  if (t === "" || t === ".") return NaN;
  return Number(t);
}

/** Parse only when the user has finished a decimal token (not trailing "."). */
export function parsePartialDecimalString(s: string): number | null {
  const t = sanitizeDecimalInput(s).trim();
  if (t === "" || t === "." || t.endsWith(".")) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Format with thousands separators when blurred; preserve measured decimal precision. */
export function formatDecimalDisplay(raw: string): string {
  if (!raw.trim()) return "";
  const n = parseDecimalString(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString("en-US", { maximumFractionDigits: 20 });
}
