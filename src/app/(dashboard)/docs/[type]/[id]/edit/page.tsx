"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentCreateWizard } from "@/components/docs/DocumentCreateWizard";
import { fetchDocumentDetailApi } from "@/lib/api/documents";
import { getDocTypeConfig } from "@/config/documents";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import type { DocumentDetailRecord } from "@/lib/types/documents";
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

  const [loading, setLoading] = React.useState(true);
  const [document, setDocument] = React.useState<DocumentDetailRecord | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDocumentDetailApi(type as import("@/config/documents/types").DocTypeKey, id)
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

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Icons.Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading document…</span>
        </div>
      </PageShell>
    );
  }

  if (error || !document) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
          <Icons.AlertTriangle className="h-8 w-8" />
          <p className="text-sm">{error ?? "Document not found."}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`Edit ${label} ${document.number}`}
        description="Modify header and line items. Changes are saved when you click Save changes."
        breadcrumbs={[
          { label: "Documents", href: "/docs" },
          { label, href: `/docs/${type}` },
          { label: document.number ?? id, href: `/docs/${type}/${id}` },
          { label: "Edit" },
        ]}
        sticky
      />
      <div className="p-6">
        <DocumentCreateWizard
          type={type}
          mode="edit"
          existingDocument={document}
        />
      </div>
    </PageShell>
  );
}
