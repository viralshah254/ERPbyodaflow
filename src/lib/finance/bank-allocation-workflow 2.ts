export type AllocationWorkflow = { status: string; suggestedBy?: string; approvedBy?: string; postedBy?: string };

export function bankAllocationAction(proposal: AllocationWorkflow, userId: string | undefined, permissions: string[]) {
  const action: "approve" | "post" | "close" | null = proposal.status === "SUGGESTED" ? "approve" : proposal.status === "APPROVED" ? "post" : proposal.status === "POSTED" ? "close" : null;
  if (!action) return { action, allowed: false, reason: "Closed" };
  const required = action === "post" ? "finance.write" : "finance.approve";
  if (!permissions.includes(required)) return { action, allowed: false, reason: action === "post" ? "Awaiting a finance poster" : "Awaiting a finance approver" };
  const previous = action === "approve" ? [proposal.suggestedBy] : action === "post" ? [proposal.suggestedBy, proposal.approvedBy] : [proposal.suggestedBy, proposal.approvedBy, proposal.postedBy];
  if (previous.some((actor) => !actor)) return { action, allowed: false, reason: "Workflow history needs finance review" };
  if (!userId || previous.includes(userId)) return { action, allowed: false, reason: "A different authorized user must complete this step" };
  return { action, allowed: true, reason: "" };
}

export function allocationBalance(amount: number, rows: Record<string, number>) {
  const values = Object.values(rows);
  const allocated = Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
  const remaining = Math.round((Math.abs(amount) - allocated) * 100) / 100;
  return { allocated, remaining, valid: values.every((value) => Number.isFinite(value) && value >= 0) && allocated > 0 && Math.abs(remaining) < 0.005 };
}
