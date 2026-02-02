/**
 * Typed schema for Copilot action proposals.
 * All actions support review/apply and permission gating.
 */

export type RiskLevel = "low" | "medium" | "high";
export type EntityType = "customer" | "supplier" | "product" | "warehouse" | "branch";
export type DocumentType = "sales-order" | "purchase-order" | "grn" | "invoice" | "journal";

export interface BaseAction {
  id: string;
  type: string;
  summary: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  entitiesReferenced: string[];
  createdAt: string;
}

export interface CreateEntityAction extends BaseAction {
  type: "create-entity";
  payload: {
    entityType: EntityType;
    data: Record<string, unknown>;
  };
}

export interface UpdateEntityAction extends BaseAction {
  type: "update-entity";
  payload: {
    entityType: EntityType;
    entityId: string;
    changes: Record<string, { from: unknown; to: unknown }>;
  };
}

export interface CreateDocumentAction extends BaseAction {
  type: "create-document";
  payload: {
    documentType: DocumentType;
    data: Record<string, unknown>;
    lineItems?: Array<Record<string, unknown>>;
  };
}

export interface CreateWorkflowAction extends BaseAction {
  type: "create-workflow";
  payload: {
    name: string;
    trigger: string;
    actions: Array<Record<string, unknown>>;
  };
}

/** Action cards for pricing, payroll, tax (Apply = stub). */
export interface CustomRecommendationAction extends BaseAction {
  type: "custom-recommendation";
  payload: {
    recommendationKey: string;
    narrative: string;
  };
}

export type CopilotAction =
  | CreateEntityAction
  | UpdateEntityAction
  | CreateDocumentAction
  | CreateWorkflowAction
  | CustomRecommendationAction;

export function isCreateEntity(a: CopilotAction): a is CreateEntityAction {
  return a.type === "create-entity";
}
export function isUpdateEntity(a: CopilotAction): a is UpdateEntityAction {
  return a.type === "update-entity";
}
export function isCreateDocument(a: CopilotAction): a is CreateDocumentAction {
  return a.type === "create-document";
}
export function isCreateWorkflow(a: CopilotAction): a is CreateWorkflowAction {
  return a.type === "create-workflow";
}

export function isCustomRecommendation(a: CopilotAction): a is CustomRecommendationAction {
  return a.type === "custom-recommendation";
}
