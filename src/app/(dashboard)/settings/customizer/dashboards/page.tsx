"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CustomizerDashboardsPage() {
  return (
    <PageLayout
      title="Dashboards"
      description="Create and customize dashboards (Enterprise)"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Dashboard
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Custom Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="LayoutDashboard"
            title="No custom dashboards"
            description="Create custom dashboards with widgets tailored to your needs"
            action={{
              label: "Create Dashboard",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





