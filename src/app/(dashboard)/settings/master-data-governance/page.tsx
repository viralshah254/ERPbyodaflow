"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchMasterDataChangesApi, approveMasterDataChangeApi, type MasterDataChange } from "@/lib/api/master-governance";
import { toast } from "sonner";

export default function MasterDataGovernancePage() {
  const [items, setItems] = React.useState<MasterDataChange[]>([]);

  const load = React.useCallback(async () => {
    try {
      setItems(await fetchMasterDataChangesApi());
    } catch (error) {
      toast.error((error as Error).message || "Failed to load master data approvals.");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell>
      <PageHeader
        title="Master data governance"
        description="Review and approve critical master data changes with version tracking."
        breadcrumbs={[{ label: "Settings", href: "/settings/org" }, { label: "Master data governance" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending and recent change requests</CardTitle>
            <CardDescription>Products, pricing rules, taxes, and mappings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="text-sm font-medium">{item.entityType} · {item.entityId}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.requestedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.status === "APPLIED" ? "default" : "secondary"}>{item.status}</Badge>
                  {item.status === "PENDING" && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await approveMasterDataChangeApi(item._id);
                        toast.success("Change approved and applied.");
                        await load();
                      }}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-muted-foreground">No master data changes yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
