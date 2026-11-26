/** Sales documents that take a delivery address from the customer. */
export const CUSTOMER_DELIVERY_DOC_TYPES = ["sales-order", "invoice", "credit-note"] as const;

const COUNTRY_ONLY = new Set(["ke", "kenya"]);

/** Street address for delivery. A country code on its own is not an address. */
export function customerDeliveryAddressText(address?: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
} | null): string {
  if (!address) return "";
  const parts = [address.line1, address.line2, address.city, address.region, address.postalCode]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  if (parts.length === 0) return "";
  const country = typeof address.country === "string" ? address.country.trim() : "";
  if (country && !COUNTRY_ONLY.has(country.toLowerCase())) parts.push(country);
  return parts.join(", ");
}

export function isCustomerDeliveryDoc(type: string): boolean {
  return (CUSTOMER_DELIVERY_DOC_TYPES as readonly string[]).includes(type);
}
