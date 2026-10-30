"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { fetchProductsPageApi } from "@/lib/api/products";
import { searchPartyLookupOptionsApi } from "@/lib/api/parties";
import type { HubExtractedLine, ScannedDocument } from "@/lib/types/document-hub";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DraftLine = {
  fileText: string;
  quantity: string;
  unitPrice: string;
  uom?: string;
  itemCode?: string;
  productId?: string;
  productLabel?: string;
};

type Draft = {
  partyId: string;
  partyLabel: string;
  documentNumber: string;
  documentDate: string;
  dueDate: string;
  taxPin: string;
  tax: string;
  total: string;
  lines: DraftLine[];
};

function moneyText(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return String(value);
}

function parseMoney(value: string): number | undefined {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : undefined;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Native date inputs only accept yyyy-mm-dd. Scans often arrive as "30 October 2026". */
function toDateInputValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (month) return `${named[3]}-${String(month).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
  }
  const parts = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!parts) return "";
  const first = Number(parts[1]);
  const second = Number(parts[2]);
  let year = Number(parts[3]);
  if (year < 100) year += 2000;
  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : second > 12 ? first : second;
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lineAmount(line: DraftLine): number {
  const quantity = parseMoney(line.quantity) ?? 0;
  const price = parseMoney(line.unitPrice) ?? 0;
  if (!quantity && !price) return 0;
  return Math.round(quantity * price * 100) / 100;
}

function draftFrom(item: ScannedDocument): Draft {
  const fields = item.fields;
  return {
    partyId: fields.partyId ?? "",
    partyLabel: fields.partyName ?? "",
    documentNumber: fields.documentNumber || fields.invoiceNumber || "",
    documentDate: fields.documentDate ?? "",
    dueDate: fields.dueDate ?? "",
    taxPin: fields.taxPin ?? "",
    tax: moneyText(fields.tax),
    total: moneyText(fields.total),
    lines: (fields.lines ?? []).map((line) => {
      const quantity = line.quantity;
      const unitPrice = line.unitPrice ?? (quantity && line.amount != null ? Math.round((line.amount / quantity) * 100) / 100 : line.amount);
      return {
        fileText: line.description,
        quantity: moneyText(quantity ?? (line.amount != null ? 1 : undefined)),
        unitPrice: moneyText(unitPrice),
        uom: line.uom,
        itemCode: line.itemCode,
        productId: line.productId,
        productLabel: line.productId ? line.description : undefined,
      };
    }),
  };
}

function createPartyHref(role: "customer" | "supplier", name: string) {
  const params = new URLSearchParams({ tab: role === "supplier" ? "suppliers" : "customers", new: "1" });
  if (name.trim()) params.set("name", name.trim());
  return `/master/parties?${params.toString()}`;
}

function createProductHref(name: string) {
  const params = new URLSearchParams({ new: "1" });
  if (name.trim()) params.set("name", name.trim());
  return `/master/products?${params.toString()}`;
}

export function HubInvoiceEditor({
  item,
  role,
  onApprove,
}: {
  item: ScannedDocument;
  role?: "customer" | "supplier";
  onApprove: (body: {
    partyId?: string;
    fields: {
      partyName?: string;
      partyId?: string;
      taxPin?: string;
      documentNumber?: string;
      invoiceNumber?: string;
      documentDate?: string;
      dueDate?: string;
      subtotal?: number;
      tax?: number;
      total?: number;
      lines: HubExtractedLine[];
    };
  }) => Promise<void>;
}) {
  const router = useRouter();
  const currency = item.fields.currency || "KES";
  const scannedParty = item.fields.partyName?.trim() || "";
  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(item));
  const [totalLocked, setTotalLocked] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDraft(draftFrom(item));
    setTotalLocked(false);
  }, [item._id, item.updatedAt]);

  const subtotal = draft.lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const tax = parseMoney(draft.tax) ?? 0;
  const computedTotal = Math.round((subtotal + tax) * 100) / 100;
  const total = totalLocked ? (parseMoney(draft.total) ?? computedTotal) : computedTotal;
  const totalText = totalLocked ? draft.total : moneyText(computedTotal);
  const partyOption: AsyncSearchableSelectOption | null = draft.partyId
    ? { id: draft.partyId, label: draft.partyLabel || scannedParty || "Chosen party" }
    : null;

  async function loadParties(query: string): Promise<AsyncSearchableSelectOption[]> {
    if (!role) return [];
    const rows = await searchPartyLookupOptionsApi({ role, search: query.trim() || undefined, limit: 8 });
    return rows.map((row) => ({ id: row.id, label: row.label, description: row.taxId }));
  }

  async function loadProducts(query: string): Promise<AsyncSearchableSelectOption[]> {
    const page = await fetchProductsPageApi({ search: query.trim() || undefined, limit: 8, status: "ACTIVE" });
    return page.items.map((product) => ({
      id: product.id,
      label: product.name,
      description: [product.sku, product.unit].filter(Boolean).join(" · "),
    }));
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setTotalLocked(false);
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  async function handleApprove() {
    if (role && !draft.partyId) {
      toast.error(role === "supplier" ? "Choose the supplier this invoice belongs to." : "Choose the customer this invoice belongs to.");
      return;
    }
    const lines: HubExtractedLine[] = draft.lines.map((line) => ({
      description: (line.productLabel || line.fileText).trim(),
      quantity: parseMoney(line.quantity),
      unitPrice: parseMoney(line.unitPrice),
      amount: lineAmount(line),
      uom: line.uom,
      itemCode: line.itemCode,
      productId: line.productId,
    })).filter((line) => line.description);
    setSaving(true);
    try {
      await onApprove({
        partyId: draft.partyId || undefined,
        fields: {
          partyName: draft.partyLabel.trim() || scannedParty || undefined,
          partyId: draft.partyId || undefined,
          taxPin: draft.taxPin.trim() || undefined,
          documentNumber: draft.documentNumber.trim() || undefined,
          invoiceNumber: draft.documentNumber.trim() || undefined,
          documentDate: draft.documentDate.trim() || undefined,
          dueDate: draft.dueDate.trim() || undefined,
          subtotal,
          tax,
          total,
          lines,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  const noun = item.documentType === "supplier_invoice" ? "supplier invoice" : item.documentType.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {role === "customer" ? "Customer" : "Supplier"}
          </p>
          {scannedParty ? <p className="truncate text-xs text-muted-foreground">On the file: {scannedParty}</p> : null}
        </div>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <AsyncSearchableSelect
              value={draft.partyId || undefined}
              selectedOption={partyOption}
              onValueChange={(id) => {
                if (!id) setDraft((current) => ({ ...current, partyId: "", partyLabel: "" }));
              }}
              onOptionSelect={(option) => {
                setDraft((current) => ({
                  ...current,
                  partyId: option?.id ?? "",
                  partyLabel: option?.label ?? "",
                  taxPin: current.taxPin || option?.description || "",
                }));
              }}
              loadOptions={loadParties}
              minSearchLength={0}
              searchDebounceMs={200}
              placeholder={role === "customer" ? "Choose a customer" : "Choose a supplier"}
              searchPlaceholder={role === "customer" ? "Search customers" : "Search suppliers"}
              emptyMessage="No one in the books matches that."
              allowClear
              wrapLabels
              onCreateNew={(query) => router.push(createPartyHref(role ?? "supplier", query || scannedParty))}
              createNewLabel={role === "customer" ? "Add customer" : "Add supplier"}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label={role === "customer" ? "Add customer" : "Add supplier"}
            onClick={() => router.push(createPartyHref(role ?? "supplier", scannedParty))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <FieldInput label="Number" value={draft.documentNumber} onChange={(value) => setDraft((current) => ({ ...current, documentNumber: value }))} />
        <DateField label="Date" value={draft.documentDate} onChange={(value) => setDraft((current) => ({ ...current, documentDate: value }))} />
        <DateField label="Due" value={draft.dueDate} onChange={(value) => setDraft((current) => ({ ...current, dueDate: value }))} />
        <FieldInput label="Tax PIN" value={draft.taxPin} onChange={(value) => setDraft((current) => ({ ...current, taxPin: value }))} />
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Lines</p>
        <ul className="space-y-3">
          {draft.lines.map((line, index) => {
            const amount = lineAmount(line);
            const productOption: AsyncSearchableSelectOption | null = line.productId
              ? { id: line.productId, label: line.productLabel || line.fileText, description: line.itemCode }
              : null;
            return (
              <li key={`${line.fileText}-${index}`} className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">On the file</p>
                <p className="mt-0.5 text-sm font-medium leading-snug">{line.fileText}</p>
                <div className="mt-3 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <AsyncSearchableSelect
                      value={line.productId}
                      selectedOption={productOption}
                      onValueChange={(id) => {
                        if (!id) updateLine(index, { productId: undefined, productLabel: undefined, itemCode: undefined });
                      }}
                      onOptionSelect={(option) => {
                        const sku = option?.description?.split(" · ")[0];
                        updateLine(index, {
                          productId: option?.id,
                          productLabel: option?.label,
                          itemCode: sku || undefined,
                        });
                      }}
                      loadOptions={loadProducts}
                      minSearchLength={0}
                      searchDebounceMs={200}
                      placeholder="Choose a product"
                      searchPlaceholder="Search products"
                      emptyMessage="No product matches that."
                      allowClear
                      wrapLabels
                      onCreateNew={(query) => router.push(createProductHref(query || line.fileText))}
                      createNewLabel="Add product"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label="Add product"
                    onClick={() => router.push(createProductHref(line.fileText))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Qty</span>
                    <Input
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      inputMode="decimal"
                      aria-label={`Quantity ${index + 1}`}
                      className="mt-1 h-9 bg-background text-right tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Price</span>
                    <Input
                      value={line.unitPrice}
                      onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                      inputMode="decimal"
                      aria-label={`Price ${index + 1}`}
                      className="mt-1 h-9 bg-background text-right tabular-nums"
                    />
                  </label>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Amount</p>
                    <p className="mt-1 flex h-9 items-center justify-end text-sm font-medium tabular-nums">{formatMoney(amount, currency)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-3 border-t pt-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Subtotal</p>
          <p className="mt-2 text-sm font-medium tabular-nums">{formatMoney(subtotal, currency)}</p>
        </div>
        <FieldInput
          label="Tax"
          value={draft.tax}
          align="right"
          onChange={(value) => {
            setTotalLocked(false);
            setDraft((current) => ({ ...current, tax: value }));
          }}
        />
        <label className="col-span-2 block">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Total · {currency}</span>
          <Input
            value={totalText}
            onChange={(event) => {
              setTotalLocked(true);
              setDraft((current) => ({ ...current, total: event.target.value }));
            }}
            inputMode="decimal"
            aria-label="Total"
            className="mt-1 h-12 text-right text-2xl font-semibold tabular-nums"
          />
        </label>
      </section>
      {totalLocked && Math.abs(total - computedTotal) > 0.009 ? (
        <p className="text-xs text-muted-foreground">
          Lines plus tax come to {formatMoney(computedTotal, currency)}. The total you typed is {formatMoney(total, currency)}.
        </p>
      ) : null}

      {!item.postedRecord ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="max-w-sm text-sm leading-relaxed">Approve to put this {noun} in the system. The original file stays attached.</p>
          <Button type="button" onClick={() => void handleApprove()} disabled={saving}>
            {saving ? "Approving…" : "Approve"}
          </Button>
        </div>
      ) : (
        <p className="border-t pt-4 text-sm font-medium">{item.postedRecord.number} is in the books.</p>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <Input
        type="date"
        value={toDateInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="mt-1 h-9 dark:[color-scheme:dark]"
      />
    </label>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  align,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  align?: "right";
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={cn("mt-1 h-9", align === "right" && "text-right tabular-nums")}
      />
    </label>
  );
}
