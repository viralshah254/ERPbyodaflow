import { redirect } from "next/navigation";

export default function LegacyDailyReviewRedirect() {
  redirect("/pricing/workspace/approvals");
}
