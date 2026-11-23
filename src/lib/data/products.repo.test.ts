import { beforeEach, expect, it, vi } from "vitest";
import { fetchFinishedGoodsPage } from "./products.repo";
import { fetchProductsPageApi } from "@/lib/api/products";
vi.mock("@/lib/api/products", () => ({ fetchProductsApi: vi.fn(), fetchProductsPageApi: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it("loads one small page in item-code order and hands back the next cursor", async () => {
  vi.mocked(fetchProductsPageApi).mockResolvedValue({ items: [{ id: "fg-1", name: "Finished 1", code: "1", itemRole: "FINISHED" }], hasMore: true, nextCursor: "10" } as never);
  const page = await fetchFinishedGoodsPage({ cursor: "0", search: "queen" });
  expect(page).toEqual({ items: [expect.objectContaining({ id: "fg-1" })], nextCursor: "10" });
  expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({
    status: "ACTIVE", sellable: true, sortBy: "itemCode", limit: 10, cursor: "0", search: "queen",
  }));
});
it("ends on the last page and drops non-finished rows when restricted", async () => {
  vi.mocked(fetchProductsPageApi).mockResolvedValue({ items: [{ id: "raw", name: "Flour", itemRole: "RAW" }, { id: "fg", name: "Cake", itemRole: "FINISHED" }], hasMore: false, nextCursor: null } as never);
  const page = await fetchFinishedGoodsPage({ finishedGoodsOnly: true, cursor: "20" });
  expect(page.items.map((row) => row.id)).toEqual(["fg"]);
  expect(page.nextCursor).toBeNull();
});
it("fails visibly instead of looping on a cursor that does not advance", async () => {
  vi.mocked(fetchProductsPageApi).mockResolvedValue({ items: [], hasMore: true, nextCursor: "10" } as never);
  await expect(fetchFinishedGoodsPage({ cursor: "10" })).rejects.toThrow("did not advance");
});
