/**
 * Mock data for /automation/rules.
 */

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  conditions: string;
  actions: string;
  enabled: boolean;
}

export const MOCK_RULES: AutomationRule[] = [
  {
    id: "1",
    name: "Low stock reorder",
    trigger: "Stock below reorder point",
    conditions: "Warehouse = WH-Main",
    actions: "Create draft PO, Notify purchaser",
    enabled: true,
  },
  {
    id: "2",
    name: "SO approval escalation",
    trigger: "Sales order pending > 24h",
    conditions: "Total > 100,000",
    actions: "Assign to manager, Send reminder",
    enabled: true,
  },
  {
    id: "3",
    name: "Invoice > 100k requires approval",
    trigger: "Invoice > 100,000",
    conditions: "Currency = KES",
    actions: "Require approval",
    enabled: true,
  },
];

export function getMockRules(): AutomationRule[] {
  return [...MOCK_RULES];
}
