export type TaxRow = {
  id: string;
  code: string;
  name: string;
  rate: number;
  inclusive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
};
