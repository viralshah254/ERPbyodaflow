"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CRMDealsPage() {
  return (
    <PageLayout
      title="Deals / Opportunities"
      description="Manage sales opportunities and deals"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Deal
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="TrendingUp"
            title="No deals"
            description="Track sales opportunities and deals here"
            action={{
              label: "Create Deal",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





