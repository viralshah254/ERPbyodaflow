import type { BomUnitGap } from "@/lib/api/manufacturing";

export function bomUnitGapText(gap: BomUnitGap) {
  if (gap.kind === "invalid") return `${gap.productName} has unit conversions that do not add up.`;
  return `${gap.productName} is stocked in ${gap.toUom}, but the recipe uses ${gap.fromUom}. Add how many ${gap.toUom} make one ${gap.fromUom}.`;
}
