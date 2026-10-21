import type { WarehousePickPackRow } from "@/lib/api/warehouse-execution";

export type ConfirmedSalesOrder = {
  id: string;
  number: string;
  party?: string;
  createdAt?: string;
  date?: string;
};

function taskStatus(row: WarehousePickPackRow): string {
  return String(row.status ?? "").trim().toUpperCase();
}

export function taskIsSalesOrderPick(row: WarehousePickPackRow): boolean {
  if (row.readySalesOrderId || row.sourceDocumentType === "sales-order" || row.salesOrderId) return true;
  if (row.sourceDocumentType === "delivery-note") return false;
  return String(row.sourceDocumentNumber ?? row.reference ?? "").toUpperCase().startsWith("SO");
}

function taskForOrder(tasks: WarehousePickPackRow[], order: ConfirmedSalesOrder): WarehousePickPackRow | undefined {
  return tasks.find(
    (task) =>
      task.salesOrderId === order.id ||
      task.sourceDocumentId === order.id ||
      task.readySalesOrderId === order.id ||
      task.sourceDocumentNumber === order.number
  );
}

/** Confirmed sales orders that still need picking, plus tasks already started from those orders. */
export function queueConfirmedSalesOrders(params: {
  openTasks: WarehousePickPackRow[];
  knownTasks: WarehousePickPackRow[];
  orders: ConfirmedSalesOrder[];
}): WarehousePickPackRow[] {
  const started = params.openTasks.filter(taskIsSalesOrderPick);
  const startedIds = new Set(started.map((task) => task.salesOrderId || task.sourceDocumentId || task.sourceDocumentNumber));
  const ready: WarehousePickPackRow[] = [];
  for (const order of params.orders) {
    const known = taskForOrder(params.knownTasks, order);
    const status = known ? taskStatus(known) : "";
    if (status === "PACKED" || status === "DISPATCHED" || status === "COMPLETED") continue;
    if (status === "PENDING" || status === "PICKED") continue;
    if (startedIds.has(order.id) || startedIds.has(order.number)) continue;
    ready.push({
      id: `ready:${order.id}`,
      readySalesOrderId: order.id,
      number: order.number,
      reference: order.number,
      sourceDocumentId: order.id,
      sourceDocumentType: "sales-order",
      sourceDocumentNumber: order.number,
      salesOrderId: order.id,
      customer: order.party,
      status: "READY",
      createdAt: order.createdAt || order.date,
      lines: [],
      cartonsCount: 0,
    });
  }
  return [...started, ...ready].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}
