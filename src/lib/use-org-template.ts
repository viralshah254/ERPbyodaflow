"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  getTemplateForOrgType,
  getTerminologyForOrgType,
  type IndustryTemplate,
  type Terminology,
} from "@/config/industryTemplates";

export function useOrgTemplate() {
  const { org } = useAuthStore();

  const template: IndustryTemplate | null = useMemo(() => {
    if (!org?.orgType) return null;
    return getTemplateForOrgType(org.orgType);
  }, [org?.orgType]);

  const terminology: Terminology | null = useMemo(() => {
    if (!org?.orgType) return null;
    return getTerminologyForOrgType(org.orgType);
  }, [org?.orgType]);

  const getLabel = (key: string, defaultLabel: string): string => {
    if (!terminology) return defaultLabel;
    
    // Check inventory labels
    const inventoryLabel = terminology.inventoryLabels[key as keyof typeof terminology.inventoryLabels];
    if (inventoryLabel) return inventoryLabel;

    // Check key terms
    const keyTerm = terminology.keyTerms[key];
    if (keyTerm) return keyTerm;

    // Check document names
    const docName = terminology.documentNames[key];
    if (docName) return docName;

    return defaultLabel;
  };

  return {
    template,
    terminology,
    getLabel,
    orgType: org?.orgType || null,
  };
}





