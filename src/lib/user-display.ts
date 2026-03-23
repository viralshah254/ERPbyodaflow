import type { User } from "@/types/erp";

/**
 * Human-readable name for UI: prefers ERP first/last name, otherwise a readable
 * label derived from the email local-part (never the full email as the primary title).
 */
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return "";
  const fromFields = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fromFields) return fromFields;
  return formatEmailLocalPartAsDisplayName(user.email);
}

function formatEmailLocalPartAsDisplayName(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return email;
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

export function getUserInitials(user: User | null | undefined): string {
  if (!user) return "U";
  const fromFields = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("");
  if (fromFields.length >= 1) return fromFields.slice(0, 2).toUpperCase();

  const display = getUserDisplayName(user);
  const words = display.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return user.email?.[0]?.toUpperCase() ?? "U";
}
