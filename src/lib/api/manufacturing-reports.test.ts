import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ apiRequest: request, downloadFile: vi.fn(), requireLiveApi: vi.fn(), getApiBase: () => "https://erp-api.odaflow.com" }));
import { fetchManufacturingReport } from "./manufacturing-reports";
beforeEach(() => request.mockReset()); afterEach(() => vi.unstubAllGlobals());
describe("manufacturing report compatibility", () => {
  it("preserves selected report parameters and verifies the calculation contract", async () => {
    request.mockResolvedValue({ version: "manufacturing-reports-v1", rows: [] });
    await fetchManufacturingReport("bom-explosion", { bomId: "recipe", quantity: "10" });
    expect(request).toHaveBeenCalledWith("/api/reports/manufacturing/bom-explosion", { params: { bomId: "recipe", quantity: "10" } });
    request.mockResolvedValue({ rows: [] });
    await expect(fetchManufacturingReport("work-in-progress")).rejects.toThrow("report contract");
  });
  it("labels a localhost-only fallback as a read-only preview", async () => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    request.mockRejectedValueOnce(Object.assign(new Error("Not found"), { status: 404 })).mockResolvedValueOnce({ version: "manufacturing-reports-v1", rows: [] });
    expect((await fetchManufacturingReport("work-in-progress")).readOnlyPreview).toBe(true);
    expect(request).toHaveBeenLastCalledWith("/api/reports/manufacturing/work-in-progress", { params: {}, baseUrl: "http://localhost:4000" });
  });
  it.each([401, 403, 500])("does not hide authorization or source failures (%s)", async (status) => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    request.mockRejectedValueOnce(Object.assign(new Error("Denied"), { status }));
    await expect(fetchManufacturingReport("work-in-progress")).rejects.toThrow("Denied"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("never redirects a production report page to localhost", async () => {
    vi.stubGlobal("window", { location: { hostname: "erp.odaflow.com" } });
    request.mockRejectedValueOnce(Object.assign(new Error("Not found"), { status: 404 }));
    await expect(fetchManufacturingReport("work-in-progress")).rejects.toThrow("reports release"); expect(request).toHaveBeenCalledTimes(1);
  });
});
