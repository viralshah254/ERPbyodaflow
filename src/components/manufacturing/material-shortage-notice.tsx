import Link from "next/link";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import { PURCHASE_HREF, readableProductName, type MaterialShortageRow } from "@/lib/manufacturing/material-shortage";

export function MaterialShortageNotice({ title, items }: { title: string; items: MaterialShortageRow[] }) {
  if (!items.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm">
      <p className="font-medium">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => {
          const name = readableProductName(item.productName);
          return (
            <li key={`${item.productId}-${item.warehouseId ?? ""}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span>
                <span className={name === "Ingredient" ? undefined : `font-medium ${CAPS_ON_PRODUCT_CLASS}`}>{name}</span>
                {" is short "}
                <span className="tabular-nums">{item.short}{item.uom ? ` ${item.uom}` : ""}</span>
                {item.warehouseName ? ` in ${item.warehouseName}` : " in this store"}.
              </span>
              <span className="flex gap-3 text-xs">
                <Link href={PURCHASE_HREF} className="text-primary underline-offset-2 hover:underline">Purchase</Link>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
