"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Step1Account } from "./steps/step-1-account";
import { Step2Industry } from "./steps/step-2-industry";
import { Step3OrgDetails } from "./steps/step-3-org-details";
import { Step4Modules } from "./steps/step-4-modules";
import { Step5Branches } from "./steps/step-5-branches";
import { Step6InviteTeam } from "./steps/step-6-invite-team";
import { Step7Finish } from "./steps/step-7-finish";
import * as Icons from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import type { TemplateOrgType } from "@/config/industryTemplates/index";

interface OnboardingWizardProps {
  initialStep?: number;
  initialOrgType?: TemplateOrgType | null;
  onComplete: () => void;
}

const TOTAL_STEPS = 7;

export function OnboardingWizard({
  initialStep = 1,
  initialOrgType = null,
  onComplete,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(initialStep);
  const { data, updateData, reset } = useOnboardingStore();
  const setFromOnboarding = useOrgContextStore((s) => s.setFromOnboarding);
  const { setUser, setOrg, setTenant, setCurrentBranch, setBranches } =
    useAuthStore();

  React.useEffect(() => {
    if (initialOrgType) {
      updateData({ orgType: initialOrgType });
    }
  }, [initialOrgType, updateData]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      router.push(`/signup/onboarding?step=${currentStep + 1}`);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      router.push(`/signup/onboarding?step=${currentStep - 1}`);
    }
  };

  const handleFinish = () => {
    const templateOrgType = data.orgType || "MANUFACTURER";
    const templateId = data.templateId;

    // Apply template to org context (single source of truth for nav, terminology, etc.)
    if (templateId && templateOrgType) {
      setFromOnboarding(templateOrgType, templateId);
    }

    // Auth org uses SHOP for RETAIL (legacy OrgType)
    const erpOrgType: "MANUFACTURER" | "DISTRIBUTOR" | "SHOP" =
      templateOrgType === "RETAIL" ? "SHOP" : templateOrgType;

    const mockOrg = {
      orgId: `org-${Date.now()}`,
      tenantId: `tenant-${Date.now()}`,
      orgType: erpOrgType,
      name: data.orgName || "My Organization",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockTenant = {
      tenantId: mockOrg.tenantId,
      name: mockOrg.name,
      plan: data.plan || "PROFESSIONAL",
      region: data.country || "US",
      currency: data.currency || "USD",
      timeZone: data.timezone || "America/New_York",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockBranch = {
      branchId: `branch-${Date.now()}`,
      orgId: mockOrg.orgId,
      name: data.branches?.[0]?.name || "Head Office",
      isHeadOffice: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUser = {
      userId: `user-${Date.now()}`,
      orgId: mockOrg.orgId,
      branchIds: [mockBranch.branchId],
      roleIds: ["role-admin"],
      email: data.email || "user@example.com",
      firstName: data.firstName || "User",
      lastName: data.lastName || "Name",
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setUser(mockUser);
    setOrg(mockOrg);
    setTenant(mockTenant);
    const extraBranches = (data.branches?.slice(1) || []).map((b, i) => ({
      branchId: `branch-${Date.now()}-${i}`,
      orgId: mockOrg.orgId,
      name: b.name,
      isHeadOffice: b.isHeadOffice,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setBranches([mockBranch, ...extraBranches]);
    setCurrentBranch(mockBranch);

    // Template is already saved via templateStore persist middleware

    reset();
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Account onNext={handleNext} />;
      case 2:
        return <Step2Industry onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <Step3OrgDetails onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <Step4Modules onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <Step5Branches onNext={handleNext} onBack={handleBack} />;
      case 6:
        return <Step6InviteTeam onNext={handleNext} onBack={handleBack} />;
      case 7:
        return <Step7Finish onFinish={handleFinish} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
                <Icons.Box className="h-5 w-5" />
              </div>
              <span className="font-semibold">ERP by OdaFlow</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              Exit setup
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep} of {TOTAL_STEPS}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

