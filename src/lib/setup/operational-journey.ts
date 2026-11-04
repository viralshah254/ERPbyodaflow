export const SETUP_STAGES = [
  { id: "foundation", title: "Set the foundations", description: "Opening date, account roles and the people responsible.", icon: "Landmark" },
  { id: "operations", title: "Prepare the operation", description: "Stores, recipes, stock controls and replenishment.", icon: "Factory" },
  { id: "finance", title: "Reconcile the opening", description: "Reviewed costs and source balances that agree with the ledger.", icon: "Scale" },
  { id: "tax", title: "Connect fiscal services", description: "Confirmed tax treatment, real signing and recovery controls.", icon: "ShieldCheck" },
  { id: "connected", title: "Verify connected flows", description: "Orders, catalog synchronization and final operator acceptance.", icon: "Workflow" },
] as const;
export type SetupStage = typeof SETUP_STAGES[number]["id"];
const META: Record<string, { stage: SetupStage; owner: string; action: string; dependsOn?: string[] }> = {
  cutover: { stage: "foundation", owner: "Finance", action: "Review fiscal calendar" },
  mapping: { stage: "foundation", owner: "Finance", action: "Map posting accounts" },
  production_supervisors: { stage: "foundation", owner: "Administrator", action: "Review roles" },
  bank_team: { stage: "foundation", owner: "Finance administrator", action: "Review team access" },
  approval_policy: { stage: "foundation", owner: "Finance administrator", action: "Configure approvals" },
  warehouses: { stage: "operations", owner: "Warehouse manager", action: "Classify stores" },
  recipes: { stage: "operations", owner: "Production supervisor", action: "Review recipes" },
  return_controls: { stage: "operations", owner: "Warehouse & finance", action: "Review return workflow" },
  count_controls: { stage: "operations", owner: "Warehouse & finance", action: "Review stock counts" },
  reorder_policy: { stage: "operations", owner: "Procurement", action: "Review replenishment" },
  company_cost: { stage: "finance", owner: "Finance", action: "Review SKU valuation" },
  wip: { stage: "finance", owner: "Production & finance", action: "Classify legacy production" },
  stock_gl: { stage: "finance", owner: "Finance", action: "Open ledger", dependsOn: ["mapping", "company_cost", "wip"] },
  ar_ap: { stage: "finance", owner: "Finance", action: "Reconcile control accounts", dependsOn: ["mapping"] },
  pin: { stage: "tax", owner: "Company administrator", action: "Complete company profile" },
  tax_profile: { stage: "tax", owner: "Finance / tax reviewer", action: "Review tax profile" },
  product_tax: { stage: "tax", owner: "Finance / catalog administrator", action: "Review tax classification" },
  signing: { stage: "tax", owner: "Fiscal integration owner", action: "Configure fiscal device", dependsOn: ["pin", "tax_profile"] },
  fiscal_credit_recovery: { stage: "tax", owner: "Engineering / fiscal provider", action: "Review fiscal integration" },
  sfa_sync: { stage: "connected", owner: "SFA integration owner", action: "Review synchronization" },
};
export function setupTaskMeta(id: string) { return META[id] ?? { stage: "connected" as const, owner: "ERP administrator", action: "Review task" }; }
