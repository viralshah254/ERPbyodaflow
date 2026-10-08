"use client";

import * as React from "react";
import Link from "next/link";
import {
  LIST_PAGE_BODY_PAGINATED_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OdaflowProductsSyncPanel } from "@/components/integrations/OdaflowProductsSyncPanel";
import { useErpSfaEnrollment } from "@/lib/integrations/use-erp-sfa-enrollment";
import { useAuthStore } from "@/stores/auth-store";
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import { fetchOdaflowProductMappings } from "@/lib/api/odaflow-integration";
import * as Icons from "lucide-react";
import { toast } from "sonner";

export default function OdaflowProductMatchingPage() {
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const canSave =
    hasRuntimePermission(permissions, "admin.settings") ||
    hasRuntimePermission(permissions, "inventory.write");
  const { enrolled: sfaEnrolled, loading: sfaEnrollmentLoading } = useErpSfaEnrollment();
  const [productMappingsCount, setProductMappingsCount] = React.useState(0);

  React.useEffect(() => {
    if (!sfaEnrolled) return;
    fetchOdaflowProductMappings()
      .then((prods) => setProductMappingsCount(prods.items.length))
      .catch(() => toast.error("Failed to load product mappings"));
  }, [sfaEnrolled]);

  return (
    <PageShell>
      <PageHeader
        title="Product matching"
        description="Sync ERP products into SFA catalogs and keep price lists aligned for the field."
        breadcrumbs={[
          { label: "SFA sync", href: "/sales/odaflow-customer-matching" },
          { label: "Product matching" },
        ]}
        sticky
        dense
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/integrations/odaflow?tab=products">
              <Icons.Settings className="mr-2 h-4 w-4" />
              Connector settings
            </Link>
          </Button>
        }
      />

      <div className={LIST_PAGE_BODY_PAGINATED_CLASS}>
        {sfaEnrollmentLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Checking your Odaflow connection…
          </div>
        ) : sfaEnrolled ? (
          <OdaflowProductsSyncPanel canSave={canSave} productMappingsCount={productMappingsCount} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-base font-medium">Odaflow is not connected yet</p>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Finish the SFA connector setup first, then you can match and sync products here.
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
