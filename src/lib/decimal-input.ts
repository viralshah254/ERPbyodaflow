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

/** Format with thousands separators for display when the field is not focused. */
export function formatDecimalDisplay(raw: string): string {
  if (!raw.trim()) return "";
  const n = parseDecimalString(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString("en-US", { maximumFractionDigits: 10 });
}
