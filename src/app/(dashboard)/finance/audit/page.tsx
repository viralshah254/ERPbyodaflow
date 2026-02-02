"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function FinanceAuditPage() {
  return (
    <PageLayout
      title="Audit Log (Finance)"
      description="View all finance-related audit trail entries"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="FileSearch"
            title="No audit entries"
            description="Finance audit trail entries will appear here"
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





