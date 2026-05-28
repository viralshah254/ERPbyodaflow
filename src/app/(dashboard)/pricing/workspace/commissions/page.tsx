"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommissionDefaultsEditor } from "@/components/pricing/commission-defaults-editor";
import { fetchPricingZones } from "@/lib/api/pricing-engine";
import {
  fetchOrgCommissionDefaultsApi,
  fetchZoneCommissionDefaultsApi,
  putOrgCommissionDefaultsApi,
  putZoneCommissionDefaultsApi,
} from "@/lib/api/franchise-commission-defaults";

export default function PricingCommissionsPage() {
  const [zones, setZones] = React.useState<Awaited<ReturnType<typeof fetchPricingZones>>>([]);
  const [scope, setScope] = React.useState<"org" | "zone">("org");
  const [zoneId, setZoneId] = React.useState("");

  React.useEffect(() => {
    fetchPricingZones()
      .then((z) => {
        setZones(z);
        if (z.length && !zoneId) setZoneId(z[0].id);
      })
      .catch(() => setZones([]));
  }, [zoneId]);

  const fetchOrgDefaults = React.useCallback(
    (params: Parameters<typeof fetchOrgCommissionDefaultsApi>[0]) => fetchOrgCommissionDefaultsApi(params),
    []
  );

  const saveOrgDefaults = React.useCallback(
    async (items: Array<{ productId: string; commissionPerUnit: number }>) => {
      await putOrgCommissionDefaultsApi(items);
    },
    []
  );

  const fetchZoneDefaults = React.useCallback(
    (params: Parameters<typeof fetchZoneCommissionDefaultsApi>[1]) => {
      if (!zoneId) return Promise.resolve({ items: [], nextCursor: null });
      return fetchZoneCommissionDefaultsApi(zoneId, params);
    },
    [zoneId]
  );

  const saveZoneDefaults = React.useCallback(
    async (items: Array<{ productId: string; commissionPerUnit: number }>) => {
      if (!zoneId) return;
      await putZoneCommissionDefaultsApi(zoneId, items);
    },
    [zoneId]
  );

  return (
    <PageShell>
      <PageHeader
        title="Franchise commissions"
        description="Set network-wide default commission per SKU. Zone defaults override org defaults; outlets can override further on their Pricing tab."
      />
      <Card>
        <CardHeader>
          <CardTitle>Commission defaults</CardTitle>
          <CardDescription>
            Guide retail at each outlet = zone base price + effective commission (outlet override → zone default →
            network default).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={scope} onValueChange={(v) => setScope(v as "org" | "zone")}>
            <TabsList>
              <TabsTrigger value="org">Network defaults</TabsTrigger>
              <TabsTrigger value="zone">Zone defaults</TabsTrigger>
            </TabsList>
            <TabsContent value="org" className="mt-4 outline-none">
              <CommissionDefaultsEditor
                mode="org"
                fetchDefaults={fetchOrgDefaults}
                saveDefaults={saveOrgDefaults}
              />
            </TabsContent>
            <TabsContent value="zone" className="mt-4 space-y-4 outline-none">
              <div className="max-w-sm space-y-2">
                <label className="text-sm font-medium">Pricing zone</label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                        {z.tier ? ` (${z.tier})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {zoneId ? (
                <CommissionDefaultsEditor
                  key={zoneId}
                  mode="zone"
                  zoneId={zoneId}
                  fetchDefaults={fetchZoneDefaults}
                  saveDefaults={saveZoneDefaults}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Create a pricing zone first under Franchise zones.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageShell>
  );
}
