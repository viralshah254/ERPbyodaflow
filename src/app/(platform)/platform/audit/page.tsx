"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPlatformAuditApi, type PlatformAuditRow } from "@/lib/api/platform";

export default function PlatformAuditPage() {
  const [items, setItems] = React.useState<PlatformAuditRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchPlatformAuditApi(50)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform audit</h1>
        <p className="text-muted-foreground">Recent platform actions (provisioning, tenant updates, etc.).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Last 50 platform events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>What</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground text-sm">{row.when}</TableCell>
                    <TableCell className="font-mono text-sm">{row.who}</TableCell>
                    <TableCell>{row.what}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.entityType} {row.entityId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
