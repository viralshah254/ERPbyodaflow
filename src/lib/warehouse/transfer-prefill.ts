/** Opens Create transfer with the source store, products and quantities already filled in. */
export type TransferPrefill = {
  fromWarehouseId: string;
  lines: Array<{ productId: string; quantity: number }>;
  reference?: string;
};

export function transferPrefillHref(prefill: TransferPrefill): string {
  const params = new URLSearchParams({ from: prefill.fromWarehouseId });
  for (const line of prefill.lines) {
    if (line.productId && line.quantity > 0) params.append("line", `${line.productId}:${line.quantity}`);
  }
  if (prefill.reference?.trim()) params.set("ref", prefill.reference.trim());
  return `/warehouse/transfers/new?${params.toString()}`;
}

export function parseTransferPrefill(search: string): TransferPrefill | null {
  const params = new URLSearchParams(search);
  const fromWarehouseId = params.get("from")?.trim();
  if (!fromWarehouseId) return null;
  const lines = params.getAll("line").flatMap((raw) => {
    const at = raw.lastIndexOf(":");
    const productId = at > 0 ? raw.slice(0, at).trim() : "";
    const quantity = Number(raw.slice(at + 1));
    return productId && Number.isFinite(quantity) && quantity > 0 ? [{ productId, quantity }] : [];
  });
  const reference = params.get("ref")?.trim() || undefined;
  return { fromWarehouseId, lines, ...(reference ? { reference } : {}) };
}
