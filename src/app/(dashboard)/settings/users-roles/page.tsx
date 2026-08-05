"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  UserFormFields,
  type UserFormState,
} from "@/components/settings/user-form-fields";
import {
  SetPasswordSheet,
  type SetPasswordSheetUser,
} from "@/components/settings/set-password-sheet";
import type {
  PermissionCatalogGroupDto,
  UserRow,
} from "@/lib/types/users-roles";
import { MOBILE_PERSONA_LABELS } from "@/lib/types/users-roles";
import { Badge } from "@/components/ui/badge";
import {
  createRoleApi,
  createUserApi,
  deleteUserApi,
  fetchPermissionCatalogApi,
  fetchRolesApi,
  fetchUsersApi,
  type RoleDetailRow,
  updateRoleApi,
  updateUserApi,
  seedStandardRolesApi,
  setUserPasswordApi,
  fetchFranchiseOutletUsersApi,
  fetchPasswordResetRequestsApi,
  dismissPasswordResetRequestApi,
  type FranchiseOutletUserRow,
  type PasswordResetRequestRow,
} from "@/lib/api/users-roles";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { useAuthStore } from "@/stores/auth-store";
import { fetchRuntimeSession } from "@/lib/api/context";
import { isSeafoodOrg } from "@/config/industry";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { useOrgContextStore } from "@/stores/orgContextStore";

/** Roles that belong to seafood / franchise verticals — hide for FMCG orgs. */
function isFranchiseOrSeafoodOnlyRole(role: {
  templateKey?: string | null;
  name: string;
}): boolean {
  const key = role.templateKey?.trim() ?? "";
  if (key === "franchise_manager" || key.startsWith("coolcatch_")) return true;
  const name = role.name.toLowerCase();
  return name.includes("franchise");
}

export default function UsersRolesPage() {
  const copilotProductEnabled = useCopilotFeatureEnabled();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkUserId = searchParams.get("userId")?.trim() ?? "";
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const setSession = useAuthStore((s) => s.setSession);
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const hasFranchiseNetworkFlag = useOrgContextStore((s) =>
    s.hasFlag("franchiseNetworkMonitoring"),
  );
  const fmcgOrg =
    industryCategory === "FMCG" ||
    (industryCategory !== "SEAFOOD" && isFmcgOrg(templateId));
  const showFranchisees =
    !fmcgOrg &&
    (isSeafoodOrg(templateId, industryCategory) || hasFranchiseNetworkFlag);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleDetailRow[]>([]);
  const [franchiseOutlets, setFranchiseOutlets] = React.useState<
    FranchiseOutletUserRow[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [franchiseLoading, setFranchiseLoading] = React.useState(false);
  const [savingUser, setSavingUser] = React.useState(false);
  const [savingRole, setSavingRole] = React.useState(false);
  const [seedingRoles, setSeedingRoles] = React.useState(false);
  const [passwordNew, setPasswordNew] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [passwordMustChange, setPasswordMustChange] = React.useState(true);
  const [settingPassword, setSettingPassword] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState(false);
  const [passwordResetRequests, setPasswordResetRequests] = React.useState<
    PasswordResetRequestRow[]
  >([]);
  const [passwordResetLoading, setPasswordResetLoading] = React.useState(false);
  const [dismissingRequestId, setDismissingRequestId] = React.useState<
    string | null
  >(null);
  const [setPasswordSheetOpen, setSetPasswordSheetOpen] = React.useState(false);
  const [setPasswordUser, setSetPasswordUser] =
    React.useState<SetPasswordSheetUser | null>(null);
  const pathname = usePathname();
  const passwordResetCardRef = React.useRef<HTMLDivElement | null>(null);
  const deepLinkFallbackHandledRef = React.useRef<string | null>(null);

  const pendingResetUserIds = React.useMemo(
    () => new Set(passwordResetRequests.map((r) => r.userId)),
    [passwordResetRequests],
  );

  const clearResetUserFromUrl = React.useCallback(() => {
    if (searchParams.get("userId")) {
      router.replace("/settings/users-roles", { scroll: false });
    }
  }, [router, searchParams]);

  const visibleRoles = React.useMemo(() => {
    if (showFranchisees) return roles;
    return roles.filter((r) => !isFranchiseOrSeafoodOnlyRole(r));
  }, [roles, showFranchisees]);

  const sortedRoles = React.useMemo(
    () => [...visibleRoles].sort((a, b) => a.name.localeCompare(b.name)),
    [visibleRoles],
  );

  const standardCatalogueCopy = fmcgOrg
    ? "Owner, IT / Org Admin, Finance, Procurement, Dispatch, Logistics Coordinator, Sales, plus FMCG roles (Manufacturing, Production Planner, QC, Warehouse, Distribution)"
    : showFranchisees
      ? "Owner, IT / Org Admin, Finance, Procurement, Dispatch, Logistics Coordinator, Sales, Franchise Network Manager"
      : "Owner, IT / Org Admin, Finance, Procurement, Dispatch, Logistics Coordinator, Sales";
  const refreshUsers = React.useCallback(async () => {
    setUsers(await fetchUsersApi());
  }, []);
  const refreshRoles = React.useCallback(async () => {
    const [nextRoles, nextUsers] = await Promise.all([
      fetchRolesApi(),
      fetchUsersApi(),
    ]);
    setRoles(nextRoles);
    setUsers(nextUsers);
  }, []);
  const [userSheetOpen, setUserSheetOpen] = React.useState(false);
  const [roleSheetOpen, setRoleSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);
  const [editingRole, setEditingRole] = React.useState<RoleDetailRow | null>(
    null,
  );
  const emptyUserForm = (): UserFormState => ({
    email: "",
    firstName: "",
    lastName: "",
    status: "ACTIVE",
    copilotEnabled: false,
    roleIds: [],
    phoneNumber: "",
    nationalId: "",
    employeeCode: "",
  });
  const [userForm, setUserForm] = React.useState<UserFormState>(emptyUserForm);
  const [roleForm, setRoleForm] = React.useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const [permissionCatalog, setPermissionCatalog] = React.useState<
    PermissionCatalogGroupDto[]
  >([]);

  const refreshPasswordResetRequests = React.useCallback(async () => {
    try {
      setPasswordResetLoading(true);
      setPasswordResetRequests(await fetchPasswordResetRequestsApi());
    } catch {
      // Non-admins or API unavailable — hide queue silently.
      setPasswordResetRequests([]);
    } finally {
      setPasswordResetLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsersApi(), fetchRolesApi(), fetchPermissionCatalogApi()])
      .then(([nextUsers, nextRoles, catalog]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
        setPermissionCatalog(catalog);
      })
      .catch((error) => {
        toast.error(
          (error as Error).message || "Failed to load users and roles.",
        );
      })
      .finally(() => setLoading(false));
    void refreshPasswordResetRequests();
  }, [refreshPasswordResetRequests]);

  // Refresh queue whenever admin returns to this page (e.g. after browsing elsewhere in ERP).
  React.useEffect(() => {
    if (pathname?.startsWith("/settings/users-roles")) {
      void refreshPasswordResetRequests();
    }
  }, [pathname, refreshPasswordResetRequests]);

  React.useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void refreshPasswordResetRequests();
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshPasswordResetRequests]);

  // Lazy-load franchisees when tab is first opened
  const franchiseLoaded = React.useRef(false);
  const loadFranchiseOutlets = React.useCallback(() => {
    if (franchiseLoaded.current) return;
    franchiseLoaded.current = true;
    setFranchiseLoading(true);
    fetchFranchiseOutletUsersApi()
      .then(setFranchiseOutlets)
      .catch((err) => {
        // Silently ignore permission errors — org may not have franchise network enabled
        if (
          !(err as Error).message?.includes("403") &&
          !(err as Error).message?.includes("permission")
        ) {
          toast.error(
            (err as Error).message || "Failed to load franchise outlets.",
          );
        }
      })
      .finally(() => setFranchiseLoading(false));
  }, []);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm());
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
      phoneNumber: u.phoneNumber ?? "",
      nationalId: u.nationalId ?? "",
      employeeCode: u.employeeCode ?? "",
    });
    setPasswordNew("");
    setPasswordConfirm("");
    setPasswordMustChange(true);
    setUserSheetOpen(true);
  };

  const openResetPasswordForUserId = React.useCallback(
    (userId: string) => {
      router.push(
        `/settings/users-roles?userId=${encodeURIComponent(userId)}`,
        { scroll: false },
      );
      const req = passwordResetRequests.find((r) => r.userId === userId);
      const row = users.find((u) => u.id === userId);
      if (req) {
        setSetPasswordUser({
          id: req.userId,
          email: req.email,
          displayName: req.displayName,
          roleHint: [req.roleNames.join(", "), req.mobilePersonaLabel]
            .filter(Boolean)
            .join(" · "),
        });
      } else if (row) {
        setSetPasswordUser({
          id: row.id,
          email: row.email,
          displayName:
            [row.firstName, row.lastName].filter(Boolean).join(" ") ||
            row.email,
          roleHint: row.roleNames.join(", "),
        });
      } else {
        return;
      }
      setSetPasswordSheetOpen(true);
    },
    [router, users, passwordResetRequests],
  );

  const scrollToPasswordResetQueue = React.useCallback(() => {
    passwordResetCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const closeSetPasswordSheet = React.useCallback(
    (open: boolean) => {
      setSetPasswordSheetOpen(open);
      if (!open) {
        setSetPasswordUser(null);
        clearResetUserFromUrl();
      }
    },
    [clearResetUserFromUrl],
  );

  // Open (or re-open) reset sheet when landing with ?userId= from a notification or queue link.
  React.useEffect(() => {
    if (!deepLinkUserId) {
      deepLinkFallbackHandledRef.current = null;
      return;
    }
    if (loading || passwordResetLoading) return;
    if (setPasswordSheetOpen && setPasswordUser?.id === deepLinkUserId) return;

    const req = passwordResetRequests.find((r) => r.userId === deepLinkUserId);
    if (req) {
      deepLinkFallbackHandledRef.current = null;
      setSetPasswordUser({
        id: deepLinkUserId,
        email: req.email,
        displayName: req.displayName,
        roleHint: [req.roleNames.join(", "), req.mobilePersonaLabel]
          .filter(Boolean)
          .join(" · "),
      });
      setSetPasswordSheetOpen(true);
      return;
    }

    if (deepLinkFallbackHandledRef.current === deepLinkUserId) return;
    deepLinkFallbackHandledRef.current = deepLinkUserId;
    clearResetUserFromUrl();
    toast.message("Password reset request not found", {
      description:
        "That user may already have been reset or dismissed. Choose someone from the password reset requests list below.",
    });
    scrollToPasswordResetQueue();
  }, [
    loading,
    passwordResetLoading,
    deepLinkUserId,
    passwordResetRequests,
    setPasswordSheetOpen,
    setPasswordUser?.id,
    clearResetUserFromUrl,
    scrollToPasswordResetQueue,
  ]);

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

  // Owner role IDs are any role named "Owner" in the current role list.
  const ownerRoleIds = React.useMemo(
    () => roles.filter((r) => r.name === "Owner").map((r) => r.id),
    [roles],
  );

  // Is the user being edited currently an Owner?
  const editingUserIsOwner = editingUser
    ? editingUser.roleIds.some((id) => ownerRoleIds.includes(id))
    : false;

  const canAssignOwnerRole = editingUserIsOwner || ownerRoleIds.length === 0;

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
          { label: "Settings", href: "/settings" },
          { label: "Users & Roles" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              Users
              {passwordResetRequests.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1.5 text-xs bg-amber-500/15 text-amber-800 dark:text-amber-200"
                >
                  {passwordResetRequests.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            {showFranchisees ? (
              <TabsTrigger value="franchisees" onClick={loadFranchiseOutlets}>
                Franchisees
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {(passwordResetLoading || passwordResetRequests.length > 0) && (
              <Card
                ref={passwordResetCardRef}
                className="border-amber-500/40 bg-amber-500/5"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icons.KeyRound className="h-4 w-4 text-amber-600" />
                        Password reset requests
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={passwordResetLoading}
                      onClick={() => void refreshPasswordResetRequests()}
                    >
                      <Icons.RefreshCw
                        className={`h-4 w-4 ${passwordResetLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {passwordResetLoading &&
                  passwordResetRequests.length === 0 ? (
                    <p className="px-6 pb-4 text-sm text-muted-foreground">
                      Loading requests…
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role / mobile</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead className="w-48 text-right" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {passwordResetRequests.map((req) => {
                          const isActive =
                            deepLinkUserId === req.userId &&
                            setPasswordSheetOpen;
                          return (
                            <TableRow
                              key={req.userId}
                              className={`cursor-pointer ${isActive ? "bg-amber-500/10" : "hover:bg-muted/50"}`}
                              onClick={() =>
                                openResetPasswordForUserId(req.userId)
                              }
                            >
                              <TableCell>
                                <div className="font-medium">
                                  {req.displayName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {req.email}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {req.roleNames.length
                                    ? req.roleNames.join(", ")
                                    : "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {req.mobilePersonaLabel}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(req.requestedAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div
                                  className="flex justify-end gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      openResetPasswordForUserId(req.userId)
                                    }
                                  >
                                    Reset password
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={
                                      dismissingRequestId === req.userId
                                    }
                                    onClick={async () => {
                                      try {
                                        setDismissingRequestId(req.userId);
                                        await dismissPasswordResetRequestApi(
                                          req.userId,
                                        );
                                        setPasswordResetRequests((prev) =>
                                          prev.filter(
                                            (r) => r.userId !== req.userId,
                                          ),
                                        );
                                        if (deepLinkUserId === req.userId)
                                          clearResetUserFromUrl();
                                        toast.success("Request dismissed.");
                                      } catch (error) {
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Could not dismiss request.",
                                        );
                                      } finally {
                                        setDismissingRequestId(null);
                                      }
                                    }}
                                  >
                                    Dismiss
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
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
                      {copilotProductEnabled ? (
                        <TableHead>Copilot</TableHead>
                      ) : null}
                      <TableHead>Roles</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={copilotProductEnabled ? 6 : 5}
                          className="text-muted-foreground"
                        >
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {users.map((u) => (
                      <TableRow
                        key={u.id}
                        className={
                          pendingResetUserIds.has(u.id)
                            ? "bg-amber-500/5"
                            : undefined
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>
                              {u.firstName} {u.lastName}
                            </span>
                            {pendingResetUserIds.has(u.id) ? (
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-300"
                              >
                                Reset pending
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.status ?? "ACTIVE"}</TableCell>
                        {copilotProductEnabled ? (
                          <TableCell>
                            {u.copilotEnabled ? "On" : "Off"}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-muted-foreground">
                          {u.roleNames.join(", ")}
                        </TableCell>
                        <TableCell>
                          {u.effectiveMobilePersona ? (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal whitespace-nowrap"
                            >
                              {MOBILE_PERSONA_LABELS[
                                u.effectiveMobilePersona
                              ] ?? u.effectiveMobilePersona}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {pendingResetUserIds.has(u.id) ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openResetPasswordForUserId(u.id)}
                            >
                              Reset password
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditUser(u)}
                            >
                              Edit
                            </Button>
                          )}
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
                    {visibleRoles.length} role(s). Standard catalogue:{" "}
                    {standardCatalogueCopy} — use &quot;Provision standard
                    roles&quot; to seed them.
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
                          `Standard roles ready (${result.count} roles, template ${result.templateId}).`,
                        );
                        await refreshRoles();
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Failed to provision roles.",
                        );
                      } finally {
                        setSeedingRoles(false);
                      }
                    }}
                  >
                    {seedingRoles
                      ? "Provisioning…"
                      : "Provision standard roles"}
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
                      <TableHead>Mobile shell</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && visibleRoles.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-muted-foreground"
                        >
                          Loading roles...
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {visibleRoles.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <span>{r.name}</span>
                          {r.templateKey ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (standard)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          {r.permissionCount === 999
                            ? "All"
                            : `${r.permissionCount}`}
                        </TableCell>
                        <TableCell>
                          {r.mobileShell ? (
                            <Badge
                              variant="secondary"
                              className="text-xs font-normal whitespace-nowrap"
                            >
                              {MOBILE_PERSONA_LABELS[r.mobileShell] ??
                                r.mobileShell}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditRole(r)}
                          >
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

          {/* ── Franchisees tab (seafood / franchise network only) ── */}
          {showFranchisees ? (
          <TabsContent value="franchisees" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Franchise Outlets</CardTitle>
                  <CardDescription>
                    {franchiseOutlets.length} outlet(s). Each outlet has its own
                    admin login account.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={franchiseLoading}
                  onClick={() => {
                    franchiseLoaded.current = false;
                    loadFranchiseOutlets();
                  }}
                >
                  <Icons.RefreshCw
                    className={`mr-2 h-4 w-4 ${franchiseLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Territory</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Last login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {franchiseLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-muted-foreground"
                        >
                          Loading franchise outlets…
                        </TableCell>
                      </TableRow>
                    ) : franchiseOutlets.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-muted-foreground"
                        >
                          No franchise outlets found. Add outlets via Franchise
                          → Outlets.
                        </TableCell>
                      </TableRow>
                    ) : (
                      franchiseOutlets.map((outlet) => (
                        <TableRow key={outlet.outletId}>
                          <TableCell className="font-medium">
                            {outlet.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            {outlet.code ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {outlet.territory ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                outlet.isActive &&
                                outlet.agreementStatus === "ACTIVE"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs font-normal"
                            >
                              {outlet.isActive
                                ? outlet.agreementStatus
                                : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {outlet.adminEmail ? (
                              <span className="text-sm">
                                {outlet.adminEmail}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No admin user
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {outlet.adminRoleNames.length > 0
                              ? outlet.adminRoleNames.join(", ")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {outlet.adminMobilePersona ? (
                              <Badge
                                variant="outline"
                                className="text-xs font-normal whitespace-nowrap"
                              >
                                {MOBILE_PERSONA_LABELS[
                                  outlet.adminMobilePersona as keyof typeof MOBILE_PERSONA_LABELS
                                ] ?? outlet.adminMobilePersona}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                            {outlet.adminLastLoginAt
                              ? new Intl.DateTimeFormat("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(outlet.adminLastLoginAt))
                              : outlet.adminEmail
                                ? "Never"
                                : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <Sheet
        open={userSheetOpen}
        onOpenChange={(open) => {
          setUserSheetOpen(open);
          if (!open) clearResetUserFromUrl();
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{editingUser ? "Edit user" : "Add user"}</SheetTitle>
            <SheetDescription>
              Create and update ERP users with live role assignments.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <UserFormFields
              form={userForm}
              onChange={setUserForm}
              sortedRoles={sortedRoles}
              copilotProductEnabled={copilotProductEnabled}
              canAssignOwnerRole={canAssignOwnerRole}
              isEdit={Boolean(editingUser)}
            />

            {editingUser ? (
              <div className="space-y-3 rounded-lg border p-4">
                {pendingResetUserIds.has(editingUser.id) ? (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                    This user requested a password reset. Set a new password
                    below, then share it with them securely.
                  </div>
                ) : null}
                <div>
                  <p className="text-sm font-medium">Sign-in password</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sets the user&apos;s Firebase password. They sign in with
                    email + this password.
                    {editingUser.hasSignIn === false ? (
                      <span className="block mt-1 text-amber-700 dark:text-amber-500">
                        No sign-in account yet—complete billing checkout for
                        this user first, then set a password.
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
                  <Label htmlFor="user-confirm-password">
                    Confirm password
                  </Label>
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
                  <span className="text-sm">
                    Require password change on next sign-in
                  </span>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={
                    settingPassword ||
                    !passwordNew ||
                    passwordNew !== passwordConfirm
                  }
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
                      clearResetUserFromUrl();
                      void refreshPasswordResetRequests();
                      // Refetch so hasSignIn reflects the newly provisioned Firebase account.
                      const refreshed = await fetchUsersApi();
                      setUsers(refreshed);
                      const updated = refreshed.find(
                        (u) => u.id === editingUser.id,
                      );
                      if (updated) setEditingUser(updated);
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Failed to set password.",
                      );
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
          <SheetFooter className="mt-6 flex flex-col gap-2">
            {editingUser && !editingUserIsOwner && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={deletingUser}
                onClick={async () => {
                  if (
                    !confirm(
                      `Permanently delete ${editingUser.email}? This cannot be undone.`,
                    )
                  )
                    return;
                  try {
                    setDeletingUser(true);
                    await deleteUserApi(editingUser.id);
                    toast.success(`${editingUser.email} deleted.`);
                    setUserSheetOpen(false);
                    await refreshUsers();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to delete user.",
                    );
                  } finally {
                    setDeletingUser(false);
                  }
                }}
              >
                {deletingUser ? "Deleting…" : "Delete user permanently"}
              </Button>
            )}
            {editingUser && editingUserIsOwner && (
              <p className="text-xs text-amber-700 dark:text-amber-500 text-center">
                Owner users cannot be deleted. Remove the Owner role first
                (while keeping at least one other owner).
              </p>
            )}
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setUserSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
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
                        copilotEnabled: copilotProductEnabled
                          ? userForm.copilotEnabled
                          : false,
                        roleIds: userForm.roleIds,
                        phoneNumber: userForm.phoneNumber || undefined,
                        nationalId: userForm.nationalId || undefined,
                        employeeCode: userForm.employeeCode || undefined,
                      });
                      toast.success("User updated.");
                      if (updated.billingImpact?.invoiceId) {
                        toast.info(
                          updated.billingImpact.lineItems?.length
                            ? `Billing updated: ${updated.billingImpact.lineItems.map((line) => line.description).join(", ")}`
                            : `Billing linked: invoice ${updated.billingImpact.invoiceId.slice(0, 8)}…`,
                        );
                      }
                      if (editingUser.id === currentUserId) {
                        try {
                          const session = await fetchRuntimeSession();
                          setSession({
                            user: session.user,
                            org: session.org,
                            tenant: session.tenant,
                            currentBranch: session.currentBranch,
                            branches: session.branches,
                            permissions: session.permissions,
                            isPlatformOperator: session.isPlatformOperator,
                          });
                        } catch {
                          toast.info(
                            "Log out and back in to apply your new permissions.",
                          );
                        }
                      }
                    } else {
                      const created = await createUserApi({
                        email: userForm.email,
                        firstName: userForm.firstName,
                        lastName: userForm.lastName,
                        status: userForm.status,
                        copilotEnabled: copilotProductEnabled
                          ? userForm.copilotEnabled
                          : false,
                        roleIds: userForm.roleIds,
                        phoneNumber: userForm.phoneNumber || undefined,
                        nationalId: userForm.nationalId || undefined,
                        employeeCode: userForm.employeeCode || undefined,
                      });
                      toast.success("User staged for billing approval.");
                      if (created.checkout) {
                        toast.info(
                          `${created.checkout.items.length} item(s) pending — confirm payment in Billing.`,
                        );
                      }
                      setUserSheetOpen(false);
                      router.push("/settings/billing");
                      return;
                    }
                    setUserSheetOpen(false);
                    await refreshUsers();
                  } catch (error) {
                    toast.error(
                      (error as Error).message || "Failed to save user.",
                    );
                  } finally {
                    setSavingUser(false);
                  }
                }}
              >
                {savingUser
                  ? "Saving..."
                  : editingUser
                    ? "Save"
                    : "Add to billing"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
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
                onChange={(e) =>
                  setRoleForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Finance"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <p className="text-xs text-muted-foreground">
                Checked keys are saved exactly as the backend expects (invalid
                strings are ignored server-side).
              </p>
              <div className="space-y-4 max-h-[28rem] overflow-y-auto rounded border p-3">
                {permissionCatalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {loading
                      ? "Loading permission catalog…"
                      : "No catalog loaded. Check API /settings/permissions."}
                  </p>
                ) : (
                  permissionCatalog.map((g) => (
                    <div key={g.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {g.label}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {g.permissions.map((perm) => (
                          <label
                            key={perm.key}
                            className="flex items-start gap-2 cursor-pointer"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={roleForm.permissions.includes(perm.key)}
                              onCheckedChange={() =>
                                toggleRolePermission(perm.key)
                              }
                            />
                            <span className="text-sm leading-snug">
                              <span className="font-medium">{perm.label}</span>
                              <span className="block text-xs text-muted-foreground font-mono">
                                {perm.key}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setRoleSheetOpen(false)}>
              Cancel
            </Button>
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
                  toast.error(
                    (error as Error).message || "Failed to save role.",
                  );
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

      <SetPasswordSheet
        open={setPasswordSheetOpen}
        user={setPasswordUser}
        onOpenChange={closeSetPasswordSheet}
        fromPasswordResetRequest={
          setPasswordUser ? pendingResetUserIds.has(setPasswordUser.id) : false
        }
        onSuccess={() => {
          toast.success(
            "Password set — share it with the user so they can sign in.",
          );
          void refreshPasswordResetRequests();
        }}
      />
    </PageShell>
  );
}
