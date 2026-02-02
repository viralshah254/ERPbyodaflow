"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CustomizerModulesPage() {
  return (
    <PageLayout
      title="Modules"
      description="Enable and configure modules (Enterprise)"
    >
      <Card>
        <CardHeader>
          <CardTitle>Module Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Grid"
            title="Module configuration"
            description="Enable and disable modules based on your needs"
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





