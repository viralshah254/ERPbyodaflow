import { beforeEach, expect, it, vi } from "vitest";
import { fetchAllFinishedGoods } from "./products.repo";
import { fetchProductsPageApi } from "@/lib/api/products";
vi.mock("@/lib/api/products", () => ({ fetchProductsApi: vi.fn(), fetchProductsPageApi: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it("loads every catalogue page without the former twenty-page cutoff", async () => {
  vi.mocked(fetchProductsPageApi).mockImplementation(async (opts) => {
    const n = Number(opts?.cursor ?? "0");
    return { items: [{ id: `fg-${n}`, name: `Finished ${n}`, code: `${n}`, sku: `${n}` }], hasMore: n < 21, nextCursor: n < 21 ? `${n + 1}` : null } as never;
  });
  const all = await fetchAllFinishedGoods();
  expect(all).toHaveLength(22);
  expect(vi.mocked(fetchProductsPageApi).mock.calls.every(([opts]) => opts?.sellable && opts.status === "ACTIVE" && !opts.numericItemCode)).toBe(true);
});
it("fails visibly instead of returning a silently truncated or looping catalogue", async () => {
  vi.mocked(fetchProductsPageApi).mockResolvedValue({ items: [], hasMore: true, nextCursor: "0" } as never);
  await expect(fetchAllFinishedGoods()).rejects.toThrow("did not advance");
  vi.mocked(fetchProductsPageApi).mockResolvedValue({ items: [], hasMore: true, nextCursor: null } as never);
  await expect(fetchAllFinishedGoods()).rejects.toThrow("incomplete");
});
