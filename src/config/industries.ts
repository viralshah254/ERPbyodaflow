import type { IndustryTemplate, IndustryId, OrgType } from "@/types/templates";

export const INDUSTRIES: Record<IndustryId, IndustryTemplate> = {
  FMCG_MANUFACTURING: {
    id: "fmcg-manufacturing",
    industryId: "FMCG_MANUFACTURING",
    orgType: "MANUFACTURER",
    name: "FMCG Manufacturing",
    tagline: "Raw materials → Production → Finished goods",
    enabledModules: [
      "dashboard",
      "inventory",
      "procurement",
      "manufacturing",
      "finance",
      "reports",
      "crm",
    ],
    terminology: {
      inventoryPrimary: "Inventory",
      rawMaterials: "Raw Materials",
      finishedGoods: "Finished Goods",
    },
    defaultKPIs: ["Production Output", "Yield %", "Stockouts", "Stock Value"],
  },
  PHARMA_DISTRIBUTION: {
    id: "pharma-distribution",
    industryId: "PHARMA_DISTRIBUTION",
    orgType: "DISTRIBUTOR",
    name: "Pharmaceutical Distribution",
    tagline: "Batch & expiry tracking, GRN, POD, collections",
    enabledModules: [
      "dashboard",
      "orders",
      "inventory",
      "procurement",
      "deliveries",
      "finance",
      "reports",
      "crm",
    ],
    terminology: {
      inventoryPrimary: "Stock In",
      stockIn: "Stock In",
      batches: "Batches",
      expiry: "Expiry",
      deliveries: "Deliveries",
    },
    defaultKPIs: ["OTIF", "Near Expiry", "Collections"],
  },
  HARDWARE_MATERIALS: {
    id: "hardware-materials",
    industryId: "HARDWARE_MATERIALS",
    orgType: "DISTRIBUTOR",
    name: "Hardware & Building Materials",
    tagline: "Bulky goods, deliveries, credit terms",
    enabledModules: [
      "dashboard",
      "orders",
      "inventory",
      "procurement",
      "deliveries",
      "finance",
      "reports",
      "crm",
    ],
    terminology: {
      inventoryPrimary: "Stock",
      stockIn: "Stock In",
      deliveries: "Deliveries",
    },
    defaultKPIs: ["Delivery SLA", "Debtors", "Gross Margin"],
  },
  AGRI_INPUTS: {
    id: "agri-inputs",
    industryId: "AGRI_INPUTS",
    orgType: "DISTRIBUTOR",
    name: "Agriculture Inputs Distribution",
    tagline: "Routes, retailers, seasonal demand",
    enabledModules: [
      "dashboard",
      "orders",
      "inventory",
      "procurement",
      "deliveries",
      "finance",
      "reports",
      "crm",
    ],
    navOverrides: {
      crm: "Retailers & Visits",
    },
    terminology: {
      inventoryPrimary: "Stock",
      stockIn: "Stock In",
      deliveries: "Deliveries",
    },
    defaultKPIs: ["Active Retailers", "Route Coverage"],
  },
  HORECA_SUPPLY: {
    id: "horeca-supply",
    industryId: "HORECA_SUPPLY",
    orgType: "DISTRIBUTOR",
    name: "HoReCa / Foodservice Supply",
    tagline: "Frequent reorders, delivery windows",
    enabledModules: [
      "dashboard",
      "orders",
      "inventory",
      "procurement",
      "deliveries",
      "finance",
      "reports",
      "crm",
    ],
    terminology: {
      inventoryPrimary: "Stock",
      stockIn: "Stock In",
      deliveries: "Deliveries",
    },
    defaultKPIs: ["OTIF", "Substitution Rate", "Order Frequency"],
  },
};

export function getIndustryById(id: IndustryId): IndustryTemplate {
  return INDUSTRIES[id];
}

export function getIndustriesByOrgType(orgType: OrgType): IndustryTemplate[] {
  return Object.values(INDUSTRIES).filter(
    (industry) => industry.orgType === orgType
  );
}

export function getAllIndustries(): IndustryTemplate[] {
  return Object.values(INDUSTRIES);
}





