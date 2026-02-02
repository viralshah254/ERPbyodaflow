/**
 * BOM, formula, and routing types for manufacturing.
 */

export type BomType = "bom" | "formula";

export interface BOMRow {
  id: string;
  code: string;
  name: string;
  finishedProductId: string;
  quantity: number;
  uom: string;
  version: string;
  isActive: boolean;
  type: BomType;
  /** Formula-only: batch size (output qty per batch). */
  batchSize?: number;
  /** Optional link to route (operations). */
  routeId?: string;
}

export interface BOMItemRow {
  id: string;
  bomId: string;
  productId: string;
  quantity: number;
  uom: string;
  isOptional: boolean;
  scrapFactor?: number;
}

/** Formula co-product: produced alongside main output. */
export interface FormulaCoProduct {
  productId: string;
  quantity: number;
  uom: string;
}

/** Formula by-product: secondary output. */
export interface FormulaByProduct {
  productId: string;
  quantity: number;
  uom: string;
}

export interface FormulaExtras {
  coProducts: FormulaCoProduct[];
  byProducts: FormulaByProduct[];
}

/** Work center (stub). */
export interface WorkCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
}

/** Route (routing stub): sequence of operations. */
export interface RouteRow {
  id: string;
  code: string;
  name: string;
  description?: string;
}

/** Route operation: step in a route. */
export interface RouteOperation {
  id: string;
  routeId: string;
  sequence: number;
  workCenterId: string;
  name: string;
  setupMinutes: number;
  runMinutesPerUnit: number;
}
