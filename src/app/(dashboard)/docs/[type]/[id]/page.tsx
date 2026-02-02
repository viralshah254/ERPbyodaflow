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
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

export default function DocViewPage() {
  const params = useParams();
  const type = params.type as string;
  const id = params.id as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;
  const [printOpen, setPrintOpen] = React.useState(false);

  const showRequestApproval = ["invoice", "bill", "journal"].includes(type);
  const printDoc = React.useMemo(
    () => ({
      type,
      id,
      title: `${label} ${id}`,
      date: "2025-01-28",
      party: "—",
      total: 0,
      currency: "KES",
    }),
    [type, id, label]
  );

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
      status="APPROVED"
      rightSlot={rightSlot}
      actions={
        <div className="flex gap-2">
          {showRequestApproval && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.alert("Request approval (stub): API pending.")}
            >
              <Icons.CheckCircle2 className="mr-2 h-4 w-4" />
              Request approval
            </Button>
          )}
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
          <CardContent className="text-sm text-muted-foreground">
            Document #{id} — stub. Date, party, totals would render here.
          </CardContent>
        </Card>
        <DocumentTabs
          lines={
            <Card>
              <CardContent className="pt-4">
                <div className="rounded border p-4 text-center text-sm text-muted-foreground">
                  Line items table (stub)
                </div>
              </CardContent>
            </Card>
          }
          taxes={<DocumentTaxesPanel docType={type} docId={id} currency="KES" />}
          attachments={<DocumentAttachments />}
          comments={
            <Card>
              <CardContent className="pt-4">
                <DocumentComments />
              </CardContent>
            </Card>
          }
          approval={
            <Card>
              <CardContent className="pt-4">
                <DocumentTimeline
                  entries={[
                    { id: "1", action: "Created", by: "System", at: "2025-01-28T10:00:00Z" },
                    { id: "2", action: "Approved", by: "Jane Doe", at: "2025-01-28T11:00:00Z" },
                  ]}
                />
              </CardContent>
            </Card>
          }
          audit={
            <Card>
              <CardContent className="pt-4">
                <DocumentTimeline entries={[]} />
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
