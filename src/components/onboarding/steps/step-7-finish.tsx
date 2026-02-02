"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { getTemplateById } from "@/config/industryTemplates/index";
import * as Icons from "lucide-react";

interface Step7FinishProps {
  onFinish: () => void;
  onBack: () => void;
}

export function Step7Finish({ onFinish, onBack }: Step7FinishProps) {
  const { data } = useOnboardingStore();
  const template = data.templateId ? getTemplateById(data.templateId) : null;
  const templateName = template?.name ?? (data.orgType ?? "Manufacturer");

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icons.Check className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
        <p className="text-muted-foreground">
          Review your setup and launch your ERP.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Organization
            </span>
            <span className="text-sm font-semibold">{data.orgName}</span>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Industry
            </span>
            <span className="text-sm font-semibold">{templateName}</span>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Plan</span>
            <span className="text-sm font-semibold">{data.plan}</span>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Branches
            </span>
            <span className="text-sm font-semibold">
              {data.branches?.length || 1}
            </span>
          </div>
        </div>

        {data.invitedUsers && data.invitedUsers.length > 0 && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Team members invited
              </span>
              <span className="text-sm font-semibold">
                {data.invitedUsers.length}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onFinish} size="lg">
          Launch ERP
        </Button>
      </div>
    </Card>
  );
}





