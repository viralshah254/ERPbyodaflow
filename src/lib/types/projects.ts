export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  client: string;
  clientId?: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  budget: number;
  costCenterCode?: string;
  costCenterName?: string;
  timesheetCostingMode?: "EMPLOYEE_SALARY_MONTHLY_173" | "PROJECT_DEFAULT_RATE";
  defaultHourlyRate?: number;
};
