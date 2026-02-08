"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getKenyaProfile, saveKenyaProfile } from "@/lib/data/tax.repo";
import type { KenyaTaxProfile } from "@/lib/mock/tax/kenya";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/settings/tax/vat", label: "VAT", desc: "Rates: Standard, Zero, Exempt", icon: "Receipt" as const },
  { href: "/settings/tax/withholding", label: "Withholding tax", desc: "WHT codes, apply on AP/Payments", icon: "Percent" as const },
  { href: "/settings/tax/tax-mappings", label: "Tax mappings", desc: "Link tax codes to COA accounts", icon: "Link" as const },
];

export default function KenyaTaxProfilePage() {
  const [profile, setProfile] = React.useState<KenyaTaxProfile>({
    vatRegistered: false,
    vatPinMasked: null,
  });

  React.useEffect(() => {
    setProfile(getKenyaProfile());
  }, []);

  const handleSave = () => {
    saveKenyaProfile(profile);
    toast.info("Saved.");
  };

  const setVatRegistered = (v: boolean) =>
    setProfile((p) => ({ ...p, vatRegistered: v }));
  const setVatPin = (v: string) =>
    setProfile((p) => ({ ...p, vatPinMasked: v || null }));

  return (
    <PageShell>
      <PageHeader
        title="Kenya tax profile"
        description="VAT registration, PIN. Configure VAT, WHT, mappings."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Tax", href: "/settings/tax/kenya" },
          { label: "Kenya" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain VAT vs WHT in Kenya. Why is VAT higher this month?" label="Explain" />
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/financial/taxes">Tax codes</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">VAT registration</CardTitle>
            <CardDescription>Kenya VAT profile. Toggle and VAT PIN (masked).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="vat-reg"
                checked={profile.vatRegistered}
                onCheckedChange={(c) => setVatRegistered(c === true)}
              />
              <Label htmlFor="vat-reg">VAT registered</Label>
            </div>
            {profile.vatRegistered && (
              <div className="space-y-2">
                <Label htmlFor="vat-pin">VAT PIN (masked)</Label>
                <Input
                  id="vat-pin"
                  value={profile.vatPinMasked ?? ""}
                  onChange={(e) => setVatPin(e.target.value)}
                  placeholder="e.g. P051234567X"
                />
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.Circle) as React.ComponentType<{ className?: string }>;
            return (
              <Link key={href} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
