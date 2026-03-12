"use client";

import * as React from "react";
import { useParams } from "next/navigation";
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
import { getDocTypeConfig } from "@/config/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import {
  addDocumentCommentApi,
  downloadDocumentAttachmentApi,
  fetchDocumentDetailApi,
  uploadDocumentAttachmentApi,
} from "@/lib/api/documents";
import {
  documentAction as documentActionEndpoint,
  documentDownloadPdf as documentDownloadPdfEndpoint,
  documentRequestApproval as documentRequestApprovalEndpoint,
} from "@/lib/api/stub-endpoints";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DocViewPage() {
  const params = useParams();
  const type = params.type as string;
  const id = params.id as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;
  const [printOpen, setPrintOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [document, setDocument] = React.useState<Awaited<ReturnType<typeof fetchDocumentDetailApi>>>(null);

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

  const rightSlot = (
    <DocumentRightPanel
      validations={[
        { ok: true, message: "All validations passed" },
      ]}
      nextSteps={["Create invoice from this order", "Schedule delivery"]}
      actions={[
        { label: "Create invoice", href: "/docs/invoice/new" },
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
        <DocumentTabs
          lines={
            <Card>
              <CardContent className="pt-4">
                <div className="rounded border">
                  <div className="grid grid-cols-[1fr_100px_120px] gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {(document?.lines ?? []).map((line) => (
                    <div key={line.description} className="grid grid-cols-[1fr_100px_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                      <span>{line.description}</span>
                      <span className="text-right">{line.qty ?? "—"}</span>
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
    </DocumentPageShell>
  );
}
