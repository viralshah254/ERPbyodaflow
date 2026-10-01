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
 * One ERP product may link to at most one SFA product per catalog (MT or GT).
 * Cross-catalog links (MT + GT, same size) are allowed.
 */
export function filterConflictingProductMappings(
  currentExternalId: string,
  currentPackSize: string | undefined,
  currentKind: SfaProductKind | undefined,
  existing: ExistingProductMapping[]
): ExistingProductMapping[] {
  return existing.filter((mapping) => {
    if (mapping.externalId === currentExternalId) return false;

    if (currentKind && mapping.sfaProductKind && currentKind === mapping.sfaProductKind) {
      return true;
    }

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
