import { describe, expect, it } from "vitest";
import type { ManufacturingWorkOrder } from "@/lib/api/manufacturing";
import { productionSheetHtml } from "./production-sheet";
describe("printable saved material requirements", () => {
  it("includes full batch requirements, stores and posting guidance and escapes user data", () => {
    const html = productionSheetHtml({ number: "WO-1", productName: "Cake <script>", notes: '<img src=x onerror="alert(1)">', plannedQuantity: 10, producedQuantity: 2, openQuantity: 8, materialLines: [{ productId: "flour", plannedQuantity: 5, warehouseId: "RM-1", uom: "KG", issuedQuantity: 1, consumedQuantity: 1 }], outputLines: [{ warehouseId: "FG-1" }] } as ManufacturingWorkOrder);
    expect(html).toContain("WO-1"); expect(html).toContain("RM-1"); expect(html).toContain("FG-1");
    expect(html).toContain("<td>5</td><td>KG</td>");
    expect(html).toContain("Printing does not reserve"); expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<img");
  });
});

describe("daily packet units", () => {
  it("keeps ingredient totals separate by product, UOM and store", async () => {
    const { dailyProductionPacketHtml } = await import("./production-sheet");
    const order = { number: "WO", materialLines: [{ productId: "flour", plannedQuantity: 5, warehouseId: "rm", uom: "KG" }, { productId: "flour", plannedQuantity: 2, warehouseId: "rm", uom: "EA" }, { productId: "flour", plannedQuantity: 3, warehouseId: "other", uom: "KG" }], outputLines: [{ warehouseId: "fg" }] } as ManufacturingWorkOrder;
    const html = dailyProductionPacketHtml([order, order]);
    expect(html).toContain("<td>KG</td><td>rm</td><td>10</td>");
    expect(html).toContain("<td>EA</td><td>rm</td><td>4</td>");
    expect(html).toContain("<td>KG</td><td>other</td><td>6</td>");
    expect(html).toContain("not reserved or pickable");
  });
});
