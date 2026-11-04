import type { ExplodedProductionPlan, ManufacturingWorkOrder } from "@/lib/api/manufacturing";
import { totalFormulaIngredients } from "./production-plan-summary";

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const productionTime = (date: Date) => `${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "medium" }).format(date)} EAT (Africa/Nairobi)`;

/** Print only stored work-order requirements; never re-explode a mutable BOM. */
export function productionSheetHtml(order: ManufacturingWorkOrder, generatedAt = new Date()) {
  const operationRows = (order.operationExecution ?? []).map((step) => {
    const frozen = order.routingSnapshot?.operations?.find((operation) => operation.operationId === step.operationId || operation.order === step.order);
    return `<tr><td>${escape(step.order)}</td><td>${escape(step.name)}</td><td>${escape(step.workCenter)}</td><td>${escape(frozen?.setupMinutes ?? "Unrecorded")} / ${escape(frozen?.runMinutesPerUnit ?? "Unrecorded")}</td><td>${escape(step.critical ? "Yes" : "No")}</td><td>${escape(step.status)} / ${escape(step.qcOutcome || "Not recorded")}</td><td>${escape(step.operatorId)} ${escape(step.startedAt)} ${escape(step.completedAt)}</td></tr>`;
  }).join("");
  const rows = order.materialLines.map((line) => `<tr><td>${escape(line.productName || line.productId)}</td><td>${escape(line.sku)}</td><td>${escape(line.warehouseName || line.warehouseId)}</td><td>${escape(line.plannedQuantity)}</td><td>${escape(line.uom)}</td><td>${escape(line.issuedQuantity)}</td><td>${escape(line.consumedQuantity)}</td><td>${escape(line.returnedQuantity ?? 0)}</td><td>${escape(line.recipeQuantity ?? "")} ${escape(line.recipeUom ?? "")} (base factor ${escape(line.recipeToBaseFactor ?? "unrecorded")})</td><td>${escape((line.wipLotSplits ?? []).map((lot) => `${lot.lotNumber || lot.lotId}: ${lot.quantity}`).join("; "))}</td><td></td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(order.number)} — Production sheet</title><style>body{font:14px Arial,sans-serif;color:#111;margin:28px}table{border-collapse:collapse;width:100%;margin:14px 0}td,th{border:1px solid #888;padding:6px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}h1{font-size:24px}h2{font-size:18px;margin:16px 0 8px;break-after:avoid}p{margin:8px 0}.sign{margin-top:24px;break-inside:avoid}@page{size:A4 landscape;margin:12mm}</style></head><body>
  <h1>Production sheet — ${escape(order.number)}</h1>
  <p>Generated: ${escape(productionTime(generatedAt))} · Planned production: ${escape(order.plannedDate ? productionTime(new Date(order.plannedDate)) : "Not scheduled")}</p>
  <p>Product: ${escape(order.productName || order.productId)} · Status: ${escape(order.status)}</p>
  <p>Document revision: ${escape(order.preparationRevision ?? "Legacy")} · Recipe: ${escape(order.bomSnapshot?.name || order.bomName || order.bomId)} · Recipe version: ${escape(order.bomSnapshot?.version || "Unrecorded")} · Routing: ${escape(order.routingSnapshot?.name || order.routingName || order.routingId || "Not assigned")} · Routing snapshot updated: ${escape(order.routingSnapshot?.updatedAt || "Unrecorded")}</p>
  <p>Recipe base yield: ${escape(order.bomSnapshot?.quantity)} ${escape(order.bomSnapshot?.uom)} · Yield tolerance: ${escape(order.bomSnapshot?.yieldTolerancePercent ?? 0)}%</p>
  <p>Planned output: ${escape(order.plannedQuantity)} · Produced: ${escape(order.producedQuantity)} · Open: ${escape(order.openQuantity)}</p>
  <p>Output verification: ${escape(order.measurementMode || "COUNT_ONLY")} · Weight required: ${order.weighingRequired ? "Yes" : "No"}. Record output in its saved product unit; a mass reading does not replace the finished pack count.</p>
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
  ${(order.completions ?? []).length ? `<h2>Output verification history</h2><table><thead><tr><th>Posting / date</th><th>Output quantity</th><th>Measured weight</th><th>Method / reading</th></tr></thead><tbody>${order.completions.map((posting) => `<tr><td>${escape(posting.idempotencyKey)} ${escape(posting.postedAt)}</td><td>${escape(posting.quantity)}</td><td>${escape(posting.measuredWeight ?? "Not recorded")}</td><td>${escape(posting.measurementMode || "Not recorded")} ${escape(posting.deviceReadingId)}</td></tr>`).join("")}</tbody></table>` : ""}
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
export function dailyProductionPacketHtml(orders: ManufacturingWorkOrder[], generatedAt = new Date()) {
  if (!orders.length) throw new Error("Select prepared batches first");
  if (orders.some((order) => !order.materialLines.length || !order.outputLines.length)) throw new Error("Prepare every selected batch before printing a daily packet.");
  const totals = new Map<string, { product: string; uom: string; store: string; quantity: number }>();
  for (const order of orders) for (const line of order.materialLines) {
    if (!line.uom?.trim()) throw new Error("Resolve missing base units before totaling a daily packet.");
    const key = JSON.stringify([line.productId, line.uom || "UNCONFIRMED", line.warehouseId]);
    const row = totals.get(key) || { product: line.productName || line.productId, uom: line.uom || "UNCONFIRMED", store: line.warehouseName || line.warehouseId, quantity: 0 };
    row.quantity += line.plannedQuantity; totals.set(key, row);
  }
  const summary = `<section><h1>Daily production packet</h1><p>Generated: ${escape(productionTime(generatedAt))}</p><p>Planned requirements by product, base UOM and store. These totals are not reserved or pickable lot allocations.</p><table><thead><tr><th>Ingredient</th><th>UOM</th><th>Store</th><th>Planned quantity</th></tr></thead><tbody>${[...totals.values()].map((row) => `<tr><td>${escape(row.product)}</td><td>${escape(row.uom)}</td><td>${escape(row.store)}</td><td>${escape(Math.round(row.quantity * 1000) / 1000)}</td></tr>`).join("")}</tbody></table></section>`;
  const sheets = orders.map((order) => productionSheetHtml(order, generatedAt).match(/<body>([\s\S]*)<\/body>/)?.[1] || "");
  const first = productionSheetHtml(orders[0]!, generatedAt);
  return first.replace(/<body>[\s\S]*<\/body>/, () => `<body>${summary}${sheets.map((sheet) => `<section style="break-before:page">${sheet}</section>`).join("")}</body>`);
}

/** Planning preview only. The floor uses the saved, prepared work-order packet. */
export function productionPlanHtml(plan: ExplodedProductionPlan, calculatedAt: Date, generatedAt = new Date()) {
  const ingredients = totalFormulaIngredients(plan.tree);
  const table = (headers: string[], rows: unknown[][]) => `<table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Production plan — ${escape(productionTime(generatedAt))}</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#182b40}h1{font-size:24px}h2{margin-top:24px;font-size:17px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#e8eef5;text-align:left}th,td{padding:8px;border:1px solid #cbd5e1}thead{display:table-header-group}tr{break-inside:avoid}.notice{padding:12px;background:#fff5da}footer{margin-top:24px}</style></head><body>
  <h1>Production plan · planning preview</h1><p>Generated: ${escape(productionTime(generatedAt))}<br>Calculated: ${escape(productionTime(calculatedAt))}</p>
  <p class="notice">This preview is not a released production instruction. Create work orders, choose stores, save reviewed preparation and release each batch. Use the prepared packet on the production floor.</p>
  <h2>Planned finished output</h2>${table(["SKU", "Product", "Quantity", "UOM"], plan.packLines.map((r) => [r.productSku, r.productName, r.requiredQty, r.uom]))}
  <h2>Total formula ingredients · before using intermediate stock</h2><p>Full recipe quantities for the entered output. Each ingredient and UOM is totaled separately. Existing semi-finished stock can reduce the materials to issue below.</p>${table(["Ingredient", "Full formula quantity", "UOM"], ingredients.map((r) => [r.productName, r.quantity, r.uom]))}
  <h2>Purchased materials needed after using intermediate stock</h2>${table(["SKU", "Ingredient", "Required", "On hand", "Short to buy", "UOM"], plan.buy.map((r) => [r.productSku, r.productName, r.requiredQty, r.onHandQty, r.warehouseShortfallQty ?? Math.max(0, r.requiredQty - r.onHandQty), r.uom]))}
  <h2>Production sequence · components first</h2>${table(["SKU", "Product", "Required", "Already on hand", "Open work orders", "New batch need", "UOM"], plan.make.map((r) => [r.productSku, r.productName, r.requiredQty, r.onHandQty, r.incomingQty, r.shortageQty, r.uom]))}
  <footer>Prepare → Release to production → Start → Record actual output and weight → Receive under QC hold → QC accept and release for allocation. Printing does not change inventory.</footer></body></html>`;
}

export function printProductionPlan(plan: ExplodedProductionPlan, calculatedAt: Date) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups to print or save the production plan as PDF.");
  popup.opener = null;
  popup.document.write(productionPlanHtml(plan, calculatedAt));
  popup.document.close(); popup.focus(); popup.print();
}
export function printDailyProductionPacket(orders: ManufacturingWorkOrder[], existingPopup?: Window | null) {
  if (!orders.length) throw new Error("Select prepared batches first");
  const html = dailyProductionPacketHtml(orders);
  const popup = existingPopup || window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups to preview the daily packet");
  popup.opener = null; popup.document.write(html); popup.document.close(); popup.focus(); popup.print();
}
