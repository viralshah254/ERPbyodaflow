export type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  conditions?: string;
  actions?: string;
  enabled: boolean;
};
