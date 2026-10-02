import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.fn();

vi.mock("./client", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  getApiBase: () => "https://erp-api.odaflow.com",
}));

const { fetchFmcgControlTower } = await import("./fmcg-control-tower");

describe("fetchFmcgControlTower", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("requests the org-scoped FMCG snapshot for the selected range", async () => {
    apiRequestMock.mockResolvedValue({ generatedAt: "2026-10-02T00:00:00.000Z" });

    await fetchFmcgControlTower({ from: "2026-09-01", to: "2026-10-02" });

    expect(apiRequestMock).toHaveBeenCalledWith("/api/control-tower/fmcg", {
      params: { from: "2026-09-01", to: "2026-10-02" },
    });
  });

  it("retries the local API when the signed-in host has no control tower", async () => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    const notFound = Object.assign(new Error("Not found"), { status: 404 });
    apiRequestMock.mockRejectedValueOnce(notFound);
    apiRequestMock.mockResolvedValueOnce({ generatedAt: "2026-10-02T00:00:00.000Z" });

    await fetchFmcgControlTower({ from: "2026-09-01", to: "2026-10-02" });

    expect(apiRequestMock).toHaveBeenLastCalledWith("/api/control-tower/fmcg", {
      params: { from: "2026-09-01", to: "2026-10-02" },
      baseUrl: "http://localhost:4000",
    });
  });
});
