/** Opens Create transfer with the stores, products and quantities already filled in. Quantities are in the stock unit. */
export type TransferPrefill = {
  fromWarehouseId?: string;
  toWarehouseId?: string;
  lines: Array<{ productId: string; quantity: number }>;
  reference?: string;
  /** Opened in its own tab from an unsaved order; the done screen offers to go back. */
  returnToOrder?: boolean;
};

export function transferPrefillHref(prefill: TransferPrefill): string {
  const params = new URLSearchParams();
  if (prefill.fromWarehouseId?.trim()) params.set("from", prefill.fromWarehouseId.trim());
  if (prefill.toWarehouseId?.trim()) params.set("to", prefill.toWarehouseId.trim());
  for (const line of prefill.lines) {
    if (line.productId && line.quantity > 0) params.append("line", `${line.productId}:${line.quantity}`);
  }
  if (prefill.reference?.trim()) params.set("ref", prefill.reference.trim());
  if (prefill.returnToOrder) params.set("return", "order");
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
