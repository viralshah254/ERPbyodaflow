"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const orgTypeParam = searchParams.get("orgType");

  const initialStep = stepParam ? parseInt(stepParam, 10) : 1;
  const initialOrgType = (orgTypeParam === "SHOP" ? "RETAIL" : orgTypeParam) as "MANUFACTURER" | "DISTRIBUTOR" | "RETAIL" | null;

  const handleComplete = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingWizard
        initialStep={initialStep}
        initialOrgType={initialOrgType}
        onComplete={handleComplete}
      />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <OnboardingContent />
    </React.Suspense>
  );
}





