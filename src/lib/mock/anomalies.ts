/**
 * Mock anomalies including pricing and payroll (Week 16).
 */

import type { AnomalyDetection } from "@/types/erp";

export const MOCK_ANOMALIES: AnomalyDetection[] = [
  {
    anomalyId: "1",
    orgId: "org-1",
    type: "INVENTORY",
    severity: "WARNING",
    title: "Unusual stock movement",
    description: "Component X had a sudden drop in stock levels without corresponding sales orders.",
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    metadata: { sku: "COMP-X-003", previousStock: 100, currentStock: 0 },
  },
  {
    anomalyId: "2",
    orgId: "org-1",
    type: "SALES",
    severity: "INFO",
    title: "Sales pattern change",
    description: "Sales volume for Widget A increased significantly compared to historical average.",
    detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    anomalyId: "3",
    orgId: "org-1",
    type: "PRICING",
    severity: "WARNING",
    title: "Sudden price change",
    description: "SKU-001: unit price increased >15% vs last period. Review if intentional.",
    detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    metadata: { sku: "SKU-001", changePercent: 18 },
  },
  {
    anomalyId: "4",
    orgId: "org-1",
    type: "PRICING",
    severity: "WARNING",
    title: "Tier inversion",
    description: "Product Beta: higher quantity tier has higher per-unit price than lower tier.",
    detectedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    metadata: { productId: "p2" },
  },
  {
    anomalyId: "5",
    orgId: "org-1",
    type: "PAYROLL",
    severity: "WARNING",
    title: "Net pay spike",
    description: "Jane Wanjiku: net pay increased >20% MoM. Check bonuses, allowances, or deductions.",
    detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    metadata: { employeeId: "emp1" },
  },
  {
    anomalyId: "6",
    orgId: "org-1",
    type: "PAYROLL",
    severity: "INFO",
    title: "Missing deductions",
    description: "John Kamau: no PAYE deduction where expected. Verify tax status.",
    detectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    metadata: { employeeId: "emp2" },
  },
];

export function getMockAnomalies(): AnomalyDetection[] {
  return [...MOCK_ANOMALIES];
}
