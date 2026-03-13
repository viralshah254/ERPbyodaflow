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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getDocTypeConfig } from "@/config/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import {
  addDocumentCommentApi,
  convertDocumentApi,
  downloadDocumentAttachmentApi,
  fetchDocumentDetailApi,
  uploadDocumentAttachmentApi,
} from "@/lib/api/documents";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { fetchApSuppliersApi, fetchArCustomersApi } from "@/lib/api/payments";
import {
  documentAction as documentActionEndpoint,
  documentDownloadPdf as documentDownloadPdfEndpoint,
  documentRequestApproval as documentRequestApprovalEndpoint,
} from "@/lib/api/stub-endpoints";
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
  const [counterpartyOptions, setCounterpartyOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [warehouseOptions, setWarehouseOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [warehouseTaskLink, setWarehouseTaskLink] = React.useState<{ label: string; href: string } | null>(null);
  const convertTargets = React.useMemo(() => {
    const map: Partial<Record<DocTypeKey, DocTypeKey[]>> = {
      quote: ["sales-order"],
      "sales-order": ["delivery-note", "invoice"],
      "delivery-note": ["invoice"],
      "purchase-request": ["purchase-order"],
      "purchase-order": ["grn", "bill"],
      grn: ["bill"],
    };
    return map[type as DocTypeKey] ?? [];
  }, [type]);

  const showRequestApproval = ["invoice", "bill", "journal"].includes(type);
  const showApprovePost = ["invoice", "bill", "journal", "sales-order", "purchase-order", "quote", "delivery-note", "purchase-request", "grn"].includes(type);
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
      const needsSupplier = ["purchase-order", "bill"].includes(convertType);
      const needsCustomer = ["quote", "sales-order", "delivery-note", "invoice"].includes(convertType);
      const needsWarehouse = ["delivery-note", "grn"].includes(convertType);
      const [partyResults, warehouseResults] = await Promise.all([
        needsSupplier
          ? fetchApSuppliersApi()
          : needsCustomer
            ? fetchArCustomersApi()
            : Promise.resolve([]),
        needsWarehouse ? fetchWarehouseOptions() : Promise.resolve([]),
      ]);
      if (!active) return;
      setCounterpartyOptions(partyResults);
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

  return (
    <DocumentPageShell
      title={`${label} ${id}`}
      breadcrumbs={[
        { label: "Documents", href: "/docs" },
        { label, href: `/docs/${type}` },
        { label: id },
      ]}
      status={document?.status ?? "APPROVED"}
      rightSlot={rightSlot}
      actions={
        <div className="flex gap-2 flex-wrap">
          {showRequestApproval && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await documentRequestApprovalEndpoint(type, id);
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
          {showApprovePost && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await documentActionEndpoint(type, id, "approve");
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
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await documentActionEndpoint(type, id, "post");
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
            </>
          )}
          {convertTargets.map((targetType) => (
            <Button
              key={targetType}
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => openConvertSheet(targetType)}
            >
              <Icons.GitBranchPlus className="mr-2 h-4 w-4" />
              Convert to {targetType.replace(/-/g, " ")}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              documentDownloadPdfEndpoint(type, id, `${type}-${id}.pdf`, (msg) =>
                toast.info(msg || "Export not available.")
              )
            }
          >
            <Icons.FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
            <Icons.Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/docs/${type}`}>Back to list</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Header</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {loading ? (
              <p>Loading document...</p>
            ) : (
              <>
                <p>{document?.number ?? `Document ${id}`}</p>
                <p>{document?.date ?? "—"} · {document?.party ?? "Internal document"}</p>
                <p>Status: {document?.status ?? "DRAFT"} · Total: {(document?.total ?? 0).toLocaleString()} {document?.currency ?? "KES"}</p>
              </>
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
                <SearchableSelect
                  value={convertPartyId}
                  onValueChange={setConvertPartyId}
                  options={counterpartyOptions.map((option) => ({ id: option.id, label: option.name }))}
                  placeholder="Select counterparty"
                  searchPlaceholder="Type to search counterparty"
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
