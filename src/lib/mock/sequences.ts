/**
 * Mock numbering sequences for /settings/sequences.
 */

export interface SequenceRow {
  id: string;
  documentType: string;
  prefix: string;
  nextNumber: number;
  suffix: string;
  padding: number;
}

export const MOCK_SEQUENCES: SequenceRow[] = [
  { id: "1", documentType: "Sales Order", prefix: "SO-", nextNumber: 1001, suffix: "", padding: 4 },
  { id: "2", documentType: "Invoice", prefix: "INV-", nextNumber: 502, suffix: "", padding: 4 },
  { id: "3", documentType: "Purchase Order", prefix: "PO-", nextNumber: 301, suffix: "", padding: 4 },
  { id: "4", documentType: "Bill", prefix: "BILL-", nextNumber: 201, suffix: "", padding: 4 },
  { id: "5", documentType: "Journal Entry", prefix: "JE-", nextNumber: 1001, suffix: "", padding: 4 },
];

export function getMockSequences(): SequenceRow[] {
  return [...MOCK_SEQUENCES];
}
