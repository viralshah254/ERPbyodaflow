import { beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ apiRequest: request, requireLiveApi: vi.fn() }));
import { fetchPayRunsApi, fetchPayRunDetailApi, fetchPayslipsApi } from "./payroll";
const run = { id: "hr:qa:run", number: "HR-Oct", status: "DRAFT", periodStart: "2026-09-30T21:00:00.000Z", periodEnd: "2026-10-31T20:59:59.999Z", totalGross: 100, totalDeductions: 10, totalNet: 90, lines: [{ employeeId: "hr-person", employeeName: "Demo HR Employee", grossPay: 100, deductions: 10, netPay: 90, currency: "KES" }] };
describe("HR payroll display in ERP", () => {
  beforeEach(() => request.mockReset());
  it("shows October for a Nairobi October period that starts in September UTC", async () => {
    request.mockResolvedValue({ items: [run] });
    expect((await fetchPayRunsApi())[0].month).toBe("2026-10");
  });
  it("preserves the HR name without creating an ERP employee master", async () => {
    request.mockImplementation(async path => path === "/api/payroll/employees" ? { items: [] } : run);
    const detail = await fetchPayRunDetailApi(run.id);
    expect(detail?.lines[0].employeeName).toBe("Demo HR Employee");
    expect(detail?.lines[0].net).toBe(90);
  });
  it("uses the same Nairobi month for payslips", async () => {
    request.mockResolvedValue({ items: [{ id: "slip", payRunId: run.id, employeeId: "hr-person", employeeName: "Demo HR Employee", periodStart: run.periodStart, grossPay: 100, netPay: 90 }] });
    expect((await fetchPayslipsApi())[0].month).toBe("2026-10");
  });
});
