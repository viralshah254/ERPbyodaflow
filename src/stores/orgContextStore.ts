"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getTemplateById,
  type TemplateOrgType,
  type ModuleKey,
  type FeatureFlagKey,
  type TerminologyOverrides,
  type DefaultKpiConfig,
  type DefaultRoleDashboardConfig,
  type IndustryTemplateDefinition,
} from "@/config/industryTemplates/index";

const STORAGE_KEY = "odaflow_erp_org_context";

export type OrgContextState = {
  orgType: TemplateOrgType | null;
  templateId: string | null;
  /** Resolved from template; can be overridden post-onboarding */
  enabledModules: ModuleKey[];
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>;
  terminology: TerminologyOverrides;
  defaultKPIs: DefaultKpiConfig[];
  defaultRoleDashboards: DefaultRoleDashboardConfig[];
  /** Resolved template def for convenience */
  template: IndustryTemplateDefinition | null;
  orgRole: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
  parentOrgId?: string;
  franchiseNetworkId?: string;
  franchiseCode?: string;
  franchiseTerritory?: string;
  franchiseStoreFormat?: string;
  franchiseManagerName?: string;
  franchisePersona: "STANDARD" | "LIGHT_ERP";
};

export type OrgContextActions = {
  /** Apply a template (on onboarding complete or org switch) */
  applyTemplate: (templateId: string) => void;
  /** Set org type + template id and hydrate from template */
  setFromOnboarding: (orgType: TemplateOrgType, templateId: string) => void;
  /** Override enabled modules (e.g. from settings) */
  setEnabledModules: (modules: ModuleKey[]) => void;
  hydrateFromBackend: (payload: {
    orgType?: string | null;
    templateId?: string | null;
    enabledModules?: string[];
    featureFlags?: Record<string, boolean>;
    terminology?: Record<string, string>;
    defaultNav?: string[];
    orgRole?: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
    parentOrgId?: string;
    franchiseNetworkId?: string;
    franchiseCode?: string;
    franchiseTerritory?: string;
    franchiseStoreFormat?: string;
    franchiseManagerName?: string;
    franchisePersona?: "STANDARD" | "LIGHT_ERP";
  }) => void;
  /** Dev: clear and optionally set defaults */
  reset: () => void;
  /** Check if a feature flag is on */
  hasFlag: (key: FeatureFlagKey) => boolean;
  /** Check if a module is enabled */
  hasModule: (key: ModuleKey) => boolean;
};

const emptyState: OrgContextState = {
  orgType: null,
  templateId: null,
  enabledModules: [],
  featureFlags: {},
  terminology: {},
  defaultKPIs: [],
  defaultRoleDashboards: [],
  template: null,
  orgRole: "STANDARD",
  franchisePersona: "STANDARD",
};

function hydrateFromTemplate(template: IndustryTemplateDefinition): OrgContextState {
  return {
    orgType: template.orgType,
    templateId: template.id,
    enabledModules: template.enabledModules,
    featureFlags: template.featureFlags,
    terminology: template.terminology,
    defaultKPIs: template.defaultKPIs,
    defaultRoleDashboards: template.defaultRoleDashboards,
    template,
    orgRole: "STANDARD",
    parentOrgId: undefined,
    franchiseNetworkId: undefined,
    franchiseCode: undefined,
    franchiseTerritory: undefined,
    franchiseStoreFormat: undefined,
    franchiseManagerName: undefined,
    franchisePersona: "STANDARD",
  };
}

function normalizeOrgType(orgType?: string | null): TemplateOrgType | null {
  if (!orgType) return null;
  if (orgType === "SHOP") return "RETAIL";
  return orgType as TemplateOrgType;
}

export const useOrgContextStore = create<OrgContextState & OrgContextActions>()(
  persist(
    (set, get) => ({
      ...emptyState,

      applyTemplate(templateId: string) {
        const t = getTemplateById(templateId);
        if (t) set(hydrateFromTemplate(t));
      },

      setFromOnboarding(orgType: TemplateOrgType, templateId: string) {
        const t = getTemplateById(templateId);
        if (t && t.orgType === orgType) {
          set(hydrateFromTemplate(t));
        }
      },

      setEnabledModules(modules: ModuleKey[]) {
        set({ enabledModules: modules });
      },

      hydrateFromBackend(payload) {
        const normalizedOrgType = normalizeOrgType(payload.orgType);
        const template =
          (payload.templateId ? getTemplateById(payload.templateId) : null) ??
          (normalizedOrgType
            ? getTemplateById(
                normalizedOrgType === "MANUFACTURER"
                  ? "fmcg-manufacturer"
                  : normalizedOrgType === "DISTRIBUTOR"
                    ? "fmcg-distributor"
                    : "retail-multi-store"
              )
            : null);
        if (!template) {
          set({
            orgType: normalizedOrgType,
            templateId: payload.templateId ?? null,
            enabledModules: (payload.enabledModules ?? []) as ModuleKey[],
            featureFlags: (payload.featureFlags ?? {}) as Partial<Record<FeatureFlagKey, boolean>>,
            terminology: (payload.terminology ?? {}) as TerminologyOverrides,
            template: null,
            orgRole: payload.orgRole ?? "STANDARD",
            parentOrgId: payload.parentOrgId,
            franchiseNetworkId: payload.franchiseNetworkId,
            franchiseCode: payload.franchiseCode,
            franchiseTerritory: payload.franchiseTerritory,
            franchiseStoreFormat: payload.franchiseStoreFormat,
            franchiseManagerName: payload.franchiseManagerName,
            franchisePersona: payload.franchisePersona ?? "STANDARD",
          });
          return;
        }
        set({
          ...hydrateFromTemplate(template),
          orgType: normalizedOrgType ?? template.orgType,
          templateId: payload.templateId ?? template.id,
          enabledModules: (payload.enabledModules?.length
            ? payload.enabledModules
            : template.enabledModules) as ModuleKey[],
          featureFlags: {
            ...template.featureFlags,
            ...(payload.featureFlags ?? {}),
          } as Partial<Record<FeatureFlagKey, boolean>>,
          terminology: {
            ...template.terminology,
            ...(payload.terminology ?? {}),
          } as TerminologyOverrides,
          orgRole: payload.orgRole ?? "STANDARD",
          parentOrgId: payload.parentOrgId,
          franchiseNetworkId: payload.franchiseNetworkId,
          franchiseCode: payload.franchiseCode,
          franchiseTerritory: payload.franchiseTerritory,
          franchiseStoreFormat: payload.franchiseStoreFormat,
          franchiseManagerName: payload.franchiseManagerName,
          franchisePersona: payload.franchisePersona ?? "STANDARD",
          template: payload.defaultNav?.length
            ? { ...template, defaultNav: payload.defaultNav as typeof template.defaultNav }
            : template,
        });
      },

      reset() {
        set(emptyState);
      },

      hasFlag(key: FeatureFlagKey) {
        const f = get().featureFlags[key];
        return f === true;
      },

      hasModule(key: ModuleKey) {
        return get().enabledModules.includes(key);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        orgType: s.orgType,
        templateId: s.templateId,
        enabledModules: s.enabledModules,
        featureFlags: s.featureFlags,
        terminology: s.terminology,
        defaultKPIs: s.defaultKPIs,
        defaultRoleDashboards: s.defaultRoleDashboards,
        orgRole: s.orgRole,
        parentOrgId: s.parentOrgId,
        franchiseNetworkId: s.franchiseNetworkId,
        franchiseCode: s.franchiseCode,
        franchiseTerritory: s.franchiseTerritory,
        franchiseStoreFormat: s.franchiseStoreFormat,
        franchiseManagerName: s.franchiseManagerName,
        franchisePersona: s.franchisePersona,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.templateId && !state.template) {
          const t = getTemplateById(state.templateId!);
          if (t) useOrgContextStore.setState({ template: t });
        }
      },
    }
  )
);

/** Hook: current org context (for nav, labels, etc.) */
export function useOrgContext() {
  return useOrgContextStore();
}

/** Hook: terminology only, for t(key) usage */
export function useTerminology() {
  return useOrgContextStore((s) => s.terminology);
}

/** Hook: default nav section order for current template */
export function useDefaultNavOrder(): string[] {
  return useOrgContextStore((s) => s.template?.defaultNav ?? []);
}
