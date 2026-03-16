"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchUsersApi } from "@/lib/api/users-roles";
import { fetchRolesApi, type RoleDetailRow } from "@/lib/api/users-roles";
import { AddPlatformUserSheet } from "@/components/platform/AddPlatformUserSheet";
import type { UserRow } from "@/lib/types/users-roles";
import { UserPlus } from "lucide-react";

export default function PlatformUsersPage() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleDetailRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);

  const load = React.useCallback(() => {
    Promise.all([fetchUsersApi(), fetchRolesApi()])
      .then(([userList, roleList]) => {
        setUsers(userList);
        setRoles(roleList);
      })
      .catch(() => {
        setUsers([]);
        setRoles([]);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Platform users who can access the OdaFlow platform console.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform users</CardTitle>
          <CardDescription>Users in the platform org (OdaFlow team)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet. Add a user to give them access to the platform.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.roleNames?.join(", ") ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddPlatformUserSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        roles={roles}
        onSuccess={load}
      />
    </div>
  );
}
