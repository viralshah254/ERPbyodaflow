import { create } from "zustand";
import type { IndustryTemplate, IndustryId } from "@/types/templates";

interface TemplateState {
  selectedIndustry: IndustryId | null;
  selectedTemplate: IndustryTemplate | null;
  enabledModules: string[];
  terminology: Record<string, string>;
  
  setIndustry: (industryId: IndustryId, template: IndustryTemplate) => void;
  reset: () => void;
}

const initialState = {
  selectedIndustry: null,
  selectedTemplate: null,
  enabledModules: [],
  terminology: {},
};

export const useTemplateStore = create<TemplateState>((set) => ({
  ...initialState,
  setIndustry: (industryId, template) => {
    set({
      selectedIndustry: industryId,
      selectedTemplate: template,
      enabledModules: template.enabledModules,
      terminology: template.terminology as Record<string, string>,
    });
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "odaflow_erp_template",
        JSON.stringify({
          selectedIndustry: industryId,
          selectedTemplate: template,
          enabledModules: template.enabledModules,
          terminology: template.terminology,
        })
      );
    }
  },
  reset: () => {
    set(initialState);
    if (typeof window !== "undefined") {
      localStorage.removeItem("odaflow_erp_template");
    }
  },
}));


