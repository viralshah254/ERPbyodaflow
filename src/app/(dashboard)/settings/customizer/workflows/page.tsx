"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CustomizerWorkflowsPage() {
  return (
    <PageLayout
      title="Workflows"
      description="Configure custom workflows (Enterprise)"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Custom Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Workflow"
            title="No workflows"
            description="Create custom workflows to automate business processes"
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





