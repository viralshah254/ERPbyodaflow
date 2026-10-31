import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ apiRequest: api, getApiBase: () => "https://erp-api.odaflow.com" }));
import { fetchFmcgSetup } from "./fmcg-setup";
beforeEach(() => api.mockReset());
afterEach(() => vi.unstubAllGlobals());
describe("FMCG setup source", () => {
  it("reads the signed-in backend without changing its response", async () => {
    const result = { version: "fmcg-setup-v1", status: "PREPARING" };
    api.mockResolvedValue(result);
    expect(await fetchFmcgSetup()).toBe(result);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("marks the localhost fallback as read-only", async () => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    api.mockRejectedValueOnce(Object.assign(new Error("Missing release"), { status: 404 }));
    api.mockResolvedValueOnce({ version: "fmcg-setup-v1" });
    expect((await fetchFmcgSetup()).readOnlyPreview).toBe(true);
    expect(api).toHaveBeenLastCalledWith("/api/settings/fmcg-setup", { baseUrl: "http://localhost:4000" });
  });
  it.each([401, 403, 500])("does not mask an authorization or backend error (%s)", async (status) => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    const error = Object.assign(new Error("Denied"), { status }); api.mockRejectedValueOnce(error);
    await expect(fetchFmcgSetup()).rejects.toBe(error);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("never redirects a production page to a local backend", async () => {
    vi.stubGlobal("window", { location: { hostname: "erp.odaflow.com" } });
    api.mockRejectedValueOnce(Object.assign(new Error("Missing release"), { status: 404 }));
    await expect(fetchFmcgSetup()).rejects.toThrow("Missing release");
    expect(api).toHaveBeenCalledTimes(1);
  });
});
