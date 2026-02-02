export type OrgType = "MANUFACTURER" | "DISTRIBUTOR" | "SHOP";

export type IndustryId =
  | "FMCG_MANUFACTURING"
  | "PHARMA_DISTRIBUTION"
  | "HARDWARE_MATERIALS"
  | "AGRI_INPUTS"
  | "HORECA_SUPPLY";

export type ModuleId =
  | "dashboard"
  | "orders"
  | "inventory"
  | "procurement"
  | "manufacturing"
  | "deliveries"
  | "finance"
  | "crm"
  | "reports"
  | "admin"
  | "customizer";

export type Terminology = {
  inventoryPrimary: string;
  rawMaterials?: string;
  finishedGoods?: string;
  stockIn?: string;
  batches?: string;
  expiry?: string;
  deliveries?: string;
  [key: string]: string | undefined;
};

export type IndustryTemplate = {
  id: string;
  industryId: IndustryId;
  orgType: OrgType;
  name: string;
  tagline: string;
  enabledModules: ModuleId[];
  navOverrides?: Partial<Record<ModuleId, string>>;
  terminology: Terminology;
  defaultKPIs: string[];
};





