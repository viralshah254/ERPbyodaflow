"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CashFlowPage() {
  return (
    <PageLayout
      title="Cash Flow Statement"
      description="Cash inflows and outflows for the selected period"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="ArrowLeftRight"
            title="No data available"
            description="Select a period to generate the cash flow statement"
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





