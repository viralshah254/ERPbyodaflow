/**
 * Stub action cards for Copilot: pricing, payroll, tax. Apply = stub.
 */

import type { CustomRecommendationAction } from "@/types/copilotActions";

export const COPILOT_ACTION_CARDS: Omit<CustomRecommendationAction, "id" | "createdAt">[] = [
  {
    type: "custom-recommendation",
    summary: "Fix pricing tier gaps",
    riskLevel: "low",
    requiresApproval: false,
    entitiesReferenced: [],
    payload: {
      recommendationKey: "fix-pricing-tiers",
      narrative: "Identify products with tier gaps (e.g. 1–5, 6–23, 24+) and suggest min/max coverage. Apply will sync suggested tiers (stub).",
    },
  },
  {
    type: "custom-recommendation",
    summary: "Suggest carton/bundle conversions",
    riskLevel: "low",
    requiresApproval: false,
    entitiesReferenced: [],
    payload: {
      recommendationKey: "suggest-carton-conversions",
      narrative: "Based on order patterns and existing packaging, suggest UOM conversions (e.g. 1 CARTON = 24 EA). Apply will add proposals (stub).",
    },
  },
  {
    type: "custom-recommendation",
    summary: "Detect margin issues by price list",
    riskLevel: "medium",
    requiresApproval: false,
    entitiesReferenced: [],
    payload: {
      recommendationKey: "detect-margin-issues",
      narrative: "Compare price lists and cost data to flag products where margin falls below threshold. Apply will generate a report (stub).",
    },
  },
  {
    type: "custom-recommendation",
    summary: "Explain payroll variance MoM",
    riskLevel: "low",
    requiresApproval: false,
    entitiesReferenced: [],
    payload: {
      recommendationKey: "explain-payroll-variance",
      narrative: "Summarise month‑on‑month changes in gross, statutory, and net pay. Highlight new joiners, leave, and rate changes. Apply will open narrative (stub).",
    },
  },
  {
    type: "custom-recommendation",
    summary: "Generate VAT summary narrative",
    riskLevel: "low",
    requiresApproval: false,
    entitiesReferenced: [],
    payload: {
      recommendationKey: "vat-summary-narrative",
      narrative: "Produce a short narrative of VAT output vs input for the selected period, with key drivers. Apply will open report (stub).",
    },
  },
  {
    type: "custom-recommendation",
    summary: "Recommend WHT application rules",
    riskLevel: "low",
    requiresApproval: false,
    entitiesReferenced: [],
    payload: {
      recommendationKey: "wht-application-rules",
      narrative: "Suggest when to apply WHT on supplier bills and payments based on vendor type and thresholds. Apply will update rules (stub).",
    },
  },
];

export function getCopilotActionCards(): CustomRecommendationAction[] {
  return COPILOT_ACTION_CARDS.map((c, i) => ({
    ...c,
    id: `action-card-${c.payload.recommendationKey}`,
    createdAt: new Date(Date.now() - (COPILOT_ACTION_CARDS.length - i) * 3600_000).toISOString(),
  }));
}
