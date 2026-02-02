"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { getTemplateById, MODULE_LABELS } from "@/config/industryTemplates/index";
import * as Icons from "lucide-react";

const MODULE_ICONS: Record<string, string> = {
  dashboard: "LayoutDashboard",
  inventory: "Package",
  sales: "ShoppingCart",
  purchasing: "ShoppingBag",
  finance: "DollarSign",
  manufacturing: "Factory",
  distribution: "Truck",
  retail: "Store",
  crm: "Users",
  reports: "FileText",
  automation: "Zap",
  settings: "Settings",
  docs: "FileText",
};

interface Step4ModulesProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step4Modules({ onNext, onBack }: Step4ModulesProps) {
  const { data, updateData } = useOnboardingStore();
  const template = data.templateId ? getTemplateById(data.templateId) : null;
  const isEnterprise = data.plan === "ENTERPRISE";

  const enabledModuleIds = React.useMemo(
    () => template?.enabledModules ?? [],
    [template]
  );

  const [moduleConfig, setModuleConfig] = React.useState<Record<string, boolean>>(
    () => {
      const config: Record<string, boolean> = {};
      enabledModuleIds.forEach((id) => {
        config[id] = true;
      });
      return config;
    }
  );

  React.useEffect(() => {
    const config: Record<string, boolean> = {};
    enabledModuleIds.forEach((id) => {
      config[id] = true;
    });
    setModuleConfig((prev) => ({ ...config, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when template changes
  }, [data.templateId]);

  const handleNext = () => {
    updateData({ moduleConfig });
    onNext();
  };

  return (
    <Card className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Modules</h2>
        <p className="text-muted-foreground">
          {template
            ? `Your template "${template.name}" includes these modules.${isEnterprise ? " You can change this later in settings." : ""}`
            : "Select modules to enable."}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {enabledModuleIds.map((moduleId) => {
          const iconKey = MODULE_ICONS[moduleId] ?? "Box";
          const IconC = (Icons[iconKey as keyof typeof Icons] || Icons.Box) as React.ComponentType<{ className?: string }>;
          const label = MODULE_LABELS[moduleId] ?? moduleId;
          const isEnabled = moduleConfig[moduleId] ?? true;

          return (
            <div key={moduleId} className="border rounded-lg p-4 flex items-center gap-4">
              {isEnterprise ? (
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() =>
                    setModuleConfig((prev) => ({
                      ...prev,
                      [moduleId]: !prev[moduleId],
                    }))
                  }
                  className="h-4 w-4"
                />
              ) : (
                <div className="h-4 w-4 rounded border-2 border-primary bg-primary" />
              )}
              <IconC className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{label}</span>
            </div>
          );
        })}
        {enabledModuleIds.length === 0 && (
          <p className="text-muted-foreground text-sm">Select a template in step 2 to see modules.</p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Continue</Button>
      </div>
    </Card>
  );
}
