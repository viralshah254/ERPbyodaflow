import type { OrgType } from "@/types/erp";
import type { Module } from "@/lib/modules";

export interface InventoryLabel {
  rawMaterials?: string;
  workInProgress?: string;
  finishedGoods?: string;
  stockIn?: string;
  stockAvailable?: string;
  allocated?: string;
  inTransit?: string;
  storeStock?: string;
  reorder?: string;
  stocktake?: string;
}

export interface Terminology {
  inventoryLabels: InventoryLabel;
  keyTerms: Record<string, string>;
  documentNames: Record<string, string>;
}

export interface IndustryTemplate {
  orgType: OrgType;
  name: string;
  description: string;
  icon: string;
  terminology: Terminology;
  enabledModuleIds: string[];
  defaultDashboardWidgets: string[];
}

export const INDUSTRY_TEMPLATES: Record<OrgType, IndustryTemplate> = {
  MANUFACTURER: {
    orgType: "MANUFACTURER",
    name: "Manufacturer",
    description: "Raw materials → production → finished goods",
    icon: "Factory",
    terminology: {
      inventoryLabels: {
        rawMaterials: "Raw Materials",
        workInProgress: "Work In Progress (WIP)",
        finishedGoods: "Finished Goods",
      },
      keyTerms: {
        productionRun: "Production Run",
        yield: "Yield",
        qcCheck: "QC Check",
        bom: "Bill of Materials",
        workOrder: "Work Order",
      },
      documentNames: {
        grn: "Goods Received Note (GRN)",
        workOrder: "Work Order",
        productionRun: "Production Run",
      },
    },
    enabledModuleIds: [
      "dashboard",
      "inventory",
      "inventory-products",
      "inventory-stock",
      "inventory-transfers",
      "inventory-stocktake",
      "purchasing",
      "purchasing-orders",
      "purchasing-suppliers",
      "purchasing-grn",
      "manufacturing",
      "manufacturing-bom",
      "manufacturing-work-orders",
      "manufacturing-production",
      "sales",
      "sales-orders",
      "sales-customers",
      "sales-invoices",
      "sales-deliveries",
      "finance",
      "finance-ledger",
      "finance-payments",
      "finance-reports",
      "settings",
    ],
    defaultDashboardWidgets: [
      "production-overview",
      "inventory-levels",
      "pending-work-orders",
      "recent-grn",
    ],
  },
  DISTRIBUTOR: {
    orgType: "DISTRIBUTOR",
    name: "Distributor",
    description: "Stock in → allocation → deliveries → collections",
    icon: "Truck",
    terminology: {
      inventoryLabels: {
        stockIn: "Stock In",
        stockAvailable: "Stock Available",
        allocated: "Allocated",
        inTransit: "In Transit",
      },
      keyTerms: {
        pickPack: "Pick & Pack",
        route: "Route",
        pod: "Proof of Delivery (POD)",
        dispatch: "Dispatch",
        allocation: "Allocation",
      },
      documentNames: {
        grn: "Goods Received Note (GRN)",
        delivery: "Delivery Note",
        dispatch: "Dispatch Note",
      },
    },
    enabledModuleIds: [
      "dashboard",
      "inventory",
      "inventory-products",
      "inventory-stock",
      "inventory-transfers",
      "inventory-stocktake",
      "purchasing",
      "purchasing-orders",
      "purchasing-suppliers",
      "purchasing-grn",
      "sales",
      "sales-orders",
      "sales-customers",
      "sales-invoices",
      "sales-deliveries",
      "finance",
      "finance-ledger",
      "finance-payments",
      "finance-reports",
      "settings",
    ],
    defaultDashboardWidgets: [
      "stock-levels",
      "pending-deliveries",
      "collections-overview",
      "recent-orders",
    ],
  },
  SHOP: {
    orgType: "SHOP",
    name: "Shop",
    description: "Purchase → inventory → reorder → payments",
    icon: "Store",
    terminology: {
      inventoryLabels: {
        storeStock: "Store Stock",
        reorder: "Reorder",
        stocktake: "Stocktake",
      },
      keyTerms: {
        supplierInvoice: "Supplier Invoice",
        purchaseOrder: "Purchase Order",
        reorderSuggestion: "Reorder Suggestions",
        stocktake: "Stocktake",
      },
      documentNames: {
        grn: "Goods Received Note (GRN)",
        purchaseOrder: "Purchase Order",
        supplierInvoice: "Supplier Invoice",
      },
    },
    enabledModuleIds: [
      "dashboard",
      "inventory",
      "inventory-products",
      "inventory-stock",
      "inventory-stocktake",
      "purchasing",
      "purchasing-orders",
      "purchasing-suppliers",
      "purchasing-grn",
      "finance",
      "finance-ledger",
      "finance-payments",
      "finance-reports",
      "settings",
    ],
    defaultDashboardWidgets: [
      "stock-levels",
      "reorder-suggestions",
      "recent-purchases",
      "payment-overview",
    ],
  },
};

export function getTemplateForOrgType(orgType: OrgType): IndustryTemplate {
  return INDUSTRY_TEMPLATES[orgType];
}

export function getTerminologyForOrgType(orgType: OrgType): Terminology {
  return INDUSTRY_TEMPLATES[orgType].terminology;
}

export function getInventoryLabel(
  orgType: OrgType,
  labelKey: keyof InventoryLabel
): string | undefined {
  return INDUSTRY_TEMPLATES[orgType].terminology.inventoryLabels[labelKey];
}





