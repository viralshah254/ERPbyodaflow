"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CashWeightAuditPage() {
  return (
    <PageShell>
      <PageHeader
        title="Cash-to-Weight Audit"
        description="Reconcile PO → Cash disbursement → Actual weight received (CoD integrity)"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Cash-to-Weight Audit" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/ap/three-way-match">Standard 3-way match (PO / GRN / Bill)</Link>
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Procurement audit trail</CardTitle>
            <CardDescription>
              Three-way match: Purchase Order → Cash Disbursement → Actual Weight Received. Ensures cash paid at farm matches weight arriving at factory; track transit shrinkage and grading differences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is available when the Cool Catch (or procurement audit) template is enabled. Backend: link PO lines to cash payments and GRN weight; variance report (paid weight vs received weight).
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
