/**
 * Normalize Kenyan phone numbers to digits with country code 254 (no +).
 * Examples:
 *   0712345678  → 254712345678
 *   0112345678  → 254112345678
 *   712345678   → 254712345678
 *   +254712345678 → 254712345678
 *   254712345678 → 254712345678
 */
export function normalizeKenyaPhone(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0") && digits.length >= 9) {
    return `254${digits.slice(1)}`;
  }
  if (digits.startsWith("254")) {
    // Fix accidental +2540… / 2540…
    if (digits.length > 3 && digits[3] === "0") {
      return `254${digits.slice(4)}`;
    }
    return digits;
  }
  if (digits.startsWith("7") || digits.startsWith("1")) {
    return `254${digits}`;
  }
  return digits;
}

/** Normalize for API payloads; returns undefined when empty. */
export function normalizeKenyaPhoneOptional(
  raw: string | null | undefined
): string | undefined {
  const normalized = normalizeKenyaPhone(raw);
  return normalized || undefined;
}
