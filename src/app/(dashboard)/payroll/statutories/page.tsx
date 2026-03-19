"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fetchPayrollStatutoriesRawApi } from "@/lib/api/payroll";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";

type StatRef = Awaited<ReturnType<typeof fetchPayrollStatutoriesRawApi>>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

function Band({ label, rate }: { label: string; rate?: number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b last:border-0">
      <span>{label}</span>
      {rate !== undefined && (
        <Badge variant="outline" className="text-xs font-mono">{(rate * 100).toFixed(1)}%</Badge>
      )}
    </div>
  );
}

function KenyaRates({ data }: { data: StatRef }) {
  const ft = (data as Record<string, unknown>)?.employeeTypes as Record<string, unknown> | undefined;
  const fullTime = ft?.fullTime as Record<string, unknown> | undefined;
  const consultant = ft?.consultant as Record<string, unknown> | undefined;

  if (!fullTime) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  const paye = fullTime.paye as Record<string, unknown> | undefined;
  const payeBands = (paye?.bands as { label: string; rate: number }[]) ?? [];
  const nssf = fullTime.nssf as Record<string, unknown> | undefined;
  const nssfTierI = nssf?.tierI as { employee: number; employer: number; label: string } | undefined;
  const nssfTierII = nssf?.tierII as { rate: number; lower: number; upper: number; maxEmployee: number; label: string } | undefined;
  const shif = fullTime.shif as Record<string, unknown> | undefined;
  const ahl = fullTime.ahl as Record<string, unknown> | undefined;
  const wht = (consultant?.wht as { rates: { type: string; rate: number; label: string }[]; threshold: number; thresholdLabel: string }) | undefined;

  return (
    <div className="space-y-6">
      {/* PAYE */}
      <Section title="PAYE — Pay As You Earn (Full-time)">
        <p className="mb-2">Progressive income tax on taxable income after NSSF + SHIF deductions.</p>
        {payeBands.map((b) => (
          <Band key={b.label} label={b.label} rate={b.rate} />
        ))}
        <p className="mt-2 text-xs">Personal relief: KES 2,400/month deducted from calculated tax.</p>
      </Section>

      {/* NSSF */}
      <Section title="NSSF — National Social Security Fund (2023 Act)">
        {nssfTierI && <Band label={`Tier I: ${nssfTierI.label}`} />}
        {nssfTierII && <Band label={`Tier II: ${nssfTierII.label}`} rate={nssfTierII.rate} />}
        <p className="text-xs mt-1">Max employee contribution: KES 4,320/month (Tier I + Tier II).</p>
      </Section>

      {/* SHIF */}
      <Section title="SHIF — Social Health Insurance Fund">
        <p className="text-xs italic mb-1">Replaced NHIF in October 2024.</p>
        {shif && <Band label={(shif.label as string) ?? "2.75% of gross, min KES 300"} rate={shif.rate as number | undefined} />}
      </Section>

      {/* AHL */}
      <Section title="AHL — Affordable Housing Levy">
        {ahl && <Band label={(ahl.label as string) ?? "1.5% of gross"} rate={ahl.rate as number | undefined} />}
        <p className="text-xs mt-1">No tax relief since December 2024 — deducted from net.</p>
      </Section>

      {/* WHT Consultants */}
      {wht && (
        <Section title="WHT — Withholding Tax (Consultants)">
          <p className="mb-1">{wht.thresholdLabel}</p>
          {wht.rates.map((r) => (
            <Band key={r.type} label={r.label} rate={r.rate} />
          ))}
        </Section>
      )}
    </div>
  );
}

function UgandaRates({ data }: { data: StatRef }) {
  const ft = (data as Record<string, unknown>)?.employeeTypes as Record<string, unknown> | undefined;
  const fullTime = ft?.fullTime as Record<string, unknown> | undefined;
  const consultant = ft?.consultant as Record<string, unknown> | undefined;

  if (!fullTime) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  const paye = fullTime.paye as Record<string, unknown> | undefined;
  const payeBands = (paye?.bands as { label: string; rate: number }[]) ?? [];
  const nssf = fullTime.nssf as Record<string, unknown> | undefined;
  const lst = fullTime.lst as Record<string, unknown> | undefined;
  const lstBands = (lst?.bands as { min: number; max: number; annual: number }[]) ?? [];
  const wht = (consultant?.wht as { rates: { type: string; rate: number; label: string }[] }) | undefined;

  return (
    <div className="space-y-6">
      {/* PAYE */}
      <Section title="PAYE — Pay As You Earn (Full-time)">
        <p className="mb-2">Progressive income tax — administered by Uganda Revenue Authority (URA).</p>
        {payeBands.map((b) => (
          <Band key={b.label} label={b.label} rate={b.rate} />
        ))}
      </Section>

      {/* NSSF */}
      <Section title="NSSF — National Social Security Fund">
        {nssf && (
          <>
            <Band label={`Employee: ${((nssf.employeeRate as number) * 100).toFixed(0)}% of gross`} rate={nssf.employeeRate as number | undefined} />
            <Band label={`Employer: ${((nssf.employerRate as number) * 100).toFixed(0)}% of gross`} rate={nssf.employerRate as number | undefined} />
          </>
        )}
        <p className="text-xs mt-1">{(nssf?.label as string) ?? "5% employee + 10% employer"}</p>
      </Section>

      {/* LST */}
      <Section title="LST — Local Service Tax">
        <p className="mb-1">{(lst?.label as string) ?? "Collected July–October. Fixed quarterly deduction by salary band."}</p>
        {lstBands.filter((b) => b.annual > 0).map((b, i) => (
          <Band
            key={i}
            label={`UGX ${b.min.toLocaleString()}–${b.max === Infinity ? "above" : b.max.toLocaleString()}: UGX ${b.annual.toLocaleString()}/yr`}
          />
        ))}
      </Section>

      {/* WHT Consultants */}
      {wht && (
        <Section title="WHT — Withholding Tax (Consultants)">
          {wht.rates.map((r) => (
            <Band key={r.type} label={r.label} rate={r.rate} />
          ))}
        </Section>
      )}
    </div>
  );
}

export default function StatutoriesPage() {
  const [keData, setKeData] = React.useState<StatRef | null>(null);
  const [ugData, setUgData] = React.useState<StatRef | null>(null);
  const [loadingKe, setLoadingKe] = React.useState(false);
  const [loadingUg, setLoadingUg] = React.useState(false);

  React.useEffect(() => {
    setLoadingKe(true);
    fetchPayrollStatutoriesRawApi("KE")
      .then(setKeData)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoadingKe(false));
  }, []);

  const handleUgandaTabClick = () => {
    if (!ugData && !loadingUg) {
      setLoadingUg(true);
      fetchPayrollStatutoriesRawApi("UG")
        .then(setUgData)
        .catch((e) => toast.error((e as Error).message))
        .finally(() => setLoadingUg(false));
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Statutory rates"
        description="Current statutory deduction reference — Kenya and Uganda (2025/2026 fiscal year)."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Statutory rates" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain Kenya PAYE, NSSF 2023, SHIF, AHL, and Uganda PAYE, NSSF, LST statutory rates for payroll." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Overview</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="KE">
          <TabsList className="mb-6">
            <TabsTrigger value="KE">🇰🇪 Kenya</TabsTrigger>
            <TabsTrigger value="UG" onClick={handleUgandaTabClick}>🇺🇬 Uganda</TabsTrigger>
          </TabsList>

          <TabsContent value="KE">
            <Card>
              <CardHeader>
                <CardTitle>Kenya — Statutory Deductions</CardTitle>
                <CardDescription>Rates effective 2025/2026. NHIF replaced by SHIF (Oct 2024). NSSF under 2023 Act.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingKe ? (
                  <p className="text-sm text-muted-foreground">Loading rates…</p>
                ) : keData ? (
                  <KenyaRates data={keData} />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="UG">
            <Card>
              <CardHeader>
                <CardTitle>Uganda — Statutory Deductions</CardTitle>
                <CardDescription>Rates effective 2025/2026 — Uganda Revenue Authority (URA).</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUg ? (
                  <p className="text-sm text-muted-foreground">Loading rates…</p>
                ) : ugData ? (
                  <UgandaRates data={ugData} />
                ) : (
                  <p className="text-sm text-muted-foreground">Click the Uganda tab to load rates.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
