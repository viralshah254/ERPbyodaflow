"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CRMActivitiesPage() {
  return (
    <PageLayout
      title="Activities / Notes"
      description="Track customer interactions and notes"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="StickyNote"
            title="No activities"
            description="Record customer interactions and notes here"
            action={{
              label: "Add Activity",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





