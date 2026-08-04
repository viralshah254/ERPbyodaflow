"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getTemplatesByOrgType,
  type IndustryTemplateDefinition,
  type TemplateOrgType,
} from "@/config/industryTemplates/index";
import {
  INDUSTRY_CATEGORIES,
  filterTemplatesByIndustry,
  type IndustryCategory,
} from "@/config/industry";
import { useOnboardingStore } from "@/stores/onboarding-store";
import * as Icons from "lucide-react";

interface Step2IndustryCategoryProps {
  onNext: () => void;
  onBack: () => void;
}

const ORG_TYPES: { value: TemplateOrgType; label: string; icon: string }[] = [
  { value: "MANUFACTURER", label: "Manufacturer", icon: "Factory" },
  { value: "DISTRIBUTOR", label: "Distributor", icon: "Truck" },
  { value: "RETAIL", label: "Retail", icon: "Store" },
];

export function Step2IndustryCategory({ onNext, onBack }: Step2IndustryCategoryProps) {
  const { data, updateData } = useOnboardingStore();
  const [industryCategory, setIndustryCategory] = React.useState<IndustryCategory | null>(
    data.industryCategory ?? null
  );
  const [selectedOrgType, setSelectedOrgType] = React.useState<TemplateOrgType | null>(
    (data.orgType as TemplateOrgType) || null
  );
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(
    data.templateId || null
  );

  const templates = React.useMemo(() => {
    if (!selectedOrgType) return [];
    return filterTemplatesByIndustry(getTemplatesByOrgType(selectedOrgType), industryCategory);
  }, [selectedOrgType, industryCategory]);

  React.useEffect(() => {
    if (selectedOrgType && !templates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? null);
    }
  }, [selectedOrgType, templates, selectedTemplateId]);

  const handleSelectCategory = (category: IndustryCategory) => {
    setIndustryCategory(category);
    updateData({ industryCategory: category });
    if (selectedOrgType) {
      const list = filterTemplatesByIndustry(getTemplatesByOrgType(selectedOrgType), category);
      setSelectedTemplateId(list[0]?.id ?? null);
      updateData({ templateId: list[0]?.id });
    }
  };

  const handleSelectOrgType = (orgType: TemplateOrgType) => {
    setSelectedOrgType(orgType);
    const list = filterTemplatesByIndustry(getTemplatesByOrgType(orgType), industryCategory);
    setSelectedTemplateId(list[0]?.id ?? null);
    updateData({ orgType, templateId: list[0]?.id });
  };

  const handleSelectTemplate = (t: IndustryTemplateDefinition) => {
    setSelectedTemplateId(t.id);
    updateData({ templateId: t.id });
  };

  const handleNext = () => {
    if (industryCategory && selectedOrgType && selectedTemplateId) {
      updateData({ industryCategory, orgType: selectedOrgType, templateId: selectedTemplateId });
      onNext();
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Industry & business type</h2>
        <p className="text-sm text-muted-foreground">
          This sets up the right modules, screens, and terminology for your company.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Industry</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {INDUSTRY_CATEGORIES.map(({ value, label, description, icon }) => {
            const isSelected = industryCategory === value;
            const IconC = (Icons[icon as keyof typeof Icons] || Icons.Box) as React.ComponentType<{
              className?: string;
            }>;
            return (
              <Card
                key={value}
                className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-primary border-primary" : ""
                }`}
                onClick={() => handleSelectCategory(value)}
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
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {industryCategory && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">How you operate</h3>
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
      )}

      {selectedOrgType && templates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">ERP template</h3>
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
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <IconC className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {selectedOrgType && templates.length === 0 && (
        <p className="text-sm text-muted-foreground mb-6">
          No templates available for this combination. Try a different organisation type or industry category.
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!industryCategory || !selectedOrgType || !selectedTemplateId}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}
