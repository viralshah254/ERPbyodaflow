"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ODAFLOW_SALES_REP_ROLE,
  odaflowBuyerTypeHint,
  odaflowBuyerTypeLabel,
  odaflowChannelLabel,
} from "@/lib/odaflow/channel-labels";

export type OdaflowSourceInfo = {
  orderTitle?: string;
  odaflowChannel?: string;
  /** SFA customer name from the original order. */
  sfaCustomerName?: string;
  salesRepName?: string;
  salesRepPhone?: string;
  sourcePdfUrl?: string;
  externalOrderId?: string;
};

function OdaflowPdfPreview({ url, title }: { url: string; title: string }) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="space-y-2 pt-1 border-t border-sky-200/60 dark:border-sky-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex-1 min-w-[12rem]">
          Original SFA order PDF — confirm quantities and customer before approving.
        </p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <Icons.ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                Hide preview
              </>
            ) : (
              <>
                <Icons.ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                Show preview
              </>
            )}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Icons.ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in new tab
            </a>
          </Button>
        </div>
      </div>
      {expanded ? (
        <div className="overflow-hidden rounded-md border bg-white dark:bg-muted/20">
          <iframe title={title} src={url} className="h-[min(70vh,640px)] w-full border-0" />
        </div>
      ) : null}
    </div>
  );
}

function BuyerTypeBadge({ channel }: { channel?: string }) {
  const label = odaflowBuyerTypeLabel(channel);
  const hint = odaflowBuyerTypeHint(channel);
  return (
    <Badge
      variant="secondary"
      className="text-[10px] font-semibold uppercase tracking-wide"
      title={hint}
    >
      {label}
    </Badge>
  );
}

function PlacedByRow({
  name,
  phone,
  compact = false,
}: {
  name: string;
  phone?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", compact ? "text-xs" : "text-sm")}>
      <Icons.UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">
        Placed by <span className="font-medium text-foreground">{name}</span>
      </span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
        {ODAFLOW_SALES_REP_ROLE}
      </Badge>
      {phone ? <span className="text-xs text-muted-foreground">{phone}</span> : null}
    </div>
  );
}

export function OdaflowSourceCard({
  info,
  compact = false,
  showPdfPreview = true,
  className,
}: {
  info: OdaflowSourceInfo;
  compact?: boolean;
  showPdfPreview?: boolean;
  className?: string;
}) {
  const title =
    info.orderTitle ??
    (info.odaflowChannel ? `${odaflowChannelLabel(info.odaflowChannel)} order` : "Odaflow order");
  const channel = odaflowChannelLabel(info.odaflowChannel);

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-md border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/30",
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-sky-950 dark:text-sky-100">{title}</p>
              <BuyerTypeBadge channel={info.odaflowChannel} />
            </div>
            {info.sfaCustomerName ? (
              <p className="text-xs text-muted-foreground">
                SFA customer: <span className="font-medium text-foreground">{info.sfaCustomerName}</span>
              </p>
            ) : null}
            {info.salesRepName ? (
              <PlacedByRow name={info.salesRepName} phone={info.salesRepPhone} compact />
            ) : (
              <p className="text-xs text-muted-foreground">{channel}</p>
            )}
          </div>
          {info.sourcePdfUrl ? (
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" asChild>
              <a href={info.sourcePdfUrl} target="_blank" rel="noopener noreferrer">
                <Icons.FileText className="mr-1.5 h-3.5 w-3.5" />
                View PDF
              </a>
            </Button>
          ) : null}
        </div>
        {showPdfPreview && info.sourcePdfUrl ? (
          <div className="mt-3">
            <OdaflowPdfPreview url={info.sourcePdfUrl} title={`Original SFA order — ${title}`} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Card className={cn("border-sky-200/80 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Icons.ShoppingBag className="h-4 w-4 text-sky-700 dark:text-sky-300" />
            Odaflow SFA order
          </CardTitle>
          <BuyerTypeBadge channel={info.odaflowChannel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Order type</p>
            <p className="font-medium">{title}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">SFA buyer type</p>
            <p className="font-medium">{odaflowBuyerTypeLabel(info.odaflowChannel)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{odaflowBuyerTypeHint(info.odaflowChannel)}</p>
          </div>
          {info.sfaCustomerName ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">SFA customer</p>
              <p className="font-medium">{info.sfaCustomerName}</p>
            </div>
          ) : null}
          {channel ? (
            <div>
              <p className="text-xs text-muted-foreground">Channel</p>
              <p className="font-medium">{channel}</p>
            </div>
          ) : null}
          {info.externalOrderId ? (
            <div>
              <p className="text-xs text-muted-foreground">SFA order ID</p>
              <p className="font-medium font-mono text-xs break-all">{info.externalOrderId}</p>
            </div>
          ) : null}
        </div>

        {info.salesRepName ? (
          <div className="rounded-md border border-sky-200/60 bg-white/60 px-3 py-2 dark:border-sky-900/40 dark:bg-sky-950/20">
            <PlacedByRow name={info.salesRepName} phone={info.salesRepPhone} />
          </div>
        ) : null}

        {info.sourcePdfUrl ? (
          showPdfPreview ? (
            <OdaflowPdfPreview url={info.sourcePdfUrl} title={`Original SFA order — ${title}`} />
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-200/60 dark:border-sky-900/40">
              <p className="text-xs text-muted-foreground flex-1 min-w-[12rem]">
                Confirm the original SFA order PDF before posting — quantities and customer details should match.
              </p>
              <Button type="button" size="sm" variant="default" asChild>
                <a href={info.sourcePdfUrl} target="_blank" rel="noopener noreferrer">
                  <Icons.ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Preview original PDF
                </a>
              </Button>
            </div>
          )
        ) : (
          <p className="text-xs text-muted-foreground border-t border-sky-200/60 dark:border-sky-900/40 pt-2">
            No PDF was attached from Odaflow for this order.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
