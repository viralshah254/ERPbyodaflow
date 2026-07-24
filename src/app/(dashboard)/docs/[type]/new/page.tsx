"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentCreateWizard } from "@/components/docs/DocumentCreateWizard";
import { getDocTypeConfig } from "@/config/documents";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useCanWriteDocType } from "@/lib/rbac/use-write-guard";
import * as Icons from "lucide-react";

export default function DocTypeNewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const type = params.type as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;
  const canWrite = useCanWriteDocType(type);

  if (!canWrite) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
          <Icons.ShieldX className="h-8 w-8" />
          <p className="text-sm font-medium">You do not have write access</p>
          <p className="text-xs">You lack the required permission to create this document type.</p>
        </div>
      </PageShell>
    );
  }

  // ?poId= — GRN from PO, or supplier bill from PO lifecycle (supplier + lines prefilled)
  const initialPoId =
    type === "grn" || type === "bill" ? (searchParams.get("poId") ?? undefined) : undefined;
  // ?grnId= — new bill prefilled from a GRN (supplier + lines); takes precedence over poId when both set
  const initialGrnId =
    type === "bill" ? (searchParams.get("grnId") ?? undefined) : undefined;

  return (
    <PageShell>
      <PageHeader
        title={`New ${label}`}
        description="Complete the steps below. Header, lines, and step progress are autosaved — refresh safely anytime."
        breadcrumbs={[
          { label: "Documents", href: "/docs" },
          { label, href: `/docs/${type}` },
          { label: "New" },
        ]}
        sticky
        showCommandHint
        dense
      />
      <div className="p-4 pb-8 w-full max-w-screen-2xl mx-auto">
        <DocumentCreateWizard type={type} initialPoId={initialPoId} initialGrnId={initialGrnId} />
      </div>
    </PageShell>
  );
}
