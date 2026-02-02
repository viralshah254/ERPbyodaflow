"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function ApprovalsWorkflowsPage() {
  return (
    <PageLayout
      title="Approvals Workflows"
      description="Configure multi-step approval processes"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="CheckCircle2"
            title="No workflows configured"
            description="Create approval workflows for orders, POs, and journals"
            action={{
              label: "Create Workflow",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





