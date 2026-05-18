/**
 * Resolve tenant branding slug before login:
 * 1. `?brand=` query (highest precedence)
 * 2. NEXT_PUBLIC_LOGIN_BRAND_SLUG (demo / single-tenant host)
 * 3. First label of host when NEXT_PUBLIC_BRANDING_ROOT_DOMAIN matches (e.g. coolcatch.app.example.com).
 */
export function resolveLoginBrandSlug(searchParamBrand: string | null): string | null {
  const fromQuery = searchParamBrand?.trim();
  if (fromQuery) return fromQuery.toLowerCase();

  const fromEnv =
    typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_LOGIN_BRAND_SLUG?.trim() ?? "") : "";
  if (fromEnv) return fromEnv.toLowerCase();

  if (typeof window === "undefined") return null;

  const root = (
    typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_BRANDING_ROOT_DOMAIN ?? "") : ""
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
  if (!root) return null;

  const host = window.location.hostname.toLowerCase();
  if (host === root || host === `www.${root}`) return null;

  const suffix = `.${root}`;
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length);
    if (sub.length > 0 && !sub.includes(".")) return sub.toLowerCase();
  }
  return null;
}
