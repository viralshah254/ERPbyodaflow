"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DocumentPageShell } from "@/components/docs/DocumentPageShell";
import { DocumentTabs } from "@/components/docs/DocumentTabs";
import { DocumentRightPanel } from "@/components/docs/DocumentRightPanel";
import { DocumentTimeline } from "@/components/docs/DocumentTimeline";
import { DocumentAttachments } from "@/components/docs/DocumentAttachments";
import { DocumentComments } from "@/components/docs/DocumentComments";
import { DocumentTaxesPanel } from "@/components/docs/DocumentTaxesPanel";
import { PrintPreviewDrawer } from "@/components/docs/PrintPreviewDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getDocTypeConfig } from "@/config/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { formatMoney, kesEquivalent } from "@/lib/money";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import {
  addDocumentCommentApi,
  convertDocumentApi,
  documentActionApi,
  downloadDocumentPdfApi,
  downloadDocumentAttachmentApi,
  fetchDocumentDetailApi,
  requestDocumentApprovalApi,
  uploadDocumentAttachmentApi,
} from "@/lib/api/documents";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { searchApSupplierOptionsApi, searchArCustomerOptionsApi } from "@/lib/api/payments";
import { fetchPartyByIdApi, type PartyLookupOption } from "@/lib/api/parties";
import type { DocumentChainNode, DocumentDetailRecord } from "@/lib/types/documents";
import { fetchPickPackTasks, fetchPutawayTasks } from "@/lib/api/warehouse-execution";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DocViewPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;
  const [printOpen, setPrintOpen] = React.useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailTo, setEmailTo] = React.useState("");
  const [emailSending, setEmailSending] = React.useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = React.useState(false);
  const [openInvoices, setOpenInvoices] = React.useState<Array<{ id: string; number: string; openAmount: number; currency: string }>>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [applyAmount, setApplyAmount] = React.useState("");
  const [applyLoading, setApplyLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [document, setDocument] = React.useState<Awaited<ReturnType<typeof fetchDocumentDetailApi>>>(null);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [convertType, setConvertType] = React.useState<DocTypeKey | null>(null);
  const [convertPartyId, setConvertPartyId] = React.useState("");
  const [convertWarehouseId, setConvertWarehouseId] = React.useState("");
  const [outputTemplateId, setOutputTemplateId] = React.useState("");
  const [selectedConvertPartyOption, setSelectedConvertPartyOption] = React.useState<PartyLookupOption | null>(null);
  const [warehouseOptions, setWarehouseOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [warehouseTaskLink, setWarehouseTaskLink] = React.useState<{ label: string; href: string } | null>(null);
  const convertTargets = React.useMemo(() => {
    const raw = document?.availableConversionTargets ?? [];
    return [...new Set(raw)];
  }, [document?.availableConversionTargets]);
  const [resolvedPartyName, setResolvedPartyName] = React.useState<string | null>(null);
  const isPurchaseDoc = [
    "purchase-request",
    "purchase-order",
    "grn",
    "bill",
    "purchase-credit-note",
    "purchase-debit-note",
  ].includes(type);
  const counterpartyLabel = isPurchaseDoc ? "Supplier" : "Customer / Supplier";
  const displayPartyName = resolvedPartyName ?? document?.party ?? "—";

  React.useEffect(() => {
    setResolvedPartyName(null);
    if (!document?.partyId) return;
    const p = (document.party ?? "").trim();
    const uuidLike =
      !p ||
      p === document.partyId ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p);
    if (!uuidLike) return;
    let cancelled = false;
    void fetchPartyByIdApi(document.partyId)
      .then((row) => {
        if (!cancelled && row?.name?.trim()) setResolvedPartyName(row.name.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [document?.partyId, document?.party]);
  const availableActions = document?.availableActions ?? [];
  const canRequestApproval = availableActions.includes("submit");
  const canApprove = availableActions.includes("approve");
  const canPost = availableActions.includes("post");
  const canCancel = availableActions.includes("cancel");
  const canReverse = availableActions.includes("reverse");
  const printDoc = React.useMemo(
    () => ({
      type,
      id,
      title: `${label} ${document?.number ?? id}`,
      date: document?.date ?? "2025-01-28",
      party: displayPartyName,
      total: document?.total ?? 0,
      currency: document?.currency ?? "KES",
      lines: document?.lines,
    }),
    [type, id, label, document, displayPartyName]
  );

  const refreshDocument = React.useCallback(async () => {
    setLoading(true);
    try {
      setDocument(await fetchDocumentDetailApi(type as DocTypeKey, id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [type, id]);

  React.useEffect(() => {
    void refreshDocument();
  }, [refreshDocument]);

  React.useEffect(() => {
    if (!convertOpen || !convertType) return;
    let active = true;
    const loadOptions = async () => {
      const needsWarehouse = ["delivery-note", "grn"].includes(convertType);
      const warehouseResults = await (needsWarehouse ? fetchWarehouseOptions() : Promise.resolve([]));
      if (!active) return;
      setWarehouseOptions(warehouseResults);
    };
    void loadOptions().catch((error) => toast.error((error as Error).message));
    return () => {
      active = false;
    };
  }, [convertOpen, convertType]);

  React.useEffect(() => {
    if (!document) {
      setWarehouseTaskLink(null);
      return;
    }
    let active = true;
    const loadWarehouseTask = async () => {
      try {
        if (type === "delivery-note") {
          const items = await fetchPickPackTasks({ sourceDocumentId: id });
          if (!active) return;
          setWarehouseTaskLink(items[0] ? { label: `Open pick-pack ${items[0].number}`, href: `/warehouse/pick-pack/${items[0].id}` } : null);
          return;
        }
        if (type === "grn") {
          const items = await fetchPutawayTasks({ sourceDocumentId: id });
          if (!active) return;
          setWarehouseTaskLink(items[0] ? { label: `Open putaway ${items[0].grnNumber}`, href: `/warehouse/putaway/${items[0].id}` } : null);
          return;
        }
        setWarehouseTaskLink(null);
      } catch {
        if (active) setWarehouseTaskLink(null);
      }
    };
    void loadWarehouseTask();
    return () => {
      active = false;
    };
  }, [document, id, type]);

  const isUuidLike = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const openConvertSheet = React.useCallback(
    (targetType: DocTypeKey) => {
      setConvertType(targetType);
      setConvertPartyId(document?.partyId ?? "");
      const resolvedLabel =
        displayPartyName !== "—" && !isUuidLike(displayPartyName) ? displayPartyName : null;
      setSelectedConvertPartyOption(
        document?.partyId && resolvedLabel
          ? { id: document.partyId, label: resolvedLabel }
          : null
      );
      setConvertWarehouseId(document?.warehouseId ?? "");
      setOutputTemplateId(document?.outputTemplateId ?? "");
      setConvertOpen(true);
    },
    [document, displayPartyName]
  );

  const rightSlot = (
    <DynamicNextStepsPanel
      type={type}
      document={document}
      convertTargets={convertTargets}
      warehouseTaskLink={warehouseTaskLink}
      actionLoading={actionLoading}
      onAction={async (action) => {
        setActionLoading(true);
        try {
          await documentActionApi(type as DocTypeKey, id, action as "approve" | "post" | "cancel");
          await refreshDocument();
          toast.success(`Document ${action}d.`);
        } catch (e) { toast.error((e as Error).message); }
        finally { setActionLoading(false); }
      }}
      onConvert={openConvertSheet}
      onSendEmail={() => { setEmailTo(""); setEmailDialogOpen(true); }}
    />
  );

  const selectedConvertParty = React.useMemo(() => {
    if (!convertPartyId || document?.partyId !== convertPartyId) {
      return selectedConvertPartyOption;
    }
    const raw = displayPartyName !== "—" ? displayPartyName : document?.party;
    const label = raw && !isUuidLike(raw) ? raw : null;
    if (!label) return selectedConvertPartyOption;
    return {
      id: convertPartyId,
      label,
    };
  }, [convertPartyId, document?.party, document?.partyId, selectedConvertPartyOption, displayPartyName]);

  const displayTitle = document?.number ? `${document.number}` : `${label} ${id}`;
  const breadcrumbLabel = document?.number ?? id;

  return (
    <DocumentPageShell
      title={displayTitle}
      breadcrumbs={[
        { label: "Documents", href: "/docs" },
        { label, href: `/docs/${type}` },
        { label: breadcrumbLabel },
      ]}
      status={document?.status ?? "APPROVED"}
      rightSlot={rightSlot}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {convertTargets.map((targetType) => (
            <Button
              key={targetType}
              size="sm"
              disabled={actionLoading}
              onClick={() => openConvertSheet(targetType)}
            >
              <Icons.GitBranchPlus className="mr-2 h-4 w-4" />
              Convert to {targetType.replace(/-/g, " ")}
            </Button>
          ))}
          {canRequestApproval && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await requestDocumentApprovalApi(type as DocTypeKey, id);
                  await refreshDocument();
                  toast.success("Approval requested.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Icons.CheckCircle2 className="mr-2 h-4 w-4" />
              Request approval
            </Button>
          )}
          {document?.status === "POSTED" && (
            <Button variant="outline" size="sm" disabled className="opacity-70 cursor-default">
              <Icons.CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Posted
            </Button>
          )}
          {(canApprove || canPost) && (
            <>
              {canApprove && (
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await documentActionApi(type as DocTypeKey, id, "approve");
                    await refreshDocument();
                    toast.success("Document approved.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                <Icons.Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              )}
              {canPost && (
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await documentActionApi(type as DocTypeKey, id, "post");
                    await refreshDocument();
                    toast.success("Document posted.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Send className="mr-2 h-4 w-4" />}
                Post
              </Button>
              )}
            </>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await documentActionApi(type as DocTypeKey, id, "cancel");
                  await refreshDocument();
                  toast.success("Document cancelled.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Icons.XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          {canReverse && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await documentActionApi(type as DocTypeKey, id, "reverse");
                  await refreshDocument();
                  toast.success("Reversal created.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Icons.RotateCcw className="mr-2 h-4 w-4" />
              Reverse
            </Button>
          )}
          {type === "credit-note" && document?.status === "POSTED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!document?.partyId) { toast.error("No party on this credit note."); return; }
                setApplyLoading(true);
                try {
                  const resp = await fetch(`/api/ar/open-invoices?partyId=${document.partyId}`);
                  if (resp.ok) {
                    const data = await resp.json() as { items?: Array<{ id: string; number: string; outstanding: number; currency: string }> };
                    setOpenInvoices((data.items ?? []).map((item) => ({ id: item.id, number: item.number, openAmount: item.outstanding, currency: item.currency ?? document.currency ?? "KES" })));
                  }
                } catch { /* ignore */ } finally {
                  setApplyLoading(false);
                }
                setSelectedInvoiceId("");
                setApplyAmount(String(document.total ?? ""));
                setApplyDialogOpen(true);
              }}
            >
              <Icons.Link className="mr-2 h-4 w-4" />
              Apply to invoice
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Icons.MoreHorizontal className="mr-2 h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  downloadDocumentPdfApi(type as DocTypeKey, id, `${document?.number ?? type}-${id}.pdf`, (msg) =>
                    toast.info(msg || "Export not available.")
                  )
                }
              >
                <Icons.FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPrintOpen(true)}>
                <Icons.Printer className="mr-2 h-4 w-4" />
                Print
              </DropdownMenuItem>
              {(type === "invoice" || type === "credit-note") && (
                <DropdownMenuItem
                  onClick={() => {
                    setEmailTo("");
                    setEmailDialogOpen(true);
                  }}
                >
                  <Icons.Mail className="mr-2 h-4 w-4" />
                  Send to customer
                  {document?.emailedAt && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (sent {new Date(document.emailedAt).toLocaleDateString()})
                    </span>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/docs/${type}`}>
                  <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                  Back to list
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Header</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading document...</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Number</p>
                    <p className="font-medium">{document?.number ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {document?.date
                        ? new Date(document.date as string).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{counterpartyLabel}</p>
                    <p className="font-medium">{displayPartyName !== "—" ? displayPartyName : "Internal document"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
                    <DualCurrencyAmount
                      amount={document?.total ?? 0}
                      currency={document?.currency ?? "KES"}
                      exchangeRate={document?.exchangeRate}
                      size="md"
                    />
                  </div>
                </div>
                {/* Invoice payment status bar */}
                {type === "invoice" && document?.paymentStatus && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-muted-foreground">Payment status</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          document.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : document.paymentStatus === "PARTIALLY_PAID"
                              ? "bg-amber-100 text-amber-700"
                              : document.isOverdue
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {document.isOverdue && document.paymentStatus !== "PAID"
                          ? "OVERDUE"
                          : document.paymentStatus?.replace("_", " ")}
                      </span>
                    </div>
                    {document.paymentStatus !== "PAID" && document.total != null && (
                      <>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${document.isOverdue ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{
                              width: `${Math.min(
                                100,
                                document.total > 0
                                  ? Math.round(((document.paidAmount ?? 0) / document.total) * 100)
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatMoney(
                            kesEquivalent(document.paidAmount ?? 0, document.currency ?? "KES", document.exchangeRate) ?? (document.paidAmount ?? 0),
                            "KES"
                          )}{" "}
                          paid of{" "}
                          {formatMoney(
                            kesEquivalent(document.total, document.currency ?? "KES", document.exchangeRate) ?? document.total,
                            "KES"
                          )}
                          {document.dueDate && (
                            <span className="ml-2">· Due {new Date(document.dueDate).toLocaleDateString()}</span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {(document?.sourceDocument || (document?.relatedDocuments?.length ?? 0) > 0 || (document?.documentChain?.length ?? 0) > 0) && (
          <DocumentChainCard
            sourceDocument={document?.sourceDocument}
            documentChain={document?.documentChain ?? []}
            currency={document?.currency ?? "KES"}
            exchangeRate={document?.exchangeRate}
            currentId={id}
          />
        )}
        <DocumentTabs
          lines={
            <Card>
              <CardContent className="pt-4">
                {(document?.lines ?? []).length === 0 ? (
                  <div className="rounded border border-dashed py-12 text-center">
                    <p className="text-muted-foreground mb-1">No line items</p>
                    {document?.status === "DRAFT" ? (
                      <p className="text-sm text-muted-foreground">
                        Add lines to complete this document.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This document has no line items.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded border">
                    <div className="grid grid-cols-[1fr_90px_90px_140px] gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Description</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Remaining</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {(document?.lines ?? []).map((line) => (
                      <div key={line.id ?? line.description} className="grid grid-cols-[1fr_90px_90px_140px] gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                        <div>
                          <span>{line.description}</span>
                          {line.sourceDocumentType && line.sourceDocumentId ? (
                            <p className="text-xs text-muted-foreground">
                              From {line.sourceDocumentType.replace(/-/g, " ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-right">{line.qty ?? "—"}</span>
                        <span className="text-right">{line.remainingQuantity != null ? line.remainingQuantity.toLocaleString() : "—"}</span>
                        <div className="flex justify-end">
                          {line.amount != null ? (
                            <DualCurrencyAmount
                              amount={line.amount}
                              currency={document?.currency ?? "KES"}
                              exchangeRate={document?.exchangeRate}
                              align="right"
                              size="sm"
                            />
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          }
          taxes={<DocumentTaxesPanel docType={type} docId={id} currency="KES" />}
          attachments={
            <DocumentAttachments
              files={document?.attachments}
              onUpload={async (file) => {
                await uploadDocumentAttachmentApi(type as DocTypeKey, id, file);
                await refreshDocument();
                toast.success(`Attachment ${file.name} uploaded.`);
              }}
              onDownload={(file) => {
                downloadDocumentAttachmentApi(type as DocTypeKey, id, file.id, file.name, (msg) =>
                  toast.info(msg || "Attachment download unavailable.")
                );
              }}
            />
          }
          comments={
            <Card>
              <CardContent className="pt-4">
                <DocumentComments
                  comments={document?.comments}
                  onAddComment={async (body) => {
                    await addDocumentCommentApi(type as DocTypeKey, id, body);
                    await refreshDocument();
                  }}
                />
              </CardContent>
            </Card>
          }
          approval={
            <Card>
              <CardContent className="pt-4">
                <DocumentTimeline entries={document?.approvalHistory ?? []} />
              </CardContent>
            </Card>
          }
          audit={
            <Card>
              <CardContent className="pt-4">
                <DocumentTimeline entries={document?.auditHistory ?? []} />
              </CardContent>
            </Card>
          }
        />
      </div>
      <PrintPreviewDrawer
        open={printOpen}
        onOpenChange={setPrintOpen}
        doc={printDoc}
      />
      <Sheet open={convertOpen} onOpenChange={setConvertOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Convert document</SheetTitle>
            <SheetDescription>
              Confirm downstream details before creating the next linked document.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="rounded border p-3 text-sm">
              <p className="font-medium">{document?.number ?? id}</p>
              <p className="text-muted-foreground">
                {type.replace(/-/g, " ")} to {convertType?.replace(/-/g, " ")}
              </p>
            </div>
            {convertType && ["quote", "sales-order", "delivery-note", "invoice", "purchase-order", "bill"].includes(convertType) ? (
              <div className="space-y-2">
                <Label htmlFor="convert-party">
                  {["purchase-order", "bill"].includes(convertType) ? "Supplier" : "Customer"}
                </Label>
                <AsyncSearchableSelect
                  value={convertPartyId}
                  onValueChange={(value) => {
                    setConvertPartyId(value);
                    if (!value) setSelectedConvertPartyOption(null);
                  }}
                  onOptionSelect={(option) => setSelectedConvertPartyOption(option)}
                  loadOptions={
                    ["purchase-order", "bill"].includes(convertType)
                      ? searchApSupplierOptionsApi
                      : searchArCustomerOptionsApi
                  }
                  selectedOption={selectedConvertParty}
                  placeholder="Select counterparty"
                  searchPlaceholder="Type name, code, phone, or email"
                  emptyMessage="No counterparties found."
                  recentStorageKey={
                    ["purchase-order", "bill"].includes(convertType)
                      ? "lookup:recent-suppliers"
                      : "lookup:recent-customers"
                  }
                  allowClear
                />
              </div>
            ) : null}
            {convertType && ["delivery-note", "grn"].includes(convertType) ? (
              <div className="space-y-2">
                <Label htmlFor="convert-warehouse">Warehouse</Label>
                <SearchableSelect
                  value={convertWarehouseId || ""}
                  onValueChange={(value) => setConvertWarehouseId(value)}
                  options={[{ id: "", label: "Leave blank" }, ...warehouseOptions]}
                  placeholder="Select warehouse"
                  searchPlaceholder="Type to search warehouses"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="convert-template">Output template</Label>
              <Input
                id="convert-template"
                value={outputTemplateId}
                onChange={(e) => setOutputTemplateId(e.target.value)}
                placeholder="Default, loading-note-v1, customer-custom-a"
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading || !convertType}
              onClick={async () => {
                if (!convertType) return;
                setActionLoading(true);
                try {
                  const created = await convertDocumentApi(type as DocTypeKey, id, {
                    targetType: convertType,
                    partyId: convertPartyId || undefined,
                    warehouseId: convertWarehouseId || undefined,
                    outputTemplateId: outputTemplateId || undefined,
                  });
                  toast.success(`Created ${created.number ?? convertType}.`);
                  setConvertOpen(false);
                  if (created.id) {
                    router.push(`/docs/${convertType}/${created.id}`);
                    return;
                  }
                  await refreshDocument();
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Create linked document
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Apply credit note to invoice dialog */}
      {applyDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Link className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Apply credit note to invoice</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select an open invoice for this customer to net off against the credit note.
            </p>
            <div className="mb-4 space-y-3">
              <div>
                <Label className="text-xs mb-1 block">Invoice</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = openInvoices.find((i) => i.id === e.target.value);
                    if (inv) setApplyAmount(String(Math.min(inv.openAmount, document?.total ?? 0)));
                  }}
                >
                  <option value="">Select invoice...</option>
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} — {inv.currency} {inv.openAmount.toLocaleString()} outstanding
                    </option>
                  ))}
                  {openInvoices.length === 0 && <option disabled>No open invoices found</option>}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Amount to apply</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={applyLoading || !selectedInvoiceId || !applyAmount}
                onClick={async () => {
                  setApplyLoading(true);
                  try {
                    const resp = await fetch("/api/ar/credit-note-applications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ creditNoteId: id, invoiceId: selectedInvoiceId, amount: parseFloat(applyAmount) }),
                    });
                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({ error: "Failed" }));
                      throw new Error((err as { error?: string }).error || "Failed to apply");
                    }
                    toast.success("Credit note applied to invoice.");
                    setApplyDialogOpen(false);
                    await refreshDocument();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setApplyLoading(false);
                  }
                }}
              >
                {applyLoading ? "Applying..." : "Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email to customer dialog */}
      {emailDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Mail className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Send to customer</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The invoice PDF will be attached and sent to the customer email address.
              {document?.emailedAt && (
                <span className="block mt-1 text-xs">
                  Last sent: {new Date(document.emailedAt).toLocaleString()}
                  {document.emailedTo ? ` → ${document.emailedTo}` : ""}
                </span>
              )}
            </p>
            <div className="mb-4">
              <Label className="text-xs mb-1 block">Override email (optional)</Label>
              <Input
                placeholder="Leave blank to use customer email on file"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                type="email"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={emailSending}
                onClick={async () => {
                  setEmailSending(true);
                  try {
                    const body: Record<string, string> = {};
                    if (emailTo.trim()) body.overrideTo = emailTo.trim();
                    const resp = await fetch(`/api/documents/invoice/${id}/email`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({ error: "Failed to send" }));
                      throw new Error((err as { error?: string }).error || "Failed to send");
                    }
                    const result = await resp.json() as { to?: string };
                    toast.success(`Invoice sent to ${result.to ?? "customer"}`);
                    setEmailDialogOpen(false);
                    await refreshDocument();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setEmailSending(false);
                  }
                }}
              >
                <Icons.Send className="mr-2 h-4 w-4" />
                {emailSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DocumentPageShell>
  );
}

// ─── Dynamic Next Steps Panel ────────────────────────────────────────────────

function DynamicNextStepsPanel({
  type,
  document,
  convertTargets,
  warehouseTaskLink,
  actionLoading,
  onAction,
  onConvert,
  onSendEmail,
}: {
  type: string;
  document: DocumentDetailRecord | null;
  convertTargets: DocTypeKey[];
  warehouseTaskLink: { label: string; href: string } | null;
  actionLoading: boolean;
  onAction: (action: string) => Promise<void>;
  onConvert: (target: DocTypeKey) => void;
  onSendEmail: () => void;
}) {
  const status = document?.status ?? "";
  const paymentStatus = document?.paymentStatus;

  type GuidanceStep = { icon: React.ReactNode; text: string; action?: () => void; actionLabel?: string; href?: string; variant?: "default" | "outline" | "destructive" };
  const steps: GuidanceStep[] = [];

  if (type === "sales-order") {
    if (status === "DRAFT") {
      steps.push({ icon: <Icons.ListPlus className="h-4 w-4" />, text: "Add line items to this order" });
      steps.push({ icon: <Icons.CheckCircle2 className="h-4 w-4" />, text: "Submit for approval", action: () => void onAction("submit"), actionLabel: "Submit", variant: "default" });
    } else if (status === "PENDING" || status === "PENDING_APPROVAL") {
      steps.push({ icon: <Icons.Clock className="h-4 w-4 text-amber-500" />, text: "Awaiting manager approval" });
    } else if (status === "APPROVED") {
      steps.push({ icon: <Icons.Truck className="h-4 w-4 text-blue-500" />, text: "Ready to fulfill — create a Delivery Note", action: () => onConvert("delivery-note"), actionLabel: "Create Delivery Note", variant: "default" });
      steps.push({ icon: <Icons.FileText className="h-4 w-4" />, text: "Or convert directly to Invoice", action: () => onConvert("invoice"), actionLabel: "Convert to Invoice", variant: "outline" });
    }
  } else if (type === "delivery-note") {
    if (status === "DRAFT") {
      steps.push({ icon: <Icons.Package className="h-4 w-4" />, text: "Submit and complete pick & pack" });
    } else if (status === "DELIVERED" || status === "POSTED") {
      steps.push({ icon: <Icons.FileText className="h-4 w-4 text-emerald-500" />, text: "Delivery complete — create invoice", action: () => onConvert("invoice"), actionLabel: "Create Invoice", variant: "default" });
    }
    if (warehouseTaskLink) {
      steps.push({ icon: <Icons.Warehouse className="h-4 w-4" />, text: warehouseTaskLink.label, href: warehouseTaskLink.href });
    }
  } else if (type === "invoice") {
    if (status === "DRAFT") {
      const undelivered = (document?.linkedDeliveries ?? []).filter((d) => d.status !== "DELIVERED" && d.status !== "POSTED");
      if (undelivered.length > 0) {
        for (const dn of undelivered) {
          steps.push({
            icon: <Icons.Truck className="h-4 w-4 text-amber-500" />,
            text: `${dn.number} must be marked Delivered before posting`,
            href: `/docs/delivery-note/${dn.id}`,
            actionLabel: `Go to ${dn.number}`,
            variant: "default",
          });
        }
      } else {
        steps.push({ icon: <Icons.Send className="h-4 w-4" />, text: "Post invoice to finalize", action: () => void onAction("post"), actionLabel: "Post", variant: "default" });
      }
    } else if (status === "PENDING_APPROVAL") {
      steps.push({ icon: <Icons.Clock className="h-4 w-4 text-amber-500" />, text: "Awaiting credit approval — held due to credit policy breach" });
      steps.push({ icon: <Icons.CheckSquare className="h-4 w-4 text-blue-500" />, text: "Approve in Approvals Inbox", href: "/approvals/inbox", actionLabel: "Go to Inbox", variant: "default" });
    } else if (status === "APPROVED") {
      steps.push({ icon: <Icons.Send className="h-4 w-4 text-emerald-500" />, text: "Credit override approved — post invoice to finalize", action: () => void onAction("post"), actionLabel: "Post", variant: "default" });
    } else if (status === "POSTED") {
      if (paymentStatus === "PAID") {
        steps.push({ icon: <Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" />, text: "Invoice fully settled ✓" });
      } else if (paymentStatus === "PARTIALLY_PAID") {
        steps.push({ icon: <Icons.DollarSign className="h-4 w-4 text-amber-500" />, text: "Partially paid — record remaining payment", href: "/treasury/collections" });
        steps.push({ icon: <Icons.Mail className="h-4 w-4" />, text: "Send reminder to customer", action: onSendEmail, actionLabel: "Send Invoice", variant: "outline" });
      } else if (document?.isOverdue) {
        steps.push({ icon: <Icons.AlertTriangle className="h-4 w-4 text-red-500" />, text: "OVERDUE — follow up immediately", href: "/ar/aging" });
        steps.push({ icon: <Icons.Mail className="h-4 w-4" />, text: "Email invoice to customer", action: onSendEmail, actionLabel: "Send Email", variant: "default" });
      } else {
        steps.push({ icon: <Icons.DollarSign className="h-4 w-4" />, text: "Outstanding — record payment", href: "/treasury/collections" });
        steps.push({ icon: <Icons.Mail className="h-4 w-4" />, text: "Email invoice to customer", action: onSendEmail, actionLabel: "Send Email", variant: "outline" });
      }
    }
  } else if (type === "credit-note") {
    if (status === "POSTED") {
      steps.push({ icon: <Icons.Link className="h-4 w-4" />, text: "Apply to an open invoice directly from this page" });
    }
  } else if (type === "purchase-order") {
    if (status === "APPROVED") {
      steps.push({ icon: <Icons.Package className="h-4 w-4 text-blue-500" />, text: "Receive goods — create GRN", action: () => onConvert("grn"), actionLabel: "Create GRN", variant: "default" });
    }
  } else if (type === "grn") {
    if (status === "POSTED" || status === "APPROVED") {
      steps.push({ icon: <Icons.FileText className="h-4 w-4" />, text: "Create supplier bill", action: () => onConvert("bill"), actionLabel: "Create Bill", variant: "default" });
    }
  } else if (type === "bill") {
    if (status === "DRAFT" || status === "APPROVED") {
      const srcDoc = document?.sourceDocument;
      const grnBlocked = srcDoc?.typeKey === "grn" && srcDoc.status !== "RECEIVED";
      if (grnBlocked) {
        steps.push({
          icon: <Icons.AlertTriangle className="h-4 w-4 text-amber-500" />,
          text: `GRN ${srcDoc!.number} must be received before this bill can be posted`,
          href: `/docs/grn/${srcDoc!.id}`,
          actionLabel: `Go to ${srcDoc!.number}`,
          variant: "default",
        });
      } else {
        steps.push({
          icon: <Icons.Send className="h-4 w-4" />,
          text: "Post bill to record the liability",
          action: () => void onAction("post"),
          actionLabel: "Post",
          variant: "default",
        });
      }
    } else if (status === "POSTED") {
      steps.push({
        icon: <Icons.DollarSign className="h-4 w-4" />,
        text: "Outstanding — record payment to supplier",
        href: "/ap/payments",
      });
    }
  }

  const seenConvertTargets = new Set<string>();
  for (const target of convertTargets) {
    if (seenConvertTargets.has(target)) continue;
    seenConvertTargets.add(target);
    const label = target.replace(/-/g, " ");
    if (!steps.some((s) => s.actionLabel?.toLowerCase().includes(label))) {
      steps.push({
        icon: <Icons.GitBranchPlus className="h-4 w-4" />,
        text: `Convert to ${label}`,
        action: () => onConvert(target),
        actionLabel: `Convert to ${label}`,
        variant: "outline",
      });
    }
  }

  return (
    <DocumentRightPanel>
      <div className="space-y-4">
        <div>
          <p className="font-medium text-sm mb-1 flex items-center gap-1">
            <Icons.Compass className="h-3.5 w-3.5" />
            What to do next
          </p>
          {steps.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {status === "CANCELLED" ? "This document has been cancelled." :
               status === "REVERSED" ? "This document has been reversed." :
               "No further actions required."}
            </p>
          ) : (
            <ul className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-muted-foreground shrink-0">{step.icon}</span>
                  <div className="flex-1">
                    <p className="text-muted-foreground">{step.text}</p>
                    {step.action && step.actionLabel && (
                      <Button
                        size="sm"
                        variant={step.variant ?? "outline"}
                        className="mt-1 h-7 text-xs"
                        disabled={actionLoading}
                        onClick={step.action}
                      >
                        {step.actionLabel}
                      </Button>
                    )}
                    {step.href && !step.action && (
                      <Link href={step.href} className="text-primary text-xs underline-offset-4 hover:underline">
                        {step.actionLabel ?? "Go →"}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {document?.notes && (
          <div>
            <p className="font-medium text-sm mb-1">Notes</p>
            <p className="text-muted-foreground text-sm bg-muted/50 rounded p-2">{document.notes}</p>
          </div>
        )}
      </div>
    </DocumentRightPanel>
  );
}

// ─── Document Chain Timeline ────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "border-gray-300 bg-gray-50 text-gray-600",
  PENDING: "border-amber-400 bg-amber-50 text-amber-700",
  PENDING_APPROVAL: "border-amber-400 bg-amber-50 text-amber-700",
  APPROVED: "border-blue-400 bg-blue-50 text-blue-700",
  POSTED: "border-emerald-400 bg-emerald-50 text-emerald-700",
  PAID: "border-emerald-500 bg-emerald-100 text-emerald-800",
  DELIVERED: "border-emerald-400 bg-emerald-50 text-emerald-700",
  IN_TRANSIT: "border-blue-300 bg-blue-50 text-blue-600",
  CANCELLED: "border-red-300 bg-red-50 text-red-500",
  REVERSED: "border-red-400 bg-red-50 text-red-600",
};

function ChainNode({
  node,
  currency,
  exchangeRate,
}: {
  node: DocumentChainNode;
  currency: string;
  exchangeRate?: number;
}) {
  const colorClass = STATUS_COLORS[node.status] ?? "border-gray-300 bg-gray-50 text-gray-600";
  const isBase = !currency || currency.toUpperCase() === "KES";
  const kes = node.total != null ? (isBase ? node.total : (exchangeRate ? node.total * exchangeRate : null)) : null;
  return (
    <div className="flex items-start gap-1">
      <div className={`flex flex-col items-center`}>
        <Link
          href={`/docs/${node.typeKey}/${node.id}`}
          className={`inline-flex flex-col items-center border rounded-lg px-3 py-2 text-xs hover:opacity-80 transition-opacity cursor-pointer min-w-[90px] ${colorClass}`}
        >
          <span className="font-semibold truncate max-w-[80px]">{node.number}</span>
          <span className="text-[10px] opacity-70 capitalize">{node.typeKey.replace(/-/g, " ")}</span>
          <span className="text-[10px] font-medium mt-0.5">{node.status}</span>
          {node.total != null && (
            <span className="text-[10px] font-semibold mt-0.5">
              {kes !== null ? `KES ${kes.toLocaleString()}` : `${currency} ${node.total.toLocaleString()}`}
            </span>
          )}
          {node.total != null && !isBase && kes !== null && (
            <span className="text-[10px] opacity-50">{currency} {node.total.toLocaleString()}</span>
          )}
        </Link>
        {node.children.length > 0 && (
          <div className="flex items-start gap-1 mt-2 pl-2 border-l-2 border-muted ml-6">
            {node.children.map((child) => (
              <ChainNode key={child.id} node={child} currency={currency} exchangeRate={exchangeRate} />
            ))}
          </div>
        )}
      </div>
      {node.children.length > 0 && (
        <Icons.ChevronRight className="h-4 w-4 text-muted-foreground mt-3 flex-shrink-0" />
      )}
    </div>
  );
}

function DocumentChainCard({
  sourceDocument,
  documentChain,
  currency,
  exchangeRate,
  currentId,
}: {
  sourceDocument?: { id: string; typeKey: string; number: string; status: string } | null;
  documentChain: DocumentChainNode[];
  currency: string;
  exchangeRate?: number;
  currentId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icons.GitBranch className="h-4 w-4" />
          Document chain
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2 flex-wrap overflow-x-auto pb-2">
          {sourceDocument && (
            <>
              <Link
                href={`/docs/${sourceDocument.typeKey}/${sourceDocument.id}`}
                className={`inline-flex flex-col items-center border rounded-lg px-3 py-2 text-xs hover:opacity-80 min-w-[90px] ${STATUS_COLORS[sourceDocument.status] ?? "border-gray-300 bg-gray-50 text-gray-600"}`}
              >
                <span className="font-semibold">{sourceDocument.number}</span>
                <span className="text-[10px] opacity-70 capitalize">{sourceDocument.typeKey.replace(/-/g, " ")}</span>
                <span className="text-[10px] font-medium">{sourceDocument.status}</span>
              </Link>
              <Icons.ChevronRight className="h-4 w-4 text-muted-foreground mt-3" />
            </>
          )}
          {/* Current document marker */}
          <div className="inline-flex flex-col items-center border-2 border-primary rounded-lg px-3 py-2 text-xs min-w-[90px] bg-primary/5">
            <span className="font-bold text-primary">THIS DOC</span>
            <span className="text-[10px] opacity-60">{currentId.slice(0, 8)}...</span>
          </div>
          {documentChain.length > 0 && (
            <Icons.ChevronRight className="h-4 w-4 text-muted-foreground mt-3" />
          )}
          {documentChain.map((node, i) => (
            <React.Fragment key={node.id}>
              <ChainNode node={node} currency={currency} exchangeRate={exchangeRate} />
              {i < documentChain.length - 1 && <Icons.ChevronRight className="h-4 w-4 text-muted-foreground mt-3" />}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
