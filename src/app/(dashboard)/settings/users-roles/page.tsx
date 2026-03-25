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
  PERMISSION_GROUPS,
  getAllPermissions,
  type UserRow,
} from "@/lib/types/users-roles";
import {
  createRoleApi,
  createUserApi,
  fetchRolesApi,
  fetchUsersApi,
  type RoleDetailRow,
  updateRoleApi,
  updateUserApi,
  seedStandardRolesApi,
  setUserPasswordApi,
} from "@/lib/api/users-roles";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";

export default function UsersRolesPage() {
  const copilotProductEnabled = useCopilotFeatureEnabled();
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleDetailRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingUser, setSavingUser] = React.useState(false);
  const [savingRole, setSavingRole] = React.useState(false);
  const [seedingRoles, setSeedingRoles] = React.useState(false);
  const [passwordNew, setPasswordNew] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [passwordMustChange, setPasswordMustChange] = React.useState(true);
  const [settingPassword, setSettingPassword] = React.useState(false);

  const sortedRoles = React.useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );
  const refreshUsers = React.useCallback(async () => {
    setUsers(await fetchUsersApi());
  }, []);
  const refreshRoles = React.useCallback(async () => {
    const [nextRoles, nextUsers] = await Promise.all([fetchRolesApi(), fetchUsersApi()]);
    setRoles(nextRoles);
    setUsers(nextUsers);
  }, []);
  const [userSheetOpen, setUserSheetOpen] = React.useState(false);
  const [roleSheetOpen, setRoleSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);
  const [editingRole, setEditingRole] = React.useState<RoleDetailRow | null>(null);
  const [userForm, setUserForm] = React.useState({
    email: "",
    firstName: "",
    lastName: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    copilotEnabled: false,
    roleIds: [] as string[],
  });
  const [roleForm, setRoleForm] = React.useState({ name: "", description: "", permissions: [] as string[] });

  const allPerms = React.useMemo(() => getAllPermissions(), []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsersApi(), fetchRolesApi()])
      .then(([nextUsers, nextRoles]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
      })
      .catch((error) => {
        toast.error((error as Error).message || "Failed to load users and roles.");
      })
      .finally(() => setLoading(false));
  }, []);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ email: "", firstName: "", lastName: "", status: "ACTIVE", copilotEnabled: false, roleIds: [] });
    setPasswordNew("");
    setPasswordConfirm("");
    setPasswordMustChange(true);
    setUserSheetOpen(true);
  };

  const openEditUser = (u: UserRow) => {
    setEditingUser(u);
    setUserForm({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status ?? "ACTIVE",
      copilotEnabled: u.copilotEnabled === true,
      roleIds: [...u.roleIds],
    });
    setPasswordNew("");
    setPasswordConfirm("");
    setPasswordMustChange(true);
    setUserSheetOpen(true);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: [] });
    setRoleSheetOpen(true);
  };

  const openEditRole = (r: RoleDetailRow) => {
    setEditingRole(r);
    setRoleForm({
      name: r.name,
      description: r.description ?? "",
      permissions: [...r.permissions],
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
                      <TableHead>Status</TableHead>
                      {copilotProductEnabled ? <TableHead>Copilot</TableHead> : null}
                      <TableHead>Roles</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={copilotProductEnabled ? 6 : 5} className="text-muted-foreground">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.status ?? "ACTIVE"}</TableCell>
                        {copilotProductEnabled ? (
                          <TableCell>{u.copilotEnabled ? "On" : "Off"}</TableCell>
                        ) : null}
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
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>
                    {roles.length} role(s). Includes standard catalogue: Procurement Officer/Manager, Finance Officer,
                    Accounts (AP/AR), Sales, Warehouse, and more—use &quot;Provision standard roles&quot; if you only see
                    Owner.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={seedingRoles}
                    onClick={async () => {
                      try {
                        setSeedingRoles(true);
                        const result = await seedStandardRolesApi();
                        toast.success(
                          `Standard roles ready (${result.count} roles, template ${result.templateId}).`
                        );
                        await refreshRoles();
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to provision roles.");
                      } finally {
                        setSeedingRoles(false);
                      }
                    }}
                  >
                    {seedingRoles ? "Provisioning…" : "Provision standard roles"}
                  </Button>
                  <Button size="sm" onClick={openCreateRole}>
                    <Icons.Plus className="mr-2 h-4 w-4" />
                    Add Role
                  </Button>
                </div>
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
                    {loading && roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          Loading roles...
                        </TableCell>
                      </TableRow>
                    ) : null}
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
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingUser ? "Edit user" : "Add user"}</SheetTitle>
            <SheetDescription>
              Create and update ERP users with live role assignments.
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
            <div className={copilotProductEnabled ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={userForm.status}
                  onChange={(e) =>
                    setUserForm((p) => ({
                      ...p,
                      status: e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED",
                    }))
                  }
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              {copilotProductEnabled ? (
                <div className="space-y-2">
                  <Label>Billing add-ons</Label>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <Checkbox
                      checked={userForm.copilotEnabled}
                      onCheckedChange={(checked) =>
                        setUserForm((p) => ({ ...p, copilotEnabled: checked === true }))
                      }
                    />
                    <span className="text-sm">Enable Copilot for this user</span>
                  </label>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="max-h-52 overflow-y-auto rounded-md border p-3 flex flex-wrap gap-x-4 gap-y-2">
                {sortedRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No roles yet. Open the Roles tab and run &quot;Provision standard roles&quot;.
                  </p>
                ) : (
                  sortedRoles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={userForm.roleIds.includes(r.id)}
                        onCheckedChange={() => toggleUserRole(r.id)}
                      />
                      <span className="text-sm">{r.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                New users are staged for checkout first. Nothing is activated or billed until you confirm the pending checkout from Billing.
              </p>
            </div>

            {editingUser ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Sign-in password</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sets the user&apos;s Firebase password. They sign in with email + this password.
                    {editingUser.hasSignIn === false ? (
                      <span className="block mt-1 text-amber-700 dark:text-amber-500">
                        No sign-in account yet—complete billing checkout for this user first, then set a password.
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-new-password">New password</Label>
                  <Input
                    id="user-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordNew}
                    onChange={(e) => setPasswordNew(e.target.value)}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-confirm-password">Confirm password</Label>
                  <Input
                    id="user-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={passwordMustChange}
                    onCheckedChange={(c) => setPasswordMustChange(c === true)}
                  />
                  <span className="text-sm">Require password change on next sign-in</span>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={settingPassword || !passwordNew || passwordNew !== passwordConfirm}
                  onClick={async () => {
                    if (passwordNew.length < 8) {
                      toast.error("Password must be at least 8 characters.");
                      return;
                    }
                    if (passwordNew !== passwordConfirm) {
                      toast.error("Passwords do not match.");
                      return;
                    }
                    try {
                      setSettingPassword(true);
                      await setUserPasswordApi(editingUser.id, {
                        newPassword: passwordNew,
                        mustChangePassword: passwordMustChange,
                      });
                      toast.success("Password updated.");
                      setPasswordNew("");
                      setPasswordConfirm("");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to set password.");
                    } finally {
                      setSettingPassword(false);
                    }
                  }}
                >
                  {settingPassword ? "Updating…" : "Set password"}
                </Button>
              </div>
            ) : null}
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setUserSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={savingUser}
              onClick={async () => {
                try {
                  setSavingUser(true);
                  if (editingUser) {
                    const updated = await updateUserApi(editingUser.id, {
                      email: userForm.email,
                      firstName: userForm.firstName,
                      lastName: userForm.lastName,
                      status: userForm.status,
                      copilotEnabled: copilotProductEnabled ? userForm.copilotEnabled : false,
                      roleIds: userForm.roleIds,
                    });
                    toast.success("User updated.");
                    if (updated.billingImpact?.invoiceId) {
                      toast.info(
                        updated.billingImpact.lineItems?.length
                          ? `Billing updated: ${updated.billingImpact.lineItems.map((line) => line.description).join(", ")}`
                          : `Billing linked: invoice ${updated.billingImpact.invoiceId.slice(0, 8)}…`
                      );
                    }
                  } else {
                    const created = await createUserApi({
                      email: userForm.email,
                      firstName: userForm.firstName,
                      lastName: userForm.lastName,
                      status: userForm.status,
                      copilotEnabled: copilotProductEnabled ? userForm.copilotEnabled : false,
                      roleIds: userForm.roleIds,
                    });
                    toast.success("User staged for checkout.");
                    if (created.checkout) {
                      toast.info(
                        `Checkout updated: ${created.checkout.items.length} staged item(s), ${new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 2,
                        }).format(created.checkout.quoteTotalCents / 100)} due at checkout.`
                      );
                    }
                  }
                  setUserSheetOpen(false);
                  await refreshUsers();
                } catch (error) {
                  toast.error((error as Error).message || "Failed to save user.");
                } finally {
                  setSavingUser(false);
                }
              }}
            >
              {savingUser ? "Saving..." : editingUser ? "Save" : "Add to checkout"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingRole ? "Edit role" : "Add role"}</SheetTitle>
            <SheetDescription>
              Configure live permissions used by backend RBAC.
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
            <Button
              disabled={savingRole}
              onClick={async () => {
                try {
                  setSavingRole(true);
                  if (editingRole) {
                    await updateRoleApi(editingRole.id, {
                      name: roleForm.name,
                      description: roleForm.description || undefined,
                      permissions: roleForm.permissions,
                    });
                    toast.success("Role updated.");
                  } else {
                    await createRoleApi({
                      name: roleForm.name,
                      description: roleForm.description || undefined,
                      permissions: roleForm.permissions,
                    });
                    toast.success("Role created.");
                  }
                  setRoleSheetOpen(false);
                  await refreshRoles();
                } catch (error) {
                  toast.error((error as Error).message || "Failed to save role.");
                } finally {
                  setSavingRole(false);
                }
              }}
            >
              {savingRole ? "Saving..." : editingRole ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
