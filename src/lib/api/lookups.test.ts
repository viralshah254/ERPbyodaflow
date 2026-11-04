import { beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ apiRequest: request, requireLiveApi: vi.fn() }));
import { fetchWarehouseOptions } from "./lookups";
beforeEach(() => vi.clearAllMocks());
describe("complete warehouse lookup", () => {
 it("loads stores after the first fifty instead of silently omitting them", async () => {
  request.mockResolvedValueOnce({items:Array.from({length:50},(_,i)=>({id:String(i),name:`Store ${i}`}))}).mockResolvedValueOnce({items:[{id:"51",name:"Quarantine",code:"Q",branchId:"b"}]});
  const rows = await fetchWarehouseOptions(); expect(rows).toHaveLength(51);expect(rows[50]).toEqual({id:"51",label:"Q - Quarantine",branchId:"b"});expect(request).toHaveBeenLastCalledWith("/api/master/warehouses",{params:{limit:"50",offset:"50"}});
 });
 it("rejects a server that repeats a page rather than offering a partial list", async () => {
  request.mockResolvedValue({items:Array.from({length:50},(_,i)=>({id:String(i),name:`Store ${i}`}))}); await expect(fetchWarehouseOptions()).rejects.toThrow("pagination is incomplete");
 });
});
