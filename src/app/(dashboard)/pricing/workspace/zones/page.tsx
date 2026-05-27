"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPricingZone,
  fetchFranchisePricingProfiles,
  fetchPricingZones,
  type FranchisePricingProfileRow,
} from "@/lib/api/pricing-engine";
import { fetchFranchiseNetworkOutlets } from "@/lib/api/cool-catch";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import { PRICING_MARKET_TIERS } from "@/lib/pricing/engine-types";
import { toast } from "sonner";

export default function PricingZonesPage() {
  const [zones, setZones] = React.useState<Awaited<ReturnType<typeof fetchPricingZones>>>([]);
  const [profiles, setProfiles] = React.useState<FranchisePricingProfileRow[]>([]);
  const [outlets, setOutlets] = React.useState<Awaited<ReturnType<typeof fetchFranchiseNetworkOutlets>>>([]);
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  const [name, setName] = React.useState("");
  const [tier, setTier] = React.useState("TIER_1");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    const [z, p, o, pl] = await Promise.all([
      fetchPricingZones().catch(() => []),
      fetchFranchisePricingProfiles().catch(() => []),
      fetchFranchiseNetworkOutlets().catch(() => []),
      fetchPriceListsForUi().catch(() => []),
    ]);
    setZones(z);
    setProfiles(p);
    setOutlets(o);
    setPriceLists(pl);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id.slice(0, 8);
  const franchiseName = (id: string) =>
    outlets.find((o) => o.franchiseeRegistryId === id)?.name ?? id.slice(0, 8);
  const zoneLists = (zoneId: string) =>
    priceLists.filter((pl) => pl.zoneId === zoneId && (pl.channel === "FRANCHISE" || pl.channel === "Franchise"));

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Zone name is required.");
      return;
    }
    setSaving(true);
    try {
      await createPricingZone({ name: name.trim(), tier, description: description.trim() || undefined });
      toast.success("Zone created");
      setName("");
      setDescription("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create zone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Franchise pricing zones"
        description="Set zone-level price lists; franchises inherit zone presets and can override per outlet."
        breadcrumbs={[
          { label: "Pricing", href: "/pricing/workspace/overview" },
          { label: "Zones" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/pricing/workspace/lists">Price lists</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add pricing zone</CardTitle>
            <CardDescription>
              Link a FRANCHISE-channel price list to the zone from Price lists (zone column).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone 1 — Nairobi" />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_MARKET_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Creating…" : "Create zone"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Franchise price lists</TableHead>
                  <TableHead>Franchise profiles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                      No zones yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((z) => {
                    const lists = zoneLists(z.id);
                    const profs = profiles.filter((p) => p.zoneId === z.id);
                    return (
                      <TableRow key={z.id}>
                        <TableCell className="font-medium">{z.name}</TableCell>
                        <TableCell>{z.tier ?? "—"}</TableCell>
                        <TableCell>
                          {lists.length === 0 ? (
                            <span className="text-muted-foreground text-sm">No FRANCHISE list linked</span>
                          ) : (
                            lists.map((pl) => (
                              <Link
                                key={pl.id}
                                href={`/pricing/price-lists/${pl.id}`}
                                className="block text-sm text-primary underline"
                              >
                                {pl.name}
                              </Link>
                            ))
                          )}
                        </TableCell>
                        <TableCell>
                          {profs.length === 0 ? (
                            "—"
                          ) : (
                            profs.map((p) => (
                              <Badge key={p.id} variant="secondary" className="mr-1">
                                {franchiseName(p.franchiseId)}
                              </Badge>
                            ))
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Assign zones per outlet on{" "}
          <Link href="/franchise/network/outlets" className="text-primary underline">
            Franchise network → outlet → Pricing tab
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
