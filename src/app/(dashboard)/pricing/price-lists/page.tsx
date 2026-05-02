import { redirect } from "next/navigation";

export default function LegacyPriceListsRedirect() {
  redirect("/pricing/workspace/lists");
}
