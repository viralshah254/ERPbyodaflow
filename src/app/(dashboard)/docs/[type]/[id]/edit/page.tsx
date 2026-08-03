"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentCreateWizard } from "@/components/docs/DocumentCreateWizard";
import { DocumentEditWizardSkeleton } from "@/components/docs/DocumentEditWizardSkeleton";
import { fetchDocumentDetailApi } from "@/lib/api/documents";
import { getDocTypeConfig } from "@/config/documents";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import type { DocumentDetailRecord } from "@/lib/types/documents";
import { DeliveryNoteWarehousePanel } from "@/components/docs/DeliveryNoteWarehousePanel";
import { OdaflowSourceCard } from "@/components/integrations/OdaflowSourceCard";
import { odaflowSourceFromDetail } from "@/lib/odaflow/sales-order-source";
import { useCanWriteDocType } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DocEditPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;
  const canWrite = useCanWriteDocType(type);

  const [loading, setLoading] = React.useState(true);
  const [document, setDocument] = React.useState<DocumentDetailRecord | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDocumentDetailApi(type as import("@/config/documents/types").DocTypeKey, id, {
      include: ["core"],
    })
      .then((doc) => {
        if (cancelled) return;
        if (!doc) {
          setError("Document not found.");
          return;
        }
        if (doc.status !== "DRAFT") {
          toast.error("Only draft documents can be edited.");
          router.replace(`/docs/${type}/${id}`);
          return;
        }
        setDocument(doc);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message ?? "Failed to load document.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [type, id, router]);

  const refreshDocument = React.useCallback(async () => {
    const detail = await fetchDocumentDetailApi(type as import("@/config/documents/types").DocTypeKey, id, {
      include: ["core"],
    });
    if (detail) setDocument(detail);
  }, [type, id]);

  if (!canWrite) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
          <Icons.ShieldX className="h-8 w-8" />
          <p className="text-sm font-medium">You do not have write access</p>
          <p className="text-xs">You lack the required permission to edit this document type.</p>
        </div>
      </PageShell>
    );
  }

  if (error && !loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
          <Icons.AlertTriangle className="h-8 w-8" />
          <p className="text-sm">{error ?? "Document not found."}</p>
        </div>
      </PageShell>
    );
  }

  const odaflowSource = document ? odaflowSourceFromDetail(document) : null;

  return (
    <PageShell>
      <PageHeader
        title={document ? `Edit ${label} ${document.number}` : `Edit ${label}`}
        description="Modify header and line items. Use the numbered steps to go back; changes autosave as you work."
        breadcrumbs={[
          { label: "Documents", href: "/docs" },
          { label, href: `/docs/${type}` },
          ...(document
            ? [{ label: document.number ?? id, href: `/docs/${type}/${id}` }]
            : []),
          { label: "Edit" },
        ]}
        sticky
      />
      <div className="p-6 w-full max-w-screen-2xl mx-auto space-y-4">
        {loading ? (
          <DocumentEditWizardSkeleton />
        ) : document ? (
          <>
            {odaflowSource ? (
              <OdaflowSourceCard
                info={odaflowSource}
                showPdfPreview={Boolean(odaflowSource.sourcePdfUrl)}
                pdfPreviewDefaultExpanded={false}
              />
            ) : null}
            {type === "delivery-note" && document.status === "DRAFT" ? (
              <DeliveryNoteWarehousePanel
                documentId={document.id}
                branchId={document.branchId}
                warehouseId={document.warehouseId}
                canEdit={canWrite}
                compact
                onUpdated={refreshDocument}
              />
            ) : null}
            <DocumentCreateWizard type={type} mode="edit" existingDocument={document} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
            <Icons.AlertTriangle className="h-8 w-8" />
            <p className="text-sm">{error ?? "Document not found."}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
