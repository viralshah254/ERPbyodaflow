import { scorePartyLookupOption, type PartyLookupOption } from "@/lib/api/parties";

export type ReceiptCustomerRow = PartyLookupOption & {
  outstandingBalance: number;
  nextDueDate: string | null;
};

const OPEN_BALANCE = 0.009;
const UNDATED = "9999-12-31";

function owes(row: ReceiptCustomerRow): boolean {
  return row.outstandingBalance > OPEN_BALANCE;
}

/**
 * Idle list: customers who still owe, soonest due day first.
 * The same due day puts the larger balance first.
 * A typed search still finds a customer with nothing open, after the ones who owe.
 */
export function orderReceiptCustomers<T extends ReceiptCustomerRow>(rows: T[], search: string): T[] {
  const query = search.trim();
  const pool = query ? rows : rows.filter(owes);
  return [...pool].sort((left, right) => {
    if (query) {
      const score = scorePartyLookupOption(left, query) - scorePartyLookupOption(right, query);
      if (score !== 0) return score;
    }
    const leftOwes = owes(left);
    const rightOwes = owes(right);
    if (leftOwes !== rightOwes) return leftOwes ? -1 : 1;
    if (leftOwes) {
      const leftDue = left.nextDueDate || UNDATED;
      const rightDue = right.nextDueDate || UNDATED;
      if (leftDue !== rightDue) return leftDue < rightDue ? -1 : 1;
      const byBalance = right.outstandingBalance - left.outstandingBalance;
      if (Math.abs(byBalance) > OPEN_BALANCE) return byBalance;
    }
    return left.label.localeCompare(right.label);
  });
}
