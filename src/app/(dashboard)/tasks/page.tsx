"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function TasksPage() {
  return (
    <PageLayout
      title="Tasks / Work Queue"
      description="Manage your assigned tasks and work items"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="CheckSquare"
            title="No tasks"
            description="Tasks assigned to you will appear here"
            action={{
              label: "Create Task",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





