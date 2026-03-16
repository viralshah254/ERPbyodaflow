export type DepreciationJournalLine = {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
};

export type DepreciationRunPreview = {
  period: string;
  periodEnd: string;
  totalDepreciation: number;
  lines: DepreciationJournalLine[];
};
