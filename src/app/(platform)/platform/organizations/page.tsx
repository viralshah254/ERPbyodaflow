"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPlatformOrgsApi, type PlatformOrgRow } from "@/lib/api/platform";
import { Search } from "lucide-react";

export default function PlatformOrganizationsPage() {
  const [orgs, setOrgs] = React.useState<PlatformOrgRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPlatformOrgsApi(search.trim() || undefined)
      .then((data) => {
        if (!cancelled) setOrgs(data);
      })
      .catch(() => {
        if (!cancelled) setOrgs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organisations</h1>
          <p className="text-muted-foreground">
            All provisioned organisations across tenants in the platform master console.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/platform/applicants">Review applicants</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All organisations</CardTitle>
          <CardDescription>Search by organisation or tenant name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search organisations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organisations found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground">{org.tenantName ?? org.tenantId}</TableCell>
                    <TableCell>{org.orgType}</TableCell>
                    <TableCell>{org.industryCategory ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{org.templateId ?? "—"}</TableCell>
                    <TableCell>{org.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/platform/customers/${org.tenantId}`}>View</Link>
                      </Button>
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
