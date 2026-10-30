import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn(), download: vi.fn() }));
vi.mock("./client", () => ({ apiRequest: mocks.request, downloadFile: mocks.download, downloadTextFile: vi.fn(), isApiConfigured: () => true, requireLiveApi: vi.fn() }));
import { fetchVatSummaryApi, fetchWhtSummaryApi, downloadTaxSummaryCsvApi } from "./reports";
beforeEach(() => vi.clearAllMocks());
describe("verified tax report contracts", () => {
  it("refuses a legacy bill-tax total presented as withholding income tax", async () => {
    mocks.request.mockResolvedValue({ totalWht: 45.52, billCount: 2 });
    await expect(fetchWhtSummaryApi()).rejects.toThrow("withholding register update");
    mocks.request.mockResolvedValue({ calculationVersion: "withholding-deductions-v1", totalWht: 0, billCount: 0 });
    expect((await fetchWhtSummaryApi()).totalWht).toBe(0);
  });
  it("requires the VAT source-event contract and source rows", async () => {
    mocks.request.mockResolvedValue({ totalVat: 100, invoiceCount: 1 });
    await expect(fetchVatSummaryApi()).rejects.toThrow("tax reporting update");
    mocks.request.mockResolvedValue({ calculationVersion: "source-tax-events-v1", rows: [], outputVat: 0, inputVat: 0, netVat: 0 });
    expect((await fetchVatSummaryApi()).rows).toEqual([]);
  });
  it("blocks export when the connected server still uses the old calculation", async () => {
    mocks.request.mockResolvedValue({ totalWht: 45.52 });
    const error = vi.fn();
    downloadTaxSummaryCsvApi("wht-summary", "wht.csv", error);
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
