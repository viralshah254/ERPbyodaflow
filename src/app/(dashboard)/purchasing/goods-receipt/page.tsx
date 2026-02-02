"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function GoodsReceiptPage() {
  return (
    <PageLayout
      title="Goods Receipt (GRN)"
      description="Record goods received from suppliers"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create GRN
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipt Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="PackageCheck"
            title="No GRNs"
            description="Record goods received to update inventory"
            action={{
              label: "Create GRN",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





