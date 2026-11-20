const SHELF_PURPOSES = new Set(["STORAGE", "RECEIVING", "DISPATCH"]);

type StoreRow = {
  id: string;
  code?: string | null;
  name?: string | null;
  purpose?: string | null;
};

function purposeOf(store: StoreRow): string {
  return store.purpose?.trim().toUpperCase() ?? "";
}

/** Storage, Receiving, and Dispatch hold stock that can show on the shelf. A route store has no purpose. */
export function isShelfStore(store: StoreRow): boolean {
  return SHELF_PURPOSES.has(purposeOf(store));
}

function looksLikeProductionStore(store: StoreRow): boolean {
  const code = store.code?.trim().toLowerCase() ?? "";
  const name = store.name?.trim().toLowerCase() ?? "";
  return code === "prd" || name.includes("production");
}

/**
 * Recommended store, then other shelf stores, then route stores.
 * A route can still be the recommended input when the ingredients are there.
 */
export function compareStoresForBatch<T extends StoreRow>(
  a: T,
  b: T,
  recommendedId?: string,
  label: (store: T) => string = (store) => [store.code, store.name].filter(Boolean).join(" "),
): number {
  const rank = (store: T) => {
    if (recommendedId && store.id === recommendedId) return 0;
    if (isShelfStore(store)) return 1;
    return 2;
  };
  const delta = rank(a) - rank(b);
  if (delta) return delta;
  return label(a).localeCompare(label(b), undefined, { sensitivity: "base" });
}

/** Output recommendation is a shelf store. A formula shelf store wins. Otherwise the production store. */
export function recommendOutputStore<T extends StoreRow>(stores: T[], preferredId?: string): T | undefined {
  const shelf = stores.filter(isShelfStore);
  if (preferredId) {
    const chosen = shelf.find((store) => store.id === preferredId);
    if (chosen) return chosen;
  }
  const ranked = [...shelf].sort((a, b) => compareStoresForBatch(a, b));
  return ranked.find(looksLikeProductionStore) ?? ranked[0];
}
