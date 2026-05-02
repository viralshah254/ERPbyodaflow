import { redirect } from "next/navigation";

export default function LegacyFranchiseOverviewRedirect() {
  redirect("/franchise/network/overview");
}
