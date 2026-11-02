import { beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ apiRequest: request, requireLiveApi: vi.fn() }));
import { checkExistingWorkOrderAvailability } from "./manufacturing";
beforeEach(() => { request.mockReset(); });
describe("existing order warehouse availability", () => {
  it("turns the observed Not found into an actionable compatibility message", async () => {
    request.mockRejectedValue(Object.assign(new Error("Not found"), { status: 404 }));
    await expect(checkExistingWorkOrderAvailability("wo/1")).rejects.toThrow("connected backend may need");
    expect(request).toHaveBeenCalledWith("/api/manufacturing/work-orders/wo%2F1/availability");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([401,403,409,500])("preserves original server error %s without a live BOM fallback", async (status) => {
    const error = Object.assign(new Error("Server evidence"), { status }); request.mockRejectedValue(error);
    await expect(checkExistingWorkOrderAvailability("wo")).rejects.toBe(error);
  });
});
