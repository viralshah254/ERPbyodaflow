export type AutomationRule = {
  id: string;
  name: string;
  trigger: { type: "manual" | "schedule" | "event"; eventType?: string; scheduleId?: string };
  conditions: { field: string; operator: string; value: unknown }[];
  actions: { type: "notify" | "run-schedule" | "emit-event"; config: Record<string, unknown> }[];
  version: number;
  enabled: boolean;
  requireApproval?: boolean;
};
