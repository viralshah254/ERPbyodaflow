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

/** True when sizes match, or when either side is unknown. */
export function isSameOdaflowPackSize(a?: string, b?: string): boolean {
  const normalize = (value?: string) => value?.trim().toLowerCase().replace(/\s+/g, "") ?? "";
  const left = normalize(a);
  const right = normalize(b);
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
