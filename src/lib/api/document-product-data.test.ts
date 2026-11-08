import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { fetchDocumentProductDataApi } from "./product-master";
vi.mock("./client", () => ({ apiRequest: vi.fn(), requireLiveApi: vi.fn() }));
beforeEach(() => { vi.mocked(apiRequest).mockReset(); });
it("loads every id beyond the first batch, deduplicates, and preserves packaging and pricing", async () => {
  vi.mocked(apiRequest).mockImplementation(async (_path, options) => {
    const ids = (options?.params as Record<string, string>).ids.split(",");
    return { byProduct: Object.fromEntries(ids.map((id) => [id, { packaging: [{ uom: "CTN", unitsPer: 24 }], pricing: [{ productId: id, priceListId: "customer", tiers: [{ minQty: 1, uom: "PCS", price: 43.1 }] }] }])) } as never;
  });
  const ids = Array.from({ length: 205 }, (_, i) => `sku-${i}`);
  const data = await fetchDocumentProductDataApi([...ids, ids[0]]);
  expect(apiRequest).toHaveBeenCalledTimes(3);
  expect(Object.keys(data)).toHaveLength(205);
  expect(data["sku-204"].packaging[0].unitsPer).toBe(24);
  expect(data["sku-204"].pricing[0].tiers[0].price).toBe(43.1);
});
it("rejects incomplete tenant-filtered data rather than treating a missing product as unpriced", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ byProduct: {} });
  await expect(fetchDocumentProductDataApi(["unavailable"])).rejects.toThrow("unavailable");
});
