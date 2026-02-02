"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getMockUsers,
  getMockRoles,
  PERMISSION_GROUPS,
  getAllPermissions,
  type UserRow,
  type RoleRow,
} from "@/lib/mock/users-roles";
import * as Icons from "lucide-react";

export default function UsersRolesPage() {
  const [users, setUsers] = React.useState<UserRow[]>(() => getMockUsers());
  const [roles, setRoles] = React.useState<RoleRow[]>(() => getMockRoles());
  const [userSheetOpen, setUserSheetOpen] = React.useState(false);
  const [roleSheetOpen, setRoleSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);
  const [editingRole, setEditingRole] = React.useState<RoleRow | null>(null);
  const [userForm, setUserForm] = React.useState({ email: "", firstName: "", lastName: "", roleIds: [] as string[] });
  const [roleForm, setRoleForm] = React.useState({ name: "", description: "", permissions: [] as string[] });

  const allPerms = React.useMemo(() => getAllPermissions(), []);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ email: "", firstName: "", lastName: "", roleIds: [] });
    setUserSheetOpen(true);
  };

  const openEditUser = (u: UserRow) => {
    setEditingUser(u);
    setUserForm({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      roleIds: [...u.roleIds],
    });
    setUserSheetOpen(true);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: [] });
    setRoleSheetOpen(true);
  };

  const openEditRole = (r: RoleRow) => {
    setEditingRole(r);
    setRoleForm({
      name: r.name,
      description: r.description ?? "",
      permissions: [], // Stub: would load from role
    });
    setRoleSheetOpen(true);
  };

  const toggleUserRole = (roleId: string) => {
    setUserForm((p) => ({
      ...p,
      roleIds: p.roleIds.includes(roleId)
        ? p.roleIds.filter((id) => id !== roleId)
        : [...p.roleIds, roleId],
    }));
  };

  const toggleRolePermission = (perm: string) => {
    setRoleForm((p) => ({
      ...p,
      permissions: p.permissions.includes(perm)
        ? p.permissions.filter((x) => x !== perm)
        : [...p.permissions, perm],
    }));
  };

  return (
    <PageShell>
      <PageHeader
        title="Users & Roles"
        description="Manage users, roles, and permissions"
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Users & Roles" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    {users.length} user(s). Assign roles to control access.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={openCreateUser}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="text-muted-foreground">{u.roleNames.join(", ")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openEditUser(u)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>
                    {roles.length} role(s). Configure permissions per role.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={openCreateRole}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.description ?? "—"}</TableCell>
                        <TableCell>{r.permissionCount === 999 ? "All" : `${r.permissionCount}`}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openEditRole(r)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={userSheetOpen} onOpenChange={setUserSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingUser ? "Edit user" : "Add user"}</SheetTitle>
            <SheetDescription>
              Email, name, and role assignments. Stub — no persist.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={userForm.email}
                onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@acme.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={userForm.firstName}
                  onChange={(e) => setUserForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={userForm.lastName}
                  onChange={(e) => setUserForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={userForm.roleIds.includes(r.id)}
                      onCheckedChange={() => toggleUserRole(r.id)}
                    />
                    <span className="text-sm">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setUserSheetOpen(false)}>Cancel</Button>
            <Button onClick={() => setUserSheetOpen(false)}>{editingUser ? "Save" : "Create"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingRole ? "Edit role" : "Add role"}</SheetTitle>
            <SheetDescription>
              Name, description, and permissions. Stub — no persist.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={roleForm.name}
                onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Finance"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={roleForm.description}
                onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-3 max-h-64 overflow-y-auto rounded border p-3">
                {PERMISSION_GROUPS.map((g) => (
                  <div key={g.group}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{g.group}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {g.permissions.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={roleForm.permissions.includes(perm)}
                            onCheckedChange={() => toggleRolePermission(perm)}
                          />
                          <span className="text-sm">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setRoleSheetOpen(false)}>Cancel</Button>
            <Button onClick={() => setRoleSheetOpen(false)}>{editingRole ? "Save" : "Create"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
