import type { ManufacturingWorkOrder } from "@/lib/api/manufacturing";

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

/** Print only stored work-order requirements; never re-explode a mutable BOM. */
export function productionSheetHtml(order: ManufacturingWorkOrder) {
  const operationRows = (order.operationExecution ?? []).map((step) => {
    const frozen = order.routingSnapshot?.operations?.find((operation) => operation.operationId === step.operationId || operation.order === step.order);
    return `<tr><td>${escape(step.order)}</td><td>${escape(step.name)}</td><td>${escape(step.workCenter)}</td><td>${escape(frozen?.setupMinutes ?? "Unrecorded")} / ${escape(frozen?.runMinutesPerUnit ?? "Unrecorded")}</td><td>${escape(step.critical ? "Yes" : "No")}</td><td>${escape(step.status)} / ${escape(step.qcOutcome || "Not recorded")}</td><td>${escape(step.operatorId)} ${escape(step.startedAt)} ${escape(step.completedAt)}</td></tr>`;
  }).join("");
  const rows = order.materialLines.map((line) => `<tr><td>${escape(line.productName || line.productId)}</td><td>${escape(line.sku)}</td><td>${escape(line.warehouseName || line.warehouseId)}</td><td>${escape(line.plannedQuantity)}</td><td>${escape(line.uom)}</td><td>${escape(line.issuedQuantity)}</td><td>${escape(line.consumedQuantity)}</td><td>${escape(line.returnedQuantity ?? 0)}</td><td>${escape(line.recipeQuantity ?? "")} ${escape(line.recipeUom ?? "")} (base factor ${escape(line.recipeToBaseFactor ?? "unrecorded")})</td><td>${escape((line.wipLotSplits ?? []).map((lot) => `${lot.lotNumber || lot.lotId}: ${lot.quantity}`).join("; "))}</td><td></td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(order.number)} — Production sheet</title><style>body{font:14px Arial,sans-serif;color:#111;margin:28px}table{border-collapse:collapse;width:100%;margin:14px 0}td,th{border:1px solid #888;padding:6px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}h1{font-size:24px}h2{font-size:18px;margin:16px 0 8px;break-after:avoid}p{margin:8px 0}.sign{margin-top:24px;break-inside:avoid}@page{size:A4 landscape;margin:12mm}</style></head><body>
  <h1>Production sheet — ${escape(order.number)}</h1>
  <p>Product: ${escape(order.productName || order.productId)} · Status: ${escape(order.status)}</p>
  <p>Document revision: ${escape(order.preparationRevision ?? "Legacy")} · Recipe: ${escape(order.bomSnapshot?.name || order.bomName || order.bomId)} · Recipe version: ${escape(order.bomSnapshot?.version || "Unrecorded")} · Routing: ${escape(order.routingSnapshot?.name || order.routingName || order.routingId || "Not assigned")} · Routing snapshot updated: ${escape(order.routingSnapshot?.updatedAt || "Unrecorded")}</p>
  <p>Recipe base yield: ${escape(order.bomSnapshot?.quantity)} ${escape(order.bomSnapshot?.uom)} · Yield tolerance: ${escape(order.bomSnapshot?.yieldTolerancePercent ?? 0)}%</p>
  <p>Planned output: ${escape(order.plannedQuantity)} · Produced: ${escape(order.producedQuantity)} · Open: ${escape(order.openQuantity)}</p>
  <p>Output store(s): ${escape([...new Set(order.outputLines.map((line) => line.warehouseName || line.warehouseId))].join(", "))}</p>
  <h2>Material requirements for the full work order</h2>
  <table><thead><tr><th>Ingredient / component</th><th>SKU</th><th>Input store ID</th><th>Planned</th><th>UOM</th><th>Issued to date</th><th>Consumed to date</th><th>Returned</th><th>Recipe quantity / unit</th><th>Retained floor lots</th><th>Actual / notes</th></tr></thead><tbody>${rows}</tbody></table>
  <p>These quantities come from saved work-order material lines. Printing does not reserve, issue, receive or release stock. Record actual production in the system and complete QC before dispatch.</p>
  ${operationRows ? `<h2>Saved routing and execution</h2>
  <table><thead><tr><th>Sequence</th><th>Operation</th><th>Work centre</th><th>Setup / run minutes per unit</th><th>Critical</th><th>Status / QC</th><th>Operator / timestamps</th></tr></thead><tbody>${operationRows}</tbody></table>` : ""}
  ${(order.completions ?? []).some((posting) => posting.inputLines?.length) ? `<h2>Material posting and lot actuals</h2>
  <table><thead><tr><th>Posting / date</th><th>Material</th><th>Issued</th><th>Consumed</th><th>Returned</th><th>UOM</th><th>Consumed lot evidence</th></tr></thead><tbody>${(order.completions ?? []).flatMap((posting) => (posting.inputLines ?? []).map((line) => `<tr><td>${escape(posting.idempotencyKey)} ${escape(posting.postedAt)}</td><td>${escape(order.materialLines.find((saved) => saved.productId === line.productId)?.productName || line.productId)}</td><td>${escape(line.quantity)}</td><td>${escape(line.consumedQuantity)}</td><td>${escape(line.returnedQuantity ?? 0)}</td><td>${escape(line.uom || "Unrecorded")}</td><td>${escape((line.consumedLotSplits ?? []).map((lot) => `${lot.lotId}: ${lot.quantity}`).join("; ") || "Unrecorded / untracked")}</td></tr>`)).join("")}</tbody></table>` : ""}
  ${(order.productionLots ?? []).length ? `<h2>Finished lot QC</h2>
  <table><thead><tr><th>Lot</th><th>Product</th><th>Store</th><th>Status</th><th>QC</th><th>Expiry</th><th>Remaining</th></tr></thead><tbody>${(order.productionLots ?? []).map((lot) => `<tr><td>${escape(lot.lotNumber)}</td><td>${escape(order.outputLines.find((line) => line.productId === lot.productId)?.productName || lot.productId)}</td><td>${escape(order.outputLines.find((line) => line.warehouseId === lot.warehouseId)?.warehouseName || lot.warehouseId)}</td><td>${escape(lot.status)}</td><td>${escape(lot.qcStatus)}</td><td>${escape(lot.expiryDate)}</td><td>${escape(lot.remainingQuantity)}</td></tr>`).join("")}</tbody></table>` : ""}
  <p>Notes: ${escape(order.notes)}</p><p class="sign">Prepared by: ____________________ Stores: ____________________ Production: ____________________ QC: ____________________</p>
  </body></html>`;
}

export function printProductionSheet(order: ManufacturingWorkOrder) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups to print the production sheet.");
  popup.opener = null;
  popup.document.write(productionSheetHtml(order));
  popup.document.close();
  popup.focus();
  popup.print();
}

/** Aggregate only equal product/base-unit/store requirements. */
export function dailyProductionPacketHtml(orders: ManufacturingWorkOrder[]) {
  if (orders.some((order) => !order.materialLines.length || !order.outputLines.length)) throw new Error("Prepare every selected batch before printing a daily packet.");
  const totals = new Map<string, { product: string; uom: string; store: string; quantity: number }>();
  for (const order of orders) for (const line of order.materialLines) {
    if (!line.uom?.trim()) throw new Error("Resolve missing base units before totaling a daily packet.");
    const key = JSON.stringify([line.productId, line.uom || "UNCONFIRMED", line.warehouseId]);
    const row = totals.get(key) || { product: line.productName || line.productId, uom: line.uom || "UNCONFIRMED", store: line.warehouseName || line.warehouseId, quantity: 0 };
    row.quantity += line.plannedQuantity; totals.set(key, row);
  }
  const summary = `<section><h1>Daily production packet</h1><p>Planned requirements by product, base UOM and store. These totals are not reserved or pickable lot allocations.</p><table><thead><tr><th>Ingredient</th><th>UOM</th><th>Store</th><th>Planned quantity</th></tr></thead><tbody>${[...totals.values()].map((row) => `<tr><td>${escape(row.product)}</td><td>${escape(row.uom)}</td><td>${escape(row.store)}</td><td>${escape(Math.round(row.quantity * 1000) / 1000)}</td></tr>`).join("")}</tbody></table></section>`;
  const sheets = orders.map((order) => productionSheetHtml(order).match(/<body>([\s\S]*)<\/body>/)?.[1] || "");
  const first = productionSheetHtml(orders[0]!);
  return first.replace(/<body>[\s\S]*<\/body>/, () => `<body>${summary}${sheets.map((sheet) => `<section style="break-before:page">${sheet}</section>`).join("")}</body>`);
}
export function printDailyProductionPacket(orders: ManufacturingWorkOrder[], existingPopup?: Window | null) {
  if (!orders.length) throw new Error("Select prepared batches first");
  const html = dailyProductionPacketHtml(orders);
  const popup = existingPopup || window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups to preview the daily packet");
  popup.opener = null; popup.document.write(html); popup.document.close(); popup.focus(); popup.print();
}
