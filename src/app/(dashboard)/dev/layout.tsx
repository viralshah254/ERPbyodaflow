import { notFound } from "next/navigation";
import { isDevPagesEnabled } from "@/lib/runtime-flags";

export default function DevLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isDevPagesEnabled()) {
    notFound();
  }

  return children;
}
