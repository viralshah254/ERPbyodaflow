import { describe, expect, it } from "vitest";
import { modernTradeArrival, orderTypeLabel, placerRoleLabel } from "./queue-display";
import type { OdaflowQueueItem } from "@/lib/api/odaflow-integration";

function item(partial: Partial<OdaflowQueueItem> & Pick<OdaflowQueueItem, "eventType">): OdaflowQueueItem {
  return {
    _id: "q1",
    odaflowId: "o1",
    status: "pending",
    attemptCount: 0,
    createdAt: "2026-09-26T00:00:00.000Z",
    ...partial,
  };
}

describe("modernTradeArrival", () => {
  it("splits emailed LPOs from merchandiser and sales-rep supermarket orders", () => {
    expect(
      modernTradeArrival({
        eventType: "order.modern_trade",
        orderTitle: "Modern Trade — Merchandiser Order",
        purchaseOrderNumber: "MPO-MUI1DJWB-2736",
      })
    ).toBe("field");
    expect(
      modernTradeArrival({
        eventType: "order.modern_trade",
        orderTitle: "Modern Trade Order",
        purchaseOrderNumber: "MTO-APP-1000",
      })
    ).toBe("field");
    expect(
      modernTradeArrival({
        eventType: "order.modern_trade",
        orderTitle: "Modern Trade Order",
        purchaseOrderNumber: "20180412",
      })
    ).toBe("email_lpo");
  });

  it("leaves distributor orders alone", () => {
    expect(
      modernTradeArrival({
        eventType: "order.distributor",
        orderTitle: "Distributor Order",
        purchaseOrderNumber: "GT-1",
      })
    ).toBeNull();
  });
});

describe("queue card labels", () => {
  it("labels a merchandiser order and drops the sales-rep badge", () => {
    const row = item({
      eventType: "order.modern_trade",
      orderSummary: {
        orderTitle: "Modern Trade — Merchandiser Order",
        purchaseOrderNumber: "MPO-MUD65VU-2499",
        channel: "modern_trade",
      },
    });
    expect(orderTypeLabel(row, row.orderSummary)).toBe("Modern Trade — Merchandiser / sales rep");
    expect(placerRoleLabel(row, row.orderSummary)).toBe("Merchandiser");
  });

  it("labels an emailed LPO without a field role", () => {
    const row = item({
      eventType: "order.modern_trade",
      orderSummary: {
        orderTitle: "Modern Trade Order",
        purchaseOrderNumber: "PO-S441",
        channel: "modern_trade",
      },
    });
    expect(orderTypeLabel(row, row.orderSummary)).toBe("Modern Trade — Email LPO");
    expect(placerRoleLabel(row, row.orderSummary)).toBeNull();
  });
});
