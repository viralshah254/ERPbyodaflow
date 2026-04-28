"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentCreateWizard } from "@/components/docs/DocumentCreateWizard";
import { getDocTypeConfig } from "@/config/documents";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";

export default function DocTypeNewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const type = params.type as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;

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
        description="Complete the steps below. Your progress is autosaved."
        breadcrumbs={[
          { label: "Documents", href: "/docs" },
          { label, href: `/docs/${type}` },
          { label: "New" },
        ]}
        sticky
        showCommandHint
        dense
      />
      <div className="p-4 pb-8 max-w-4xl">
        <DocumentCreateWizard type={type} initialPoId={initialPoId} initialGrnId={initialGrnId} />
      </div>
    </PageShell>
  );
}
