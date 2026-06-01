export const GRN_VARIANCE_REASON_NEGATIVE = [
  "WATER_MOISTURE_LOSS",
  "TRANSIT_LOSS",
  "GRADING_LOSS",
] as const;

export const GRN_VARIANCE_REASON_POSITIVE = [
  "MOISTURE_GAIN",
  "SUPPLIER_OVER_DELIVERY",
  "SCALE_VARIANCE",
] as const;

export const GRN_VARIANCE_REASON_LABELS: Record<string, string> = {
  WATER_MOISTURE_LOSS: "Water / moisture loss",
  TRANSIT_LOSS: "Transit loss",
  GRADING_LOSS: "Grading / quality loss",
  MOISTURE_GAIN: "Water / moisture gain",
  SUPPLIER_OVER_DELIVERY: "Supplier over-delivery",
  SCALE_VARIANCE: "Scale / weighing difference",
  OTHER: "Other",
};

const TOLERANCE_KG = 0.05;

export function grnVarianceReasonCodesForDeltaKg(deltaKg: number): string[] {
  const out: string[] = [];
  if (deltaKg > TOLERANCE_KG) {
    out.push(...GRN_VARIANCE_REASON_POSITIVE);
  } else if (deltaKg < -TOLERANCE_KG) {
    out.push(...GRN_VARIANCE_REASON_NEGATIVE);
  } else {
    out.push(...GRN_VARIANCE_REASON_NEGATIVE, ...GRN_VARIANCE_REASON_POSITIVE);
  }
  if (!out.includes("OTHER")) out.push("OTHER");
  return out;
}
