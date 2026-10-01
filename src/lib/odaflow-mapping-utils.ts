import { normalizeFmcgSize } from "@/lib/products/fmcg-size";

export type SfaProductKind = "modern_trade" | "general_trade";

export function sfaProductKindFromOrderChannel(channel?: string): SfaProductKind | undefined {
  if (channel === "modern_trade") return "modern_trade";
  if (channel === "direct" || channel === "distributor" || channel === "van_sales") {
    return "general_trade";
  }
  return undefined;
}

export function sfaProductKindLabel(kind?: SfaProductKind): string | undefined {
  if (kind === "modern_trade") return "Modern Trade";
  if (kind === "general_trade") return "General Trade";
  return undefined;
}

export type ExistingProductMapping = {
  externalId: string;
  odaflowPackSize?: string;
  sfaProductKind?: SfaProductKind;
};

const CANONICAL_SIZE_RE = /^\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)?(?:g|kg|ml|l|cl|pcs)$/i;

/** "60G", "60 GM", and "60GM" all become "60g". Other labels stay as written. */
function normalizePackSizeLabel(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const sized = normalizeFmcgSize(trimmed);
  if (sized && CANONICAL_SIZE_RE.test(sized)) return sized.toLowerCase();
  return trimmed.toLowerCase().replace(/\s+/g, "");
}

/** True when sizes match, or when either side is unknown. */
export function isSameOdaflowPackSize(a?: string, b?: string): boolean {
  const left = normalizePackSizeLabel(a);
  const right = normalizePackSizeLabel(b);
  if (!left || !right) return true;
  return left === right;
}

/**
 * A saved link conflicts only when this line is a different size.
 * The same size may already be linked in Modern Trade and General Trade,
 * or under another SFA id that spells the size differently.
 */
export function filterConflictingProductMappings(
  currentExternalId: string,
  currentPackSize: string | undefined,
  _currentKind: SfaProductKind | undefined,
  existing: ExistingProductMapping[]
): ExistingProductMapping[] {
  return existing.filter((mapping) => {
    if (mapping.externalId === currentExternalId) return false;
    return !isSameOdaflowPackSize(currentPackSize, mapping.odaflowPackSize);
  });
}

export function hasSameCatalogConflict(
  currentKind: SfaProductKind | undefined,
  currentExternalId: string,
  mapping: ExistingProductMapping
): boolean {
  return (
    mapping.externalId !== currentExternalId &&
    Boolean(currentKind && mapping.sfaProductKind && currentKind === mapping.sfaProductKind)
  );
}
