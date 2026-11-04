export type TaxRow = {
  id: string;
  code: string;
  name: string;
  rate: number;
  type?: string;
  used?: boolean;
  inclusive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
};
