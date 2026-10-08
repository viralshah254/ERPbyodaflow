"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OdaflowCustomerMatchingBoard } from "@/components/integrations/OdaflowCustomerMatchingBoard";
import { useErpSfaEnrollment } from "@/lib/integrations/use-erp-sfa-enrollment";
import { useAuthStore } from "@/stores/auth-store";
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import * as Icons from "lucide-react";

export default function OdaflowCustomerMatchingPage() {
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const canSave = hasRuntimePermission(permissions, "admin.settings") ||
    hasRuntimePermission(permissions, "sales.write");
  const { enrolled: sfaEnrolled, loading: sfaEnrollmentLoading } = useErpSfaEnrollment();

  return (
    <PageShell>
      <PageHeader
        title="Customer matching"
        description="Link SFA direct customers and supermarket HQs to ERP. Create missing directs either way."
        breadcrumbs={[
          { label: "SFA sync", href: "/sales/odaflow-customer-matching" },
          { label: "Customer matching" },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/integrations/odaflow?tab=customers">
              <Icons.Settings className="mr-2 h-4 w-4" />
              Connector settings
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        {sfaEnrollmentLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Checking your Odaflow connection…
          </div>
        ) : sfaEnrolled ? (
          <OdaflowCustomerMatchingBoard canSave={canSave} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-base font-medium">Odaflow is not connected yet</p>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Finish the SFA connector setup first, then you can match direct customers and
                  modern-trade supermarket HQs here.
                </p>
              </div>
              <Button type="button" asChild>
                <Link href="/settings/integrations/odaflow?tab=setup">
                  Go to Setup
                  <Icons.ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
