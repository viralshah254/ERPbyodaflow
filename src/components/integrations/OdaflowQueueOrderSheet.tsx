"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AsyncSearchableSelect,
  type AsyncSearchableSelectOption,
} from "@/components/ui/async-searchable-select";
import { OdaflowSourceCard } from "@/components/integrations/OdaflowSourceCard";
import { OdaflowMappingConflictDialog } from "@/components/integrations/OdaflowMappingConflictDialog";
import {
  createSalesOrderFromQueueItem,
  fetchOdaflowQueueItem,
  ignoreQueueItem,
  lookupOdaflowErmByEntityId,
  type OdaflowErmLookupMapping,
  type OdaflowQueueItem,
  type OdaflowQueueOrderPreview,
} from "@/lib/api/odaflow-integration";
import {
  filterConflictingProductMappings,
  hasSameCatalogConflict,
  sfaProductKindFromOrderChannel,
} from "@/lib/odaflow-mapping-utils";
import { fetchPartiesApi } from "@/lib/api/parties";
import { fetchProductsPageApi } from "@/lib/api/products";
import type { PartyRow, ProductRow } from "@/lib/types/masters";

type Props = {
  queueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
  initialCustomerId?: string | null;
  initialCustomerName?: string | null;
  showPricingReminder?: boolean;
  onDeepLinkConsumed?: () => void;
};

type MappingConflictState =
  | {
      kind: "product";
      lineIndex: number;
      option: AsyncSearchableSelectOption;
      existingMappings: OdaflowErmLookupMapping[];
      conflictReason: "same_catalog" | "size_mismatch";
    }
  | {
      kind: "customer";
      option: AsyncSearchableSelectOption;
      existingMappings: OdaflowErmLookupMapping[];
    };

function channelLabel(channel?: string) {
  const map: Record<string, string> = {
    modern_trade: "Modern Trade",
    distributor: "Distributor",
    direct: "General Trade",
    van_sales: "Van Sales",
  };
  return channel ? (map[channel] ?? channel.replace(/_/g, " ")) : "—";
}

function buildCustomerCreateUrl(queueId: string, customerName?: string) {
  const params = new URLSearchParams({
    new: "1",
    returnTo: "/sales/odaflow-sync-queue",
    odaflowQueue: queueId,
  });
  if (customerName?.trim()) params.set("name", customerName.trim());
  return `/sales/customers?${params.toString()}`;
}

function buildProductCreateReturnUrl(queueId: string) {
  const params = new URLSearchParams({ open: queueId });
  return `/sales/odaflow-sync-queue?${params.toString()}`;
}

export function OdaflowQueueOrderSheet({
  queueId,
  open,
  onOpenChange,
  onChanged,
  initialCustomerId,
  initialCustomerName,
  showPricingReminder = false,
  onDeepLinkConsumed,
}: Props) {
  const router = useRouter();
  const [sheetPortalHost, setSheetPortalHost] = React.useState<HTMLElement | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [item, setItem] = React.useState<OdaflowQueueItem | null>(null);
  const [order, setOrder] = React.useState<OdaflowQueueOrderPreview | null>(null);
  const [erpPartyId, setErpPartyId] = React.useState<string | undefined>();
  const [selectedCustomer, setSelectedCustomer] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [lineProducts, setLineProducts] = React.useState<Record<number, AsyncSearchableSelectOption>>({});
  const [lineQty, setLineQty] = React.useState<Record<number, number>>({});
  const [saveMappings, setSaveMappings] = React.useState(true);
  const [mappingConflict, setMappingConflict] = React.useState<MappingConflictState | null>(null);
  const [pricingReminderDismissed, setPricingReminderDismissed] = React.useState(false);
  /** True while ERM conflict lookup runs after customer pick — keeps the UI responsive. */
  const [checkingCustomer, setCheckingCustomer] = React.useState(false);
  /** Line indexes currently checking product ERM conflicts. */
  const [checkingProductLines, setCheckingProductLines] = React.useState<Set<number>>(() => new Set());
  const deepLinkAppliedRef = React.useRef(false);

  const setProductLineChecking = React.useCallback((lineIndex: number, busy: boolean) => {
    setCheckingProductLines((prev) => {
      const next = new Set(prev);
      if (busy) next.add(lineIndex);
      else next.delete(lineIndex);
      return next;
    });
  }, []);

  const applyCustomer = React.useCallback((option: AsyncSearchableSelectOption | null) => {
    setSelectedCustomer(option);
    setErpPartyId(option?.id);
  }, []);

  const applyProduct = React.useCallback((lineIndex: number, option: AsyncSearchableSelectOption | null) => {
    setLineProducts((prev) => {
      const next = { ...prev };
      if (option) next[lineIndex] = option;
      else delete next[lineIndex];
      return next;
    });
  }, []);

  const load = React.useCallback(async () => {
    if (!queueId) return;
    setLoading(true);
    try {
      const data = await fetchOdaflowQueueItem(queueId);
      setItem(data.item);
      setOrder(data.order);
      if (data.order) {
        const customerId = initialCustomerId ?? data.order.erpPartyId;
        const customerLabel = initialCustomerName ?? data.order.erpPartyName ?? data.order.customerName;
        setErpPartyId(customerId);
        setSelectedCustomer(customerId && customerLabel ? { id: customerId, label: customerLabel } : null);

        const qty: Record<number, number> = {};
        const products: Record<number, AsyncSearchableSelectOption> = {};
        for (const line of data.order.lines) {
          qty[line.index] = line.qty;
          if (line.erpProductId) {
            products[line.index] = {
              id: line.erpProductId,
              label: line.erpProductName ?? line.productName ?? line.erpProductId,
            };
          }
        }
        setLineQty(qty);
        setLineProducts(products);
      }
      if (initialCustomerId || showPricingReminder) {
        onDeepLinkConsumed?.();
      }
    } catch {
      toast.error("Could not load order details");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [queueId, onOpenChange, initialCustomerId, initialCustomerName, showPricingReminder, onDeepLinkConsumed]);

  React.useEffect(() => {
    if (open && queueId) {
      deepLinkAppliedRef.current = false;
      void load();
    }
    if (!open) {
      setItem(null);
      setOrder(null);
      setMappingConflict(null);
      setPricingReminderDismissed(false);
      setCheckingCustomer(false);
      setCheckingProductLines(new Set());
    }
  }, [open, queueId, load]);

  React.useEffect(() => {
    if (!open || !initialCustomerId || deepLinkAppliedRef.current) return;
    deepLinkAppliedRef.current = true;
    applyCustomer({
      id: initialCustomerId,
      label: initialCustomerName ?? initialCustomerId,
    });
  }, [open, initialCustomerId, initialCustomerName, applyCustomer]);

  const loadCustomerOptions = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const rows: PartyRow[] = await fetchPartiesApi({
      role: "customer",
      search: query,
      status: "ACTIVE",
      limit: 20,
    });
    return rows.map((p) => ({
      id: p.id,
      label: p.name,
      description: p.code ? `Code ${p.code}` : undefined,
    }));
  }, []);

  const loadProductOptions = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const page = await fetchProductsPageApi({ search: query, status: "ACTIVE", sellable: true, limit: 20 });
    return page.items.map((p: ProductRow) => ({
      id: p.id,
      label: p.name,
      description: [p.sku, p.barcode].filter(Boolean).join(" · ") || undefined,
    }));
  }, []);

  async function checkCustomerMapping(option: AsyncSearchableSelectOption | null) {
    if (!option || !order?.odaflowCustomerId) {
      applyCustomer(option);
      return;
    }
    // Optimistic: show the pick immediately so the dropdown does not look stuck.
    applyCustomer(option);
    setCheckingCustomer(true);
    try {
      const { mappings } = await lookupOdaflowErmByEntityId({
        entityType: "party",
        entityId: option.id,
      });
      const others = mappings.filter((m) => m.externalId !== order.odaflowCustomerId);
      if (others.length > 0) {
        applyCustomer(null);
        setMappingConflict({ kind: "customer", option, existingMappings: others });
      }
    } catch {
      /* proceed without blocking — selection already applied */
    } finally {
      setCheckingCustomer(false);
    }
  }

  async function checkProductMapping(lineIndex: number, option: AsyncSearchableSelectOption | null) {
    if (!option) {
      applyProduct(lineIndex, null);
      return;
    }
    const line = order?.lines.find((l) => l.index === lineIndex);
    const odaflowProductId = line?.odaflowProductId;
    // Optimistic: show the pick immediately.
    applyProduct(lineIndex, option);
    if (!odaflowProductId) return;

    setProductLineChecking(lineIndex, true);
    try {
      const { mappings } = await lookupOdaflowErmByEntityId({
        entityType: "product",
        entityId: option.id,
      });
      const currentKind = sfaProductKindFromOrderChannel(order?.channel);
      const conflicts = filterConflictingProductMappings(
        odaflowProductId,
        line?.packSize,
        currentKind,
        mappings
      );
      if (conflicts.length > 0) {
        applyProduct(lineIndex, null);
        const sameCatalog = conflicts.some((m) =>
          hasSameCatalogConflict(currentKind, odaflowProductId, m)
        );
        setMappingConflict({
          kind: "product",
          lineIndex,
          option,
          existingMappings: conflicts,
          conflictReason: sameCatalog ? "same_catalog" : "size_mismatch",
        });
      }
    } catch {
      /* proceed without blocking — selection already applied */
    } finally {
      setProductLineChecking(lineIndex, false);
    }
  }

  const mappingCheckBusy = checkingCustomer || checkingProductLines.size > 0;
  const customerReady = Boolean(erpPartyId);
  const allProductsReady = order?.lines.every((line) => Boolean(lineProducts[line.index]?.id)) ?? false;
  const canSubmit = customerReady && allProductsReady && !submitting && !mappingCheckBusy;

  async function handleCreateSalesOrder() {
    if (!queueId || !order || !erpPartyId) return;
    setSubmitting(true);
    try {
      const result = await createSalesOrderFromQueueItem(queueId, {
        erpPartyId,
        lineProducts: order.lines
          .filter((line) => lineProducts[line.index]?.id)
          .map((line) => ({ lineIndex: line.index, erpProductId: lineProducts[line.index]!.id })),
        lineQty: order.lines.map((line) => ({ lineIndex: line.index, qty: lineQty[line.index] ?? line.qty })),
        saveMappings,
      });
      toast.success("Sales order created");
      onOpenChange(false);
      onChanged?.();
      router.push(`/docs/sales-order/${result.erpDocumentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create sales order");
      void load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDismiss() {
    if (!queueId) return;
    try {
      await ignoreQueueItem(queueId);
      toast.success("Removed from list");
      onOpenChange(false);
      onChanged?.();
    } catch {
      toast.error("Could not remove item");
    }
  }

  function goCreateCustomer() {
    if (!queueId) return;
    onOpenChange(false);
    router.push(buildCustomerCreateUrl(queueId, order?.customerName));
  }

  function goCreateProduct() {
    if (!queueId) return;
    onOpenChange(false);
    router.push(`/master/products?returnTo=${encodeURIComponent(buildProductCreateReturnUrl(queueId))}`);
  }

  const odaflowSource = order
    ? {
        orderTitle: order.orderTitle ?? `${channelLabel(order.channel)} Order`,
        odaflowChannel: order.channel,
        salesRepName: order.salesRepName,
        salesRepPhone: order.salesRepPhone,
        sourcePdfUrl: order.documentUrl,
        externalOrderId: order.odaflowOrderId,
      }
    : null;

  const conflictLine =
    mappingConflict?.kind === "product"
      ? order?.lines.find((l) => l.index === mappingConflict.lineIndex)
      : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <div ref={setSheetPortalHost} className="contents" />
          <SheetHeader>
            <SheetTitle>{order?.purchaseOrderNumber ?? item?.displayRef ?? "Odaflow order"}</SheetTitle>
            <SheetDescription>
              Match Odaflow customer and products to your ERP catalog. Saved matches are reused on future orders.
            </SheetDescription>
          </SheetHeader>

          {loading || !order ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading order…</div>
          ) : (
            <div className="mt-6 space-y-6">
              {showPricingReminder && initialCustomerId && !pricingReminderDismissed ? (
                <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                  <p className="font-medium flex items-start gap-2">
                    <Icons.Tags className="h-4 w-4 shrink-0 mt-0.5" />
                    Set a price tag for {initialCustomerName ?? "this customer"}
                  </p>
                  <p className="text-xs mt-1 text-sky-900/80 dark:text-sky-100/80">
                    New customers need a pricing tag before Odaflow orders price correctly in the ERP.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button type="button" size="sm" variant="default" asChild>
                      <Link href={`/sales/customers?id=${initialCustomerId}`}>Configure customer pricing</Link>
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href="/pricing/rules">Pricing rules</Link>
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPricingReminderDismissed(true)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : null}

              {odaflowSource ? <OdaflowSourceCard info={odaflowSource} compact /> : null}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Order date</p>
                  <p className="font-medium">{order.orderDate ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="font-medium">{order.currency ?? "KES"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Odaflow total</p>
                  <p className="font-medium">
                    {order.totalAmount != null
                      ? `${order.currency ?? "KES"} ${order.totalAmount.toLocaleString()}`
                      : "—"}
                  </p>
                </div>
              </div>

              {item?.blockReason && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30">
                  {item.blockReason}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className={order.customerNeedsMatch ? "text-amber-800 dark:text-amber-200" : undefined}>
                    ERP customer
                  </Label>
                  {queueId ? (
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={goCreateCustomer}>
                      <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add customer
                    </Button>
                  ) : null}
                </div>
                {order.customerName && !selectedCustomer ? (
                  <p className="text-xs text-muted-foreground">
                    Odaflow sent “{order.customerName}” — pick your matching customer below or add a new one.
                  </p>
                ) : null}
                <AsyncSearchableSelect
                  value={erpPartyId}
                  selectedOption={selectedCustomer}
                  onValueChange={(id) => {
                    if (!id) applyCustomer(null);
                  }}
                  onOptionSelect={(opt) => void checkCustomerMapping(opt)}
                  loadOptions={loadCustomerOptions}
                  minSearchLength={0}
                  searchDebounceMs={200}
                  placeholder="Select customer"
                  searchPlaceholder="Search customers…"
                  emptyMessage="No customers found."
                  allowClear
                  disabled={checkingCustomer || submitting}
                  portalContainer={sheetPortalHost}
                  triggerClassName={order.customerNeedsMatch ? "border-amber-300" : undefined}
                  onCreateNew={goCreateCustomer}
                  createNewLabel="Add new customer"
                />
                {checkingCustomer ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icons.Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    Checking customer mapping…
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Order lines</Label>
                  <span className="text-xs text-muted-foreground">
                    {order.matchedLineCount}/{order.totalLineCount} matched · {order.lines.length} item(s)
                  </span>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Product from Odaflow</th>
                        <th className="px-3 py-2 font-medium w-20">Qty</th>
                        <th className="px-3 py-2 font-medium min-w-[12rem]">Your ERP product</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.lines.map((line) => (
                        <tr
                          key={line.index}
                          className={
                            line.hasIssue
                              ? "border-t align-top bg-red-50/70 dark:bg-red-950/20 border-l-2 border-l-red-300 dark:border-l-red-700"
                              : line.isAutoMatched
                                ? "border-t align-top bg-green-50/50 dark:bg-green-950/15 border-l-2 border-l-green-300 dark:border-l-green-800"
                                : "border-t align-top"
                          }
                        >
                          <td className="px-3 py-3">
                            <p className="font-medium">{line.productName ?? "Unknown product"}</p>
                            {line.packSize && (
                              <p className="text-xs text-muted-foreground mt-0.5">Size {line.packSize}</p>
                            )}
                            {line.odaflowProductId && (
                              <p className="text-xs text-muted-foreground mt-0.5">Odaflow ID {line.odaflowProductId}</p>
                            )}
                            {line.barcode && <p className="text-xs text-muted-foreground">Barcode {line.barcode}</p>}
                            {line.hasIssue && line.blockReason ? (
                              <p className="text-xs text-red-700 dark:text-red-300 mt-1">{line.blockReason}</p>
                            ) : line.isAutoMatched ? (
                              <p className="text-xs text-green-700 dark:text-green-300 mt-1">Matched automatically</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              min={1}
                              className="h-8 w-16"
                              value={lineQty[line.index] ?? line.qty}
                              onChange={(e) =>
                                setLineQty((prev) => ({
                                  ...prev,
                                  [line.index]: Math.max(1, Number(e.target.value) || 1),
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <AsyncSearchableSelect
                              value={lineProducts[line.index]?.id}
                              selectedOption={lineProducts[line.index] ?? null}
                              onValueChange={(id) => {
                                if (!id) applyProduct(line.index, null);
                              }}
                              onOptionSelect={(opt) => void checkProductMapping(line.index, opt)}
                              loadOptions={loadProductOptions}
                              minSearchLength={0}
                              searchDebounceMs={200}
                              placeholder="Select product"
                              searchPlaceholder="Search products…"
                              emptyMessage="No products found."
                              allowClear
                              disabled={checkingProductLines.has(line.index) || submitting}
                              portalContainer={sheetPortalHost}
                              triggerClassName={
                                line.hasIssue
                                  ? "border-red-300 dark:border-red-700"
                                  : line.isAutoMatched
                                    ? "border-green-300 dark:border-green-700"
                                    : undefined
                              }
                              onCreateNew={goCreateProduct}
                              createNewLabel="Create new product"
                            />
                            {checkingProductLines.has(line.index) ? (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                                <Icons.Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                Checking product mapping…
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="save-mappings"
                  checked={saveMappings}
                  onCheckedChange={(v) => setSaveMappings(v === true)}
                />
                <Label htmlFor="save-mappings" className="font-normal leading-snug cursor-pointer">
                  Remember these customer and product matches for future Odaflow orders
                </Label>
              </div>
            </div>
          )}

          <SheetFooter className="mt-8 gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => void handleDismiss()} disabled={submitting}>
              Remove from list
            </Button>
            <Button type="button" onClick={() => void handleCreateSalesOrder()} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : mappingCheckBusy ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                "Create sales order"
              )}
            </Button>
          </SheetFooter>

          {order && !canSubmit && !loading && (
            <p className="text-xs text-muted-foreground text-center pb-2">
              {mappingCheckBusy
                ? "Checking your selection against existing mappings…"
                : "Select the ERP customer and every product above to continue."}
            </p>
          )}
        </SheetContent>
      </Sheet>

      <OdaflowMappingConflictDialog
        open={mappingConflict != null}
        onOpenChange={(next) => {
          if (!next) setMappingConflict(null);
        }}
        kind={mappingConflict?.kind === "customer" ? "customer" : "product"}
        erpLabel={
          mappingConflict?.kind === "customer"
            ? mappingConflict.option.label
            : (mappingConflict?.option.label ?? "")
        }
        odaflowLabel={
          mappingConflict?.kind === "customer"
            ? (order?.customerName ?? "Unknown customer")
            : (conflictLine?.productName ?? "Unknown product")
        }
        odaflowPackSize={mappingConflict?.kind === "product" ? conflictLine?.packSize : undefined}
        productConflictReason={
          mappingConflict?.kind === "product" ? mappingConflict.conflictReason : undefined
        }
        existingMappings={mappingConflict?.existingMappings ?? []}
        onConfirmLink={() => {
          if (!mappingConflict) return;
          if (mappingConflict.kind === "customer") {
            applyCustomer(mappingConflict.option);
          } else {
            applyProduct(mappingConflict.lineIndex, mappingConflict.option);
          }
          setMappingConflict(null);
        }}
        onSearchAgain={() => {
          if (!mappingConflict) return;
          if (mappingConflict.kind === "customer") {
            applyCustomer(null);
          } else {
            applyProduct(mappingConflict.lineIndex, null);
          }
          setMappingConflict(null);
        }}
        onCreateNew={
          mappingConflict?.kind === "product"
            ? () => {
                setMappingConflict(null);
                goCreateProduct();
              }
            : () => {
                setMappingConflict(null);
                goCreateCustomer();
              }
        }
      />
    </>
  );
}
