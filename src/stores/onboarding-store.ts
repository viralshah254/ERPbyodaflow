import { create } from "zustand";
import type { OrgType } from "@/types/erp";
import type { TemplateOrgType } from "@/config/industryTemplates/index";

interface OnboardingData {
  // Step 1
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;

  // Step 2: OrgType + Template (template-driven)
  orgType?: TemplateOrgType;
  templateId?: string;

  // Step 3
  orgName?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  businessType?: string;
  plan?: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

  // Step 4
  moduleConfig?: Record<string, boolean>;

  // Step 5
  branches?: Array<{
    name: string;
    address?: string;
    isHeadOffice: boolean;
  }>;

  // Step 6
  invitedUsers?: Array<{
    email: string;
    role: string;
  }>;
}

interface OnboardingState {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  reset: () => void;
}

const initialState: OnboardingData = {};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  data: initialState,
  updateData: (newData) =>
    set((state) => ({
      data: { ...state.data, ...newData },
    })),
  reset: () => set({ data: initialState }),
}));

