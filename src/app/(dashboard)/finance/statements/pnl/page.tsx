"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function ProfitAndLossPage() {
  return (
    <PageLayout
      title="Profit & Loss Statement"
      description="Income statement for the selected period"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>P&L Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="TrendingUp"
            title="No data available"
            description="Select a period to generate the profit and loss statement"
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





