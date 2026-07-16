"use client";

import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type ApplicantStep = 0 | 1 | 2 | 3;

const STEP_GUIDANCE: Record<
  ApplicantStep,
  { title: string; items: Array<{ icon: keyof typeof Icons; text: string }> }
> = {
  0: {
    title: "Who should apply?",
    items: [
      { icon: "UserCircle", text: "The person who will be the first administrator for your company." },
      { icon: "Mail", text: "Use a work email you check daily — we send login details there after approval." },
      { icon: "Clock", text: "Applications are reviewed before your organisation is provisioned." },
    ],
  },
  1: {
    title: "Pick your industry",
    items: [
      { icon: "Package", text: "FMCG — packaged goods, manufacturing, wholesale, or multi-store retail." },
      { icon: "Fish", text: "Seafood — fresh fish, scale sales, cold chain, or franchise outlets." },
      { icon: "Layers", text: "Other — agro-logistics and specialised distribution verticals." },
    ],
  },
  2: {
    title: "About your company",
    items: [
      { icon: "Building2", text: "Use your legal or trading name as it should appear in the ERP." },
      { icon: "Globe", text: "Country and currency set your tax, pricing, and reporting defaults." },
      { icon: "MessageSquare", text: "Optional note — tell us anything helpful for provisioning (e.g. number of branches)." },
    ],
  },
  3: {
    title: "Before you submit",
    items: [
      { icon: "ClipboardCheck", text: "Check names, email, and industry — we provision exactly what you select." },
      { icon: "Clock", text: "Review usually takes 1–2 business days." },
      { icon: "Mail", text: "We'll email you at the address you provided once your application is approved." },
    ],
  },
};

const TIMELINE = [
  { step: "1", label: "Submit application", activeFrom: 0 },
  { step: "2", label: "OdaFlow reviews", activeFrom: 1 },
  { step: "3", label: "Email with login", activeFrom: 3 },
  { step: "4", label: "Start using ERP", activeFrom: 3 },
] as const;

type OrgSignupApplicantPanelProps = {
  currentStep: ApplicantStep;
  variant?: "full" | "compact";
};

export function OrgSignupApplicantPanel({ currentStep, variant = "full" }: OrgSignupApplicantPanelProps) {
  const guidance = STEP_GUIDANCE[currentStep];
  const isCompact = variant === "compact";

  return (
    <div className={cn("space-y-6", !isCompact && "lg:sticky lg:top-8")}>
      {!isCompact && (
        <div
          className="rounded-2xl p-6 text-white"
          style={{ background: "linear-gradient(160deg, #001a3d 0%, #0a3d6e 100%)" }}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-white/60 mb-2">Application</p>
          <h2 className="text-lg font-semibold leading-snug mb-1">Request access to OdaFlow ERP</h2>
          <p className="text-sm text-white/75">
            Free to apply. Your organisation is provisioned after OdaFlow approves the request.
          </p>
        </div>
      )}

      <div className={cn("rounded-xl border bg-card space-y-4", isCompact ? "p-4" : "p-5")}>
        <h3 className="text-sm font-semibold">{guidance.title}</h3>
        <ul className="space-y-3">
          {guidance.items.map((item) => {
            const Icon = (Icons[item.icon] ?? Icons.Circle) as React.ComponentType<{ className?: string }>;
            return (
              <li key={item.text} className="flex gap-3 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span>{item.text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {!isCompact && (
        <div className="rounded-xl border bg-muted/40 p-5">
          <h3 className="text-sm font-semibold mb-4">What happens next</h3>
          <ol className="space-y-0">
            {TIMELINE.map((item, index) => {
              const isDone = currentStep > item.activeFrom;
              const isCurrent =
                currentStep === item.activeFrom ||
                (currentStep === 3 && item.activeFrom === 3);
              return (
                <li key={item.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold border-2",
                        isDone && "border-primary bg-primary text-primary-foreground",
                        isCurrent && !isDone && "border-primary text-primary bg-primary/10",
                        !isDone && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {isDone ? <Icons.Check className="h-3.5 w-3.5" /> : item.step}
                    </div>
                    {index < TIMELINE.length - 1 && (
                      <div className={cn("w-px flex-1 min-h-[20px] my-1", isDone ? "bg-primary" : "bg-border")} />
                    )}
                  </div>
                  <div className={cn("pb-4", index === TIMELINE.length - 1 && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isCurrent && "text-foreground",
                        !isCurrent && "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
