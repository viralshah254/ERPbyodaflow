/**
 * Privacy / account-data requests inbox. Optional; when unset, UIs fall back to /contact.
 * Set in deployment: NEXT_PUBLIC_PRIVACY_EMAIL
 */
export function getPrivacyInboxEmail(): string | undefined {
  const raw = typeof process.env.NEXT_PUBLIC_PRIVACY_EMAIL === "string"
    ? process.env.NEXT_PUBLIC_PRIVACY_EMAIL.trim()
    : "";
  return raw.length > 0 ? raw : undefined;
}
