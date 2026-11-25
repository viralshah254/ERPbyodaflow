/** Opens Create transfer with the stores, products and quantities already filled in. Quantities are in the stock unit. */
export type TransferPrefill = {
  fromWarehouseId?: string;
  toWarehouseId?: string;
  lines: Array<{ productId: string; quantity: number }>;
  reference?: string;
  /** Opened in its own tab; the done screen offers to go back to the order or the loading note. */
  returnTo?: TransferReturnTo;
  /** In-app page to go back to when done, e.g. the loading note that needed the stock. */
  backHref?: string;
};

export type TransferReturnTo = "order" | "load";

export function parseTransferReturnTo(search: string): TransferReturnTo | null {
  const value = new URLSearchParams(search).get("return");
  return value === "order" || value === "load" ? value : null;
}

function safeAppPath(value: string | null | undefined): string | null {
  const path = value?.trim();
  return path && path.startsWith("/") && !path.startsWith("//") ? path : null;
}

export const ROUTE_PICK_LISTS_HREF = "/warehouse/route-pick-lists";

export function routeLoadNoteHref(noteId: string): string {
  return `${ROUTE_PICK_LISTS_HREF}/${encodeURIComponent(noteId)}`;
}

/**
 * Where a transfer made for a loading note leads back to: that note when the link named it,
 * else the route pick lists for any transfer referenced "Loader note …".
 */
export function transferBackLink(search: string, reference?: string): { href: string; label: string } | null {
  const back = safeAppPath(new URLSearchParams(search).get("back"));
  if (back) return { href: back, label: back.startsWith(ROUTE_PICK_LISTS_HREF) ? "Back to the loading note" : "Back" };
  if (reference && /^loader note\b/i.test(reference.trim())) return { href: ROUTE_PICK_LISTS_HREF, label: "Back to route pick lists" };
  return null;
}

export function transferPrefillHref(prefill: TransferPrefill): string {
  const params = new URLSearchParams();
  if (prefill.fromWarehouseId?.trim()) params.set("from", prefill.fromWarehouseId.trim());
  if (prefill.toWarehouseId?.trim()) params.set("to", prefill.toWarehouseId.trim());
  for (const line of prefill.lines) {
    if (line.productId && line.quantity > 0) params.append("line", `${line.productId}:${line.quantity}`);
  }
  if (prefill.reference?.trim()) params.set("ref", prefill.reference.trim());
  if (prefill.returnTo) params.set("return", prefill.returnTo);
  const back = safeAppPath(prefill.backHref);
  if (back) params.set("back", back);
  const query = params.toString();
  return query ? `/warehouse/transfers/new?${query}` : "/warehouse/transfers/new";
}

export function parseTransferPrefill(search: string): TransferPrefill | null {
  const params = new URLSearchParams(search);
  const fromWarehouseId = params.get("from")?.trim() || undefined;
  const toWarehouseId = params.get("to")?.trim() || undefined;
  const lines = params.getAll("line").flatMap((raw) => {
    const at = raw.lastIndexOf(":");
    const productId = at > 0 ? raw.slice(0, at).trim() : "";
    const quantity = Number(raw.slice(at + 1));
    return productId && Number.isFinite(quantity) && quantity > 0 ? [{ productId, quantity }] : [];
  });
  const reference = params.get("ref")?.trim() || undefined;
  if (!fromWarehouseId && !toWarehouseId && !lines.length) return null;
  return {
    ...(fromWarehouseId ? { fromWarehouseId } : {}),
    ...(toWarehouseId ? { toWarehouseId } : {}),
    lines,
    ...(reference ? { reference } : {}),
  };
}
