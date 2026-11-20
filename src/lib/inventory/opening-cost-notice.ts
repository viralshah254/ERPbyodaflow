import { toast } from "sonner";
import { isOpeningCostPostError, openingCostsHref, type OpeningCostGap } from "@/lib/api/grn";

type NamedLine = { productId: string; productName?: string; sku?: string };

function productLabel(product: { name?: string; code?: string }): string {
  const name = product.name?.trim() ?? "";
  const code = product.code?.trim() ?? "";
  if (name && code && name.toLowerCase() !== code.toLowerCase()) return `${name} (${code})`;
  return name || code;
}

function productsFrom(error: unknown): OpeningCostGap[] | undefined {
  const body = (error as { body?: { products?: unknown }; products?: unknown }).body;
  const raw = (error as { products?: unknown }).products ?? body?.products;
  if (!Array.isArray(raw)) return undefined;
  const products = raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { productId?: unknown; code?: unknown; name?: unknown };
    const productId = String(row.productId ?? "").trim();
    if (!productId) return [];
    return [{ productId, code: String(row.code ?? ""), name: String(row.name ?? "") }];
  });
  return products.length ? products : undefined;
}

/** Name the stocked product and point at Opening costs. Falls back to the id on the batch when the server only sent that id. */
export function openingCostNotice(error: unknown, lines: NamedLine[] = []): { message: string; href: string } | null {
  const err = error as { code?: string; message?: string; body?: { code?: string; error?: string } };
  const message = err.message || (typeof err.body?.error === "string" ? err.body.error : "");
  const code = err.code ?? err.body?.code;
  if (!isOpeningCostPostError({ code, message })) return null;
  let products = productsFrom(error);
  if (!products?.length) {
    const id = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (id) {
      const line = lines.find((item) => item.productId === id);
      products = [{ productId: id, code: line?.sku ?? "", name: line?.productName ?? "" }];
    }
  }
  const label = products?.map(productLabel).filter(Boolean).join(", ");
  return {
    message: label ? `${label} already has stock, but no opening cost. Enter the opening cost before moving it.` : message,
    href: openingCostsHref(products),
  };
}

export function toastStockMoveError(error: unknown, lines: NamedLine[], fallback: string) {
  const notice = openingCostNotice(error, lines);
  if (!notice) {
    toast.error(error instanceof Error ? error.message : fallback);
    return;
  }
  toast.error(notice.message, {
    action: { label: "Enter opening cost", onClick: () => { window.location.href = notice.href; } },
    duration: 12000,
  });
}
