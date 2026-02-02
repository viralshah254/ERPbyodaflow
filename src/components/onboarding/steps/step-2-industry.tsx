"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getTemplatesByOrgType,
  type IndustryTemplateDefinition,
  type TemplateOrgType,
} from "@/config/industryTemplates/index";
import { useOnboardingStore } from "@/stores/onboarding-store";
import * as Icons from "lucide-react";

interface Step2IndustryProps {
  onNext: () => void;
  onBack: () => void;
}

const ORG_TYPES: { value: TemplateOrgType; label: string; icon: string }[] = [
  { value: "MANUFACTURER", label: "Manufacturer", icon: "Factory" },
  { value: "DISTRIBUTOR", label: "Distributor", icon: "Truck" },
  { value: "RETAIL", label: "Retail", icon: "Store" },
];

export function Step2Industry({ onNext, onBack }: Step2IndustryProps) {
  const { data, updateData } = useOnboardingStore();
  const [selectedOrgType, setSelectedOrgType] = React.useState<TemplateOrgType | null>(
    (data.orgType as TemplateOrgType) || null
  );
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(
    data.templateId || null
  );

  const templates = React.useMemo(
    () => (selectedOrgType ? getTemplatesByOrgType(selectedOrgType) : []),
    [selectedOrgType]
  );

  React.useEffect(() => {
    if (selectedOrgType && !templates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? null);
    }
  }, [selectedOrgType, templates, selectedTemplateId]);

  const handleSelectOrgType = (orgType: TemplateOrgType) => {
    setSelectedOrgType(orgType);
    const list = getTemplatesByOrgType(orgType);
    setSelectedTemplateId(list[0]?.id ?? null);
    updateData({ orgType, templateId: list[0]?.id });
  };

  const handleSelectTemplate = (t: IndustryTemplateDefinition) => {
    setSelectedTemplateId(t.id);
    updateData({ templateId: t.id });
  };

  const handleNext = () => {
    if (selectedOrgType && selectedTemplateId) {
      updateData({ orgType: selectedOrgType, templateId: selectedTemplateId });
      onNext();
    }
  };

  return (
    <Card className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Choose your business type</h2>
        <p className="text-muted-foreground">
          First select your organization type, then pick a template. This drives modules, terminology, and dashboards.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold mb-3">1. Organization type</h3>
        <div className="grid grid-cols-3 gap-4">
          {ORG_TYPES.map(({ value, label, icon }) => {
            const IconC = (Icons[icon as keyof typeof Icons] || Icons.Box) as React.ComponentType<{ className?: string }>;
            const isSelected = selectedOrgType === value;
            return (
              <Card
                key={value}
                className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-primary border-primary" : ""
                }`}
                onClick={() => handleSelectOrgType(value)}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <IconC className="h-6 w-6" />
                  </div>
                  <span className="font-medium">{label}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedOrgType && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">2. Template</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => {
              const IconC = (Icons[t.icon as keyof typeof Icons] || Icons.Box) as React.ComponentType<{ className?: string }>;
              const isSelected = selectedTemplateId === t.id;
              return (
                <Card
                  key={t.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  onClick={() => handleSelectTemplate(t)}
                >
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-3 ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <IconC className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  {isSelected && (
                    <div className="flex items-center gap-2 text-primary text-sm font-medium mt-2">
                      <Icons.Check className="h-4 w-4" />
                      Selected
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!selectedOrgType || !selectedTemplateId}>
          Continue
        </Button>
      </div>
    </Card>
  );
}
