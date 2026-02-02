"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

export interface SimulationCardProps {
  title: string;
  summary: string;
  actionLabel: string;
  actionHref: string;
}

export function SimulationCard({
  title,
  summary,
  actionLabel,
  actionHref,
}: SimulationCardProps) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-lg bg-muted p-2 shrink-0">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="mt-1">{summary}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">Simulation</Badge>
            <Button size="sm" variant="link" className="h-auto p-0" asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
