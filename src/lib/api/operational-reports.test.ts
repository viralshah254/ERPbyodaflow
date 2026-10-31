import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ apiRequest: request, downloadFile: vi.fn(), requireLiveApi: vi.fn(), getApiBase: () => "https://erp-api.odaflow.com" }));
import { fetchOperationalReport } from "./operational-reports";
beforeEach(() => request.mockReset()); afterEach(() => vi.unstubAllGlobals());
describe("operational report compatibility", () => {
  it("preserves selected report parameters and verifies the calculation contract", async () => {
    request.mockResolvedValue({ version: "operational-reports-v1", rows: [] });
    await fetchOperationalReport("sales-register", { partyId: "customer", dateFrom: "2026-10-01" });
    expect(request).toHaveBeenCalledWith("/api/reports/operations/sales-register", { params: { partyId: "customer", dateFrom: "2026-10-01" } });
    request.mockResolvedValue({ rows: [] });
    await expect(fetchOperationalReport("sales-register")).rejects.toThrow("reports release");
  });
  it("labels a localhost-only fallback as a read-only preview", async () => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    request.mockRejectedValueOnce(Object.assign(new Error("Not found"), { status: 404 })).mockResolvedValueOnce({ version: "operational-reports-v1", rows: [] });
    expect((await fetchOperationalReport("sales-register")).readOnlyPreview).toBe(true);
    expect(request).toHaveBeenLastCalledWith("/api/reports/operations/sales-register", { params: {}, baseUrl: "http://localhost:4000" });
  });
  it.each([401, 403, 500])("does not hide authorization or source failures (%s)", async (status) => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    request.mockRejectedValueOnce(Object.assign(new Error("Denied"), { status }));
    await expect(fetchOperationalReport("sales-register")).rejects.toThrow("Denied"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("never redirects a production report page to localhost", async () => {
    vi.stubGlobal("window", { location: { hostname: "erp.odaflow.com" } });
    request.mockRejectedValueOnce(Object.assign(new Error("Not found"), { status: 404 }));
    await expect(fetchOperationalReport("sales-register")).rejects.toThrow("reports release"); expect(request).toHaveBeenCalledTimes(1);
  });
});
