"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function BranchesPage() {
  return (
    <PageLayout
      title="Branches"
      description="Manage organization branches and locations"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="MapPin"
            title="No branches"
            description="Add branches to organize operations by location"
            action={{
              label: "Add Branch",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





