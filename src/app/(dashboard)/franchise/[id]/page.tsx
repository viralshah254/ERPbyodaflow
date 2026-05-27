import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

/** Legacy route — unified outlet hub lives at /franchise/outlets/[id]. */
export default async function LegacyFranchiseDetailRedirect({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab?.trim();
  const legacyTab =
    tab === "vmi" || tab === "economics" ? "vmi" : tab === "pricing" || tab === "pricelist" ? "pricing" : tab;
  const qs = legacyTab ? `?tab=${encodeURIComponent(legacyTab)}` : "";
  redirect(`/franchise/outlets/${id}${qs}`);
}
