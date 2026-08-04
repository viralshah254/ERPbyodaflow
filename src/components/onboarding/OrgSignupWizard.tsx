"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Step1Contact } from "@/components/onboarding/steps/step-1-contact";
import { Step2IndustryCategory } from "@/components/onboarding/steps/step-2-industry-category";
import { Step3OrgDetails } from "@/components/onboarding/steps/step-3-org-details";
import { OrgSignupApplicantPanel } from "@/components/onboarding/OrgSignupApplicantPanel";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { getTemplateById } from "@/config/industryTemplates/index";
import { industryCategoryLabel } from "@/config/industry";
import { submitOrgSignupApi } from "@/lib/api/org-signup";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

const STEPS = [
  { id: "contact", label: "Your details", short: "Contact" },
  { id: "industry", label: "Industry & template", short: "Industry" },
  { id: "organisation", label: "Company info", short: "Company" },
  { id: "submit", label: "Review & send", short: "Submit" },
] as const;

function SignupStepper({ step }: { step: number }) {
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Step {step + 1} of {STEPS.length}
        </span>
        <span className="text-muted-foreground">{STEPS[step].label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="hidden sm:flex items-center justify-between gap-1">
        {STEPS.map((s, index) => (
          <div
            key={s.id}
            className={cn(
              "flex-1 text-center text-xs py-1.5 rounded-md transition-colors",
              index === step && "bg-primary/10 text-primary font-medium",
              index < step && "text-muted-foreground",
              index > step && "text-muted-foreground/60"
            )}
          >
            {s.short}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrgSignupWizard() {
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const { data, reset } = useOnboardingStore();

  const template = data.templateId ? getTemplateById(data.templateId) : null;

  const handleSubmit = async () => {
    if (!data.industryCategory || !data.orgType || !data.templateId || !data.orgName || !data.email) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await submitOrgSignupApi({
        industryCategory: data.industryCategory,
        orgType: data.orgType,
        templateId: data.templateId,
        templateName: template?.name,
        orgName: data.orgName,
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        email: data.email,
        phone: data.phone,
        country: data.country ?? "Kenya",
        currency: data.currency ?? "KES",
        timeZone: data.timezone ?? "Africa/Nairobi",
        plan: data.plan ?? "PROFESSIONAL",
        message: data.businessType,
      });
      setSubmitted(true);
      reset();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-8 max-w-lg mx-auto text-center border-primary/20">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icons.Check className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Application sent</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          We received your request. OdaFlow will review it and email login credentials to the address you provided.
        </p>
        <div className="rounded-lg border bg-muted/30 p-4 text-left text-sm space-y-2 mb-6">
          <p className="font-medium">What to expect</p>
          <p className="text-muted-foreground">1. Review by the OdaFlow team (typically 1–2 business days)</p>
          <p className="text-muted-foreground">2. Approval email with your login details</p>
          <p className="text-muted-foreground">3. Sign in and complete your organisation setup</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] gap-8 lg:gap-10 items-start">
      <div className="space-y-6 min-w-0">
        <SignupStepper step={step} />

        <div className="lg:hidden">
          <OrgSignupApplicantPanel currentStep={step as 0 | 1 | 2 | 3} variant="compact" />
        </div>

        {step === 0 && <Step1Contact onNext={() => setStep(1)} />}
        {step === 1 && (
          <Step2IndustryCategory onBack={() => setStep(0)} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step3OrgDetails onBack={() => setStep(1)} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <Card className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Review your application</h2>
              <p className="text-sm text-muted-foreground">
                Confirm everything looks right, then send your request to OdaFlow.
              </p>
            </div>

            <dl className="space-y-3 mb-8">
              {[
                { label: "Company", value: data.orgName },
                {
                  label: "Primary contact",
                  value: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
                },
                { label: "Email", value: data.email },
                ...(data.phone ? [{ label: "Phone", value: data.phone }] : []),
                {
                  label: "Industry",
                  value: data.industryCategory
                    ? `${industryCategoryLabel(data.industryCategory)} · ${template?.name ?? data.templateId}`
                    : "—",
                },
                {
                  label: "Location",
                  value: [data.country, data.currency].filter(Boolean).join(" · ") || "—",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:justify-between gap-1 rounded-lg border px-4 py-3"
                >
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-medium text-right sm:max-w-[60%]">{row.value || "—"}</dd>
                </div>
              ))}
              {data.businessType ? (
                <div className="rounded-lg border px-4 py-3">
                  <dt className="text-sm text-muted-foreground mb-1">Note</dt>
                  <dd className="text-sm">{data.businessType}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Sending…" : "Submit application"}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="hidden lg:block">
        <OrgSignupApplicantPanel currentStep={step as 0 | 1 | 2 | 3} />
      </div>
    </div>
  );
}
