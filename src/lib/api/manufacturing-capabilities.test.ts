import { beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ apiRequest: request, getApiBase: () => "https://example.test" }));
import { requireManufacturingCapability } from "./manufacturing-capabilities";
beforeEach(() => { request.mockReset(); });
describe("manufacturing capability preflight", () => {
  it("checks version and reports the source revision for unsupported capabilities", async () => {
    request.mockResolvedValue({ version: "manufacturing-capabilities-v1", revision: "abc", preparation: "older" });
    await expect(requireManufacturingCapability("preparation", "work-order-preparation-v1")).rejects.toThrow("revision abc");
  });
  it.each([401, 403, 500])("preserves source errors %s", async (status) => {
    const error = Object.assign(new Error("source failure"), { status }); request.mockRejectedValue(error);
    await expect(requireManufacturingCapability("reports", "manufacturing-reports-v1")).rejects.toBe(error);
  });
  it("identifies a missing capability endpoint without probing mutation routes", async () => {
    request.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    await expect(requireManufacturingCapability("reports", "manufacturing-reports-v1")).rejects.toThrow("does not expose manufacturing capabilities");
    expect(request).toHaveBeenCalledTimes(1);
  });
});
