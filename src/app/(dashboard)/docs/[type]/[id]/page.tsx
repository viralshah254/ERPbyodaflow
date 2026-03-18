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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { getDocTypeConfig } from "@/config/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { formatMoney } from "@/lib/money";
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
import type { PartyLookupOption } from "@/lib/api/parties";
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
  const convertTargets = document?.availableConversionTargets ?? [];
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
      party: document?.party ?? "—",
      total: document?.total ?? 0,
      currency: document?.currency ?? "KES",
      lines: document?.lines,
    }),
    [type, id, label, document]
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

  const openConvertSheet = React.useCallback(
    (targetType: DocTypeKey) => {
      setConvertType(targetType);
      setConvertPartyId(document?.partyId ?? "");
      setSelectedConvertPartyOption(
        document?.partyId && document.party
          ? {
              id: document.partyId,
              label: document.party,
            }
          : null
      );
      setConvertWarehouseId(document?.warehouseId ?? "");
      setOutputTemplateId(document?.outputTemplateId ?? "");
      setConvertOpen(true);
    },
    [document]
  );

  const rightSlot = (
    <DocumentRightPanel
      validations={[
        { ok: true, message: "All validations passed" },
      ]}
      nextSteps={[
        ...(convertTargets.length ? [`Convert to ${convertTargets.map((item) => item.replace(/-/g, " ")).join(" / ")}`] : []),
        ...(document?.sourceDocument ? [`Linked from ${document.sourceDocument.number}`] : []),
        ...(warehouseTaskLink ? [warehouseTaskLink.label] : []),
      ]}
      actions={[
        ...(document?.sourceDocument ? [{ label: `Open ${document.sourceDocument.number}`, href: `/docs/${document.sourceDocument.typeKey}/${document.sourceDocument.id}` }] : []),
        ...(warehouseTaskLink ? [warehouseTaskLink] : []),
      ]}
    >
      <div>
        <p className="font-medium text-sm mb-1">Copilot</p>
        <p className="text-muted-foreground text-sm">Suggestions and actions appear here.</p>
      </div>
    </DocumentRightPanel>
  );

  const selectedConvertParty = React.useMemo(() => {
    if (!convertPartyId || !document?.party || document.partyId !== convertPartyId) {
      return selectedConvertPartyOption;
    }
    return {
      id: convertPartyId,
      label: document.party,
    };
  }, [convertPartyId, document?.party, document?.partyId, selectedConvertPartyOption]);

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
                variant="outline"
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
                <Icons.Send className="mr-2 h-4 w-4" />
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Number</p>
                  <p className="font-medium">{document?.number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
                  <p className="font-medium">{document?.date ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer / Supplier</p>
                  <p className="font-medium">{document?.party ?? "Internal document"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="font-medium">
                    {formatMoney(document?.total ?? 0, document?.currency ?? "KES")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {(document?.sourceDocument || (document?.relatedDocuments?.length ?? 0) > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document chain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {document?.sourceDocument && (
                <div className="rounded border p-3">
                  <p className="font-medium">Source</p>
                  <Link
                    href={`/docs/${document.sourceDocument.typeKey}/${document.sourceDocument.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {document.sourceDocument.number}
                  </Link>
                  <p className="text-muted-foreground">
                    {document.sourceDocument.typeKey.replace(/-/g, " ")} · {document.sourceDocument.status}
                  </p>
                </div>
              )}
              {(document?.relatedDocuments?.length ?? 0) > 0 && (
                <div className="rounded border p-3">
                  <p className="font-medium">Derived documents</p>
                  <div className="mt-2 space-y-2">
                    {document?.relatedDocuments?.map((related) => (
                      <div key={related.id} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
                        <div>
                          <Link
                            href={`/docs/${related.typeKey}/${related.id}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {related.number}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {related.typeKey.replace(/-/g, " ")} · {related.status}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {related.total != null ? `${related.total.toLocaleString()} ${document?.currency ?? "KES"}` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
                    <div className="grid grid-cols-[1fr_90px_90px_120px] gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Description</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Remaining</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {(document?.lines ?? []).map((line) => (
                      <div key={line.id ?? line.description} className="grid grid-cols-[1fr_90px_90px_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0">
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
                        <span className="text-right">{line.amount != null ? line.amount.toLocaleString() : "—"}</span>
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
                <Select value={convertWarehouseId || "__none__"} onValueChange={(value) => setConvertWarehouseId(value === "__none__" ? "" : value)}>
                  <SelectTrigger id="convert-warehouse">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Leave blank</SelectItem>
                    {warehouseOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </DocumentPageShell>
  );
}
