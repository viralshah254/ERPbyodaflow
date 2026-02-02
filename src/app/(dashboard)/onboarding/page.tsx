"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SetupChecklistCard } from "@/components/dashboard/SetupChecklistCard";

export default function OnboardingPage() {
  return (
    <PageShell>
      <PageHeader
        title="Setup"
        description="Company setup, currencies, COA, taxes, bank accounts, invite users, create first doc"
        breadcrumbs={[{ label: "Onboarding" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 max-w-2xl">
        <SetupChecklistCard />
      </div>
    </PageShell>
  );
}
