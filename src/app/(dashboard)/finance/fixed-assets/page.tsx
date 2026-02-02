"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function FixedAssetsPage() {
  return (
    <PageLayout
      title="Fixed Assets"
      description="Manage fixed assets and depreciation"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Assets Register</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Building"
            title="No assets"
            description="Add fixed assets to track depreciation"
            action={{
              label: "Add Asset",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





