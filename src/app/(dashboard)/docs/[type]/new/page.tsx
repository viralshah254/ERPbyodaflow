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

  // ?poId= is used when arriving from the PO detail lifecycle timeline (GRN creation shortcut)
  const initialPoId = type === "grn" ? (searchParams.get("poId") ?? undefined) : undefined;

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
      />
      <div className="p-6">
        <DocumentCreateWizard type={type} initialPoId={initialPoId} />
      </div>
    </PageShell>
  );
}
