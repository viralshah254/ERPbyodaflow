"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ODA_BRAND } from "@/lib/brand";

type OdaLogoProps = {
  /** CSS height in pixels (width follows aspect ratio). */
  height?: number;
  className?: string;
  /** When set, wraps the logo in a link. */
  href?: string;
};

export function OdaLogo({ height = 40, className, href }: OdaLogoProps) {
  const img = (
    <img
      src={ODA_BRAND.logoSrc}
      alt="Oda ERP"
      width={280}
      height={80}
      className={cn("h-auto w-auto max-w-full object-contain object-left")}
      style={{ height, width: "auto" }}
      decoding="async"
    />
  );

  if (href) {
    return (
      <Link href={href} className={cn("inline-flex shrink-0 items-center", className)}>
        {img}
        <span className="sr-only">Oda ERP</span>
      </Link>
    );
  }

  return <span className={cn("inline-flex shrink-0 items-center", className)}>{img}</span>;
}
