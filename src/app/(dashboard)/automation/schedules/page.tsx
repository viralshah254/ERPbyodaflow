"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function ScheduledJobsPage() {
  return (
    <PageLayout
      title="Scheduled Jobs"
      description="Manage automated tasks and reports"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Calendar"
            title="No scheduled jobs"
            description="Create schedules for automated reports and tasks"
            action={{
              label: "Create Schedule",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





