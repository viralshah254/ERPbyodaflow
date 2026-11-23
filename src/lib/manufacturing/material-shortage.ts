export type MaterialShortageRow = {
  productId: string;
  productName: string;
  productSku?: string;
  barcode?: string;
  warehouseId?: string;
  warehouseName?: string;
  needed?: number;
  onHand?: number;
  short: number;
  uom?: string;
};

/** Names that are company or record ids stay off the screen. */
export function readableProductName(name?: string): string {
  const value = name?.trim() ?? "";
  if (!value || value.startsWith("org-") || value.includes(":") || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return "Ingredient";
  }
  return value;
}

export const PURCHASE_HREF = "/docs/purchase-order/new";

function shortageFromUnknown(value: unknown): MaterialShortageRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const short = Number(row.short);
  if (!(short > 0)) return null;
  const productId = typeof row.productId === "string" ? row.productId : "";
  return {
    productId,
    productName: readableProductName(typeof row.productName === "string" ? row.productName : undefined),
    warehouseId: typeof row.warehouseId === "string" ? row.warehouseId : undefined,
    warehouseName: typeof row.warehouseName === "string" ? row.warehouseName : undefined,
    needed: Number(row.needed),
    onHand: Number(row.onHand),
    short,
    uom: typeof row.uom === "string" ? row.uom : undefined,
  };
}

/** Turn a receive or issue failure into named shortages. Raw ids are not returned. */
export function materialShortagesFromError(error: unknown): MaterialShortageRow[] | null {
  const body = (error as { body?: { code?: string; shortages?: unknown; error?: string } }).body;
  const message = error instanceof Error ? error.message : typeof body?.error === "string" ? body.error : "";
  if (body?.code === "INSUFFICIENT_MATERIALS" && Array.isArray(body.shortages)) {
    return body.shortages.flatMap((item) => {
      const row = shortageFromUnknown(item);
      return row ? [row] : [];
    });
  }
  if (!/not enough stock|insufficient material/i.test(message)) return null;
  return [...message.matchAll(/short ([\d.]+)/gi)].flatMap((match) => {
    const short = Number(match[1]);
    return short > 0 ? [{ productId: "", productName: "Ingredient", short }] : [];
  });
}
