"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AsyncSearchableSelect,
  type AsyncSearchableSelectOption,
} from "@/components/ui/async-searchable-select";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useAuthStore } from "@/stores/auth-store";
import { apiRequest } from "@/lib/api/client";
import { can } from "@/lib/rbac/can";
import {
  getPurchaseReview,
  getPurchaseDefault,
  savePurchaseReview,
  createPurchaseOrders,
  purchaseOptions,
  type PurchaseReviewPage,
  type PurchaseReviewLine,
} from "@/lib/api/procurement-flow";
type Row = PurchaseReviewLine & {
  productOption?: AsyncSearchableSelectOption;
  supplierOption?: AsyncSearchableSelectOption;
  evidence?: string;
  loadError?: string;
  defaultsReady?: boolean;
};
const productOptions = (search: string) => purchaseOptions("product", search);
const supplierOptions = (search: string) => purchaseOptions("supplier", search);
export default function PurchaseRequestReviewPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const canApprove = can(user, "purchase.approve"),
    canWrite = can(user, "purchase.write");
  const [data, setData] = React.useState<PurchaseReviewPage | null>(null),
    [rows, setRows] = React.useState<Row[]>([]),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [loading, setLoading] = React.useState(true),
    [dirty, setDirty] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [orderQuantities, setOrderQuantities] = React.useState<
    Record<string, string>
  >({});
  const requestKey = React.useRef(crypto.randomUUID());
  const requestVersion = React.useRef(0);
  const [orders, setOrders] = React.useState<string[]>([]);
  const defaultFor = React.useCallback(
    async (row: Row, supplierId?: string): Promise<Row> => {
      if (!row.productId) return { ...row, defaultsReady: true };
      try {
        const last = await getPurchaseDefault(row.productId, supplierId);
        return {
          ...row,
          supplierId: last.supplierId || supplierId || "",
          supplierOption: last.supplierId
            ? {
                id: last.supplierId,
                label: last.supplierName || last.supplierId,
              }
            : supplierId
              ? row.supplierOption
              : undefined,
          unitPrice:
            last.unit.toUpperCase() === row.unit.toUpperCase()
              ? last.unitPrice || 0
              : 0,
          taxCodeId: last.taxCodeId,
          currency: last.currency || row.currency,
          linesAreTaxInclusive: last.linesAreTaxInclusive,
          defaultsReady: true,
          evidence: last.sourceNumber
            ? `Last purchase ${last.sourceNumber} · ${last.date?.slice(0, 10)} · ${last.unit} · ${last.currency}${last.unit.toUpperCase() !== row.unit.toUpperCase() ? ". Unit differs: enter a price in the requisition unit." : ""}`
            : "No completed purchase history. Choose supplier, price and tax treatment.",
        };
      } catch (e) {
        return {
          ...row,
          defaultsReady: false,
          loadError: (e as Error).message,
        };
      }
    },
    [],
  );
  const load = React.useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const page = await getPurchaseReview(id);
      let next: Row[] = page.request.lines.map((line) => {
        const saved = page.review?.lines.find((r) => r.lineId === line.lineId);
        return {
          ...(saved || {
            lineId: line.lineId,
            productId: line.productId || "",
            unit: line.unit || "EA",
            approvedQuantity: line.quantity,
            orderedQuantity: 0,
            supplierId: "",
            unitPrice: 0,
            currency: page.request.currency || "KES",
            decision: "PENDING" as const,
          }),
          productOption:
            saved?.productId || line.productId
              ? {
                  id: saved?.productId || line.productId!,
                  label:
                    page.products?.find(
                      (product) =>
                        product.id === (saved?.productId || line.productId),
                    )?.name ||
                    line.description ||
                    saved?.productId ||
                    line.productId!,
                }
              : undefined,
          supplierOption: saved?.supplierId
            ? {
                id: saved.supplierId,
                label:
                  page.suppliers.find((s) => s.id === saved.supplierId)?.name ||
                  saved.supplierId,
              }
            : undefined,
          defaultsReady: Boolean(saved),
        };
      });
      if (!page.review) {
        const enriched: Row[] = [];
        for (let offset = 0; offset < next.length; offset += 5)
          enriched.push(
            ...(await Promise.all(
              next.slice(offset, offset + 5).map((row) => defaultFor(row)),
            )),
          );
        next = enriched;
      }
      if (version !== requestVersion.current) return;
      setData(page);
      setRows(next);
      setDirty(false);
      setOrderQuantities(
        Object.fromEntries(
          next.map((row) => [
            row.lineId,
            String(Math.max(0, row.approvedQuantity - row.orderedQuantity)),
          ]),
        ),
      );
      setOrders(page.review?.batches.flatMap((b) => b.orderIds) || []);
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [id, defaultFor]);
  React.useEffect(() => {
    void load();
    return () => {
      requestVersion.current++;
    };
  }, [load]);
  const patch = (lineId: string, update: Partial<Row>) => {
    setRows((old) =>
      old.map((r) => (r.lineId === lineId ? { ...r, ...update } : r)),
    );
    setDirty(true);
    requestKey.current = crypto.randomUUID();
  };
  const canEdit = Boolean(
    data &&
      ["DRAFT", "APPROVED"].includes(data.request.status) &&
      canApprove &&
      !busy,
  );
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await savePurchaseReview(
        id,
        data?.review?.revision || 0,
        rows.map(
          ({
            productOption,
            supplierOption,
            evidence,
            loadError,
            defaultsReady,
            ...line
          }) => line,
        ),
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const selections = rows
        .filter(
          (r) =>
            r.decision === "APPROVED" && Number(orderQuantities[r.lineId]) > 0,
        )
        .map((r) => ({
          lineId: r.lineId,
          quantity: Number(orderQuantities[r.lineId]),
        }));
      const result = await createPurchaseOrders(
        id,
        data!.review!.revision,
        requestKey.current,
        selections,
      );
      setOrders(result.orderIds);
      await load();
      requestKey.current = crypto.randomUUID();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <PageShell>
      <PageHeader
        title={
          data
            ? `Review requisition ${data.request.number}`
            : "Review requisition"
        }
        description="Match products, manually approve quantities, then create draft orders grouped by supplier, currency and tax basis."
        breadcrumbs={[
          { label: "Purchase requests", href: "/purchasing/requests" },
          { label: "Item review" },
        ]}
      />
      <div className="space-y-4 p-6">
        {error ? (
          <div role="alert" className="rounded border border-destructive p-3">
            {error}{" "}
            <Button variant="outline" onClick={() => void load()}>
              Reload review
            </Button>
          </div>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
        {loading ? (
          <p role="status">Loading requisition and last purchase evidence…</p>
        ) : data ? (
          <>
            <p className="text-sm text-muted-foreground">
              1. Select each item decision and quantity. 2. Save item review. 3.
              Submit and approve the requisition using its document page. 4.
              Create draft POs below. PO approval and supplier delivery are
              separate.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/docs/purchase-request/${id}`}>
                Open requisition / approval
              </Link>
            </Button>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm" data-tutorial-hint="purchase-request-item-review">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Requested / matched item</th>
                    <th className="p-3">Manual decision / quantity</th>
                    <th className="p-3">Supplier and purchase price</th>
                    <th className="p-3">Tax / remaining to order</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const source = data.request.lines.find(
                      (l) => l.lineId === row.lineId,
                    )!;
                    const editable = canEdit && row.orderedQuantity === 0;
                    return (
                      <tr key={row.lineId} className="border-b align-top">
                        <td className="min-w-[240px] space-y-2 p-3">
                          <p className="font-medium">
                            {source.description || `Item ${index + 1}`}
                          </p>
                          <p>
                            Requested: {source.quantity} {source.unit}
                          </p>
                          <AsyncSearchableSelect
                            value={row.productId}
                            selectedOption={row.productOption}
                            disabled={!editable}
                            placeholder="Match product"
                            searchPlaceholder="Name, code, SKU or barcode"
                            emptyMessage="No matching products"
                            loadOptions={productOptions}
                            onValueChange={(value) => {
                              if (!value)
                                patch(row.lineId, {
                                  productId: "",
                                  productOption: undefined,
                                  defaultsReady: false,
                                });
                            }}
                            onOptionSelect={(option) => {
                              if (!option) return;
                              const next = {
                                ...row,
                                productId: option.id,
                                productOption: option,
                                supplierId: "",
                                supplierOption: undefined,
                                unitPrice: 0,
                                taxCodeId: undefined,
                                linesAreTaxInclusive: undefined,
                                defaultsReady: false,
                                loadError: undefined,
                              };
                              patch(row.lineId, next);
                              void defaultFor(next).then((updated) =>
                                setRows((old) =>
                                  old.map((current) =>
                                    current.lineId === row.lineId &&
                                    current.productId === updated.productId &&
                                    current.supplierId === ""
                                      ? {
                                          ...current,
                                          supplierId: updated.supplierId,
                                          supplierOption:
                                            updated.supplierOption,
                                          unitPrice: updated.unitPrice,
                                          taxCodeId: updated.taxCodeId,
                                          currency: updated.currency,
                                          linesAreTaxInclusive:
                                            updated.linesAreTaxInclusive,
                                          evidence: updated.evidence,
                                          loadError: updated.loadError,
                                          defaultsReady: updated.defaultsReady,
                                        }
                                      : current,
                                  ),
                                ),
                              );
                            }}
                          />
                        </td>
                        <td className="min-w-[185px] space-y-2 p-3">
                          <select
                            aria-label={`Decision for item ${index + 1}`}
                            className="w-full rounded border bg-background p-2"
                            value={row.decision}
                            disabled={!editable}
                            onChange={(e) =>
                              patch(row.lineId, {
                                decision: e.target.value as Row["decision"],
                              })
                            }
                          >
                            <option value="PENDING">Leave pending</option>
                            <option value="APPROVED">Approve item</option>
                            <option value="REJECTED">Reject item</option>
                          </select>
                          <label>
                            Approved quantity
                            <Input
                              aria-label={`Approved quantity for item ${index + 1}`}
                              type="number"
                              min="0"
                              max={source.quantity}
                              step="any"
                              value={row.approvedQuantity}
                              disabled={
                                !editable || row.decision !== "APPROVED"
                              }
                              onChange={(e) =>
                                patch(row.lineId, {
                                  approvedQuantity: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <Input
                            aria-label={`Review note for item ${index + 1}`}
                            placeholder="Review note"
                            value={row.note || ""}
                            disabled={!editable}
                            onChange={(e) =>
                              patch(row.lineId, { note: e.target.value })
                            }
                          />
                        </td>
                        <td className="min-w-[260px] space-y-2 p-3">
                          <AsyncSearchableSelect
                            value={row.supplierId}
                            selectedOption={row.supplierOption}
                            disabled={!editable || !row.defaultsReady}
                            placeholder="Choose supplier"
                            emptyMessage="No suppliers found"
                            loadOptions={supplierOptions}
                            onValueChange={(supplierId) =>
                              patch(row.lineId, { supplierId })
                            }
                            onOptionSelect={(option) => {
                              if (!option || option.id === row.supplierId)
                                return;
                              const next = {
                                ...row,
                                supplierOption: option,
                                supplierId: option.id,
                                unitPrice: 0,
                                linesAreTaxInclusive: undefined,
                                taxCodeId: undefined,
                                defaultsReady: false,
                              };
                              patch(row.lineId, next);
                              void defaultFor(next, option.id).then((updated) =>
                                setRows((old) =>
                                  old.map((current) =>
                                    current.lineId === row.lineId &&
                                    current.supplierId === option.id &&
                                    current.productId === next.productId
                                      ? {
                                          ...current,
                                          unitPrice: updated.unitPrice,
                                          currency: updated.currency,
                                          taxCodeId: updated.taxCodeId,
                                          linesAreTaxInclusive:
                                            updated.linesAreTaxInclusive,
                                          evidence: updated.evidence,
                                          loadError: updated.loadError,
                                          defaultsReady: updated.defaultsReady,
                                        }
                                      : current,
                                  ),
                                ),
                              );
                            }}
                          />
                          <label>
                            Price per {row.unit}
                            <Input
                              aria-label={`Unit price for item ${index + 1}`}
                              type="number"
                              min="0"
                              step="any"
                              value={row.unitPrice || ""}
                              disabled={!editable || !row.defaultsReady}
                              onChange={(e) =>
                                patch(row.lineId, {
                                  unitPrice: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <Input
                            aria-label={`Currency for item ${index + 1}`}
                            maxLength={3}
                            value={row.currency}
                            disabled={!editable || !row.defaultsReady}
                            onChange={(e) =>
                              patch(row.lineId, {
                                currency: e.target.value.toUpperCase(),
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            {row.evidence ||
                              "Saved reviewed supplier and price."}
                          </p>
                          {row.loadError ? (
                            <p role="alert">{row.loadError}</p>
                          ) : null}
                          {editable ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBusy(true);
                                void defaultFor(row)
                                  .then((updated) => patch(row.lineId, updated))
                                  .finally(() => setBusy(false));
                              }}
                            >
                              Use last purchase again
                            </Button>
                          ) : null}
                        </td>
                        <td className="min-w-[215px] space-y-2 p-3">
                          <select
                            aria-label={`Tax basis for item ${index + 1}`}
                            className="w-full rounded border bg-background p-2"
                            disabled={!editable || !row.defaultsReady}
                            value={
                              row.linesAreTaxInclusive == null
                                ? ""
                                : String(row.linesAreTaxInclusive)
                            }
                            onChange={(e) =>
                              patch(row.lineId, {
                                linesAreTaxInclusive:
                                  e.target.value === ""
                                    ? undefined
                                    : e.target.value === "true",
                              })
                            }
                          >
                            <option value="">Choose tax basis</option>
                            <option value="true">Price includes tax</option>
                            <option value="false">Price excludes tax</option>
                          </select>
                          <select
                            aria-label={`Tax code for item ${index + 1}`}
                            className="w-full rounded border bg-background p-2"
                            disabled={!editable || !row.defaultsReady}
                            value={row.taxCodeId || ""}
                            onChange={(e) =>
                              patch(row.lineId, {
                                taxCodeId: e.target.value || undefined,
                              })
                            }
                          >
                            <option value="">Choose company tax code</option>
                            {data.taxes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.rate}%)
                              </option>
                            ))}
                          </select>
                          <p>
                            Already ordered: {row.orderedQuantity} {row.unit}
                          </p>
                          {row.uomToBaseFactorSnapshot ? (
                            <p className="text-xs text-muted-foreground">
                              1 {row.unit} = {row.uomToBaseFactorSnapshot}{" "}
                              {row.baseUomSnapshot} (frozen conversion)
                            </p>
                          ) : null}
                          <label>
                            Order now
                            <Input
                              aria-label={`Order quantity for item ${index + 1}`}
                              type="number"
                              min="0"
                              step="any"
                              max={Math.max(
                                0,
                                row.approvedQuantity - row.orderedQuantity,
                              )}
                              value={orderQuantities[row.lineId] || "0"}
                              disabled={
                                data.request.status !== "APPROVED" ||
                                row.decision !== "APPROVED" ||
                                busy ||
                                !canWrite
                              }
                              onChange={(e) => {
                                setOrderQuantities((old) => ({
                                  ...old,
                                  [row.lineId]: e.target.value,
                                }));
                                requestKey.current = crypto.randomUUID();
                              }}
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3">
              {canApprove ? (
                <Button
                  disabled={
                    !canEdit ||
                    !dirty ||
                    rows.some((row) => row.productId && !row.defaultsReady)
                  }
                  data-tutorial-hint="purchase-request-save-review"
                  onClick={() => void save()}
                >
                  {busy ? "Working…" : "Save manual item review"}
                </Button>
              ) : null}
              {canWrite ? (
                <Button
                  disabled={
                    busy ||
                    dirty ||
                    data.request.status !== "APPROVED" ||
                    !data.review ||
                    !rows.some(
                      (row) =>
                        row.decision === "APPROVED" &&
                        Number(orderQuantities[row.lineId]) > 0,
                    )
                  }
                  data-tutorial-hint="purchase-request-create-orders"
                  onClick={() => void create()}
                >
                  Create draft purchase orders
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={busy || dirty}
                onClick={() => void load()}
              >
                Refresh status
              </Button>
              {canWrite && data.review && orders.length ? (
                <Button
                  variant="outline"
                  disabled={busy || dirty}
                  onClick={() => {
                    setBusy(true);
                    setError("");
                    void apiRequest<{ released: number }>(
                      `/api/procurement/requests/${encodeURIComponent(id)}/release-cancelled`,
                      {
                        method: "POST",
                        body: { revision: data.review!.revision },
                      },
                    )
                      .then(async (result) => {
                        setNotice(
                          result.released
                            ? `${result.released} cancelled order(s) released for reordering. Review the supplier before creating a replacement.`
                            : "No additional cancelled-order quantities to release.",
                        );
                        await load();
                      })
                      .catch((e) => setError((e as Error).message))
                      .finally(() => setBusy(false));
                  }}
                >
                  Release cancelled PO quantities
                </Button>
              ) : null}
            </div>
            {orders.length ? (
              <div className="space-y-2">
                <h2 className="font-semibold">Linked purchase orders</h2>
                {orders.map((orderId) => (
                  <p key={orderId}>
                    <Link
                      className="text-primary underline"
                      href={`/docs/purchase-order/${orderId}`}
                    >
                      Open purchase order {orderId}
                    </Link>
                  </p>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
