"use client";

import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type OdaflowSourceInfo = {
  orderTitle?: string;
  odaflowChannel?: string;
  salesRepName?: string;
  salesRepPhone?: string;
  sourcePdfUrl?: string;
  externalOrderId?: string;
};

function channelLabel(channel?: string) {
  const map: Record<string, string> = {
    modern_trade: "Modern Trade",
    distributor: "Distributor",
    direct: "General Trade",
    van_sales: "Van Sales",
  };
  return channel ? (map[channel] ?? channel.replace(/_/g, " ")) : undefined;
}

export function OdaflowSourceCard({ info, compact = false }: { info: OdaflowSourceInfo; compact?: boolean }) {
  const title = info.orderTitle ?? (info.odaflowChannel ? `${channelLabel(info.odaflowChannel)} Order` : "Odaflow order");
  const channel = channelLabel(info.odaflowChannel);

  if (compact) {
    return (
      <div className="rounded-md border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-sky-950 dark:text-sky-100">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[channel, info.salesRepName, info.salesRepPhone].filter(Boolean).join(" · ") || "From Odaflow SFA"}
            </p>
          </div>
          {info.sourcePdfUrl ? (
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" asChild>
              <a href={info.sourcePdfUrl} target="_blank" rel="noopener noreferrer">
                <Icons.FileText className="mr-1.5 h-3.5 w-3.5" />
                Preview original PDF
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-sky-200/80 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icons.ShoppingBag className="h-4 w-4 text-sky-700 dark:text-sky-300" />
          Odaflow SFA order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Order type</p>
            <p className="font-medium">{title}</p>
          </div>
          {channel ? (
            <div>
              <p className="text-xs text-muted-foreground">Channel</p>
              <p className="font-medium">{channel}</p>
            </div>
          ) : null}
          {info.salesRepName ? (
            <div>
              <p className="text-xs text-muted-foreground">Sales rep</p>
              <p className="font-medium">{info.salesRepName}</p>
            </div>
          ) : null}
          {info.salesRepPhone ? (
            <div>
              <p className="text-xs text-muted-foreground">Rep phone</p>
              <p className="font-medium">{info.salesRepPhone}</p>
            </div>
          ) : null}
        </div>
        {info.sourcePdfUrl ? (
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
        ) : (
          <p className="text-xs text-muted-foreground border-t border-sky-200/60 dark:border-sky-900/40 pt-2">
            No PDF was attached from Odaflow for this order.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
