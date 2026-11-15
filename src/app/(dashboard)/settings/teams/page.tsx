"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveTeamApi, createTeamApi, fetchTeamsApi, updateTeamApi, type TeamInput, type TeamRow } from "@/lib/api/teams";
import { fetchUsersApi } from "@/lib/api/users-roles";
import { fetchBranchesApi, type BranchRow } from "@/lib/api/branches";
import type { UserRow } from "@/lib/types/users-roles";

const EMPTY: TeamInput = { name: "", description: "", branchId: "", leadUserId: "", memberUserIds: [] };

export default function TeamsPage() {
  const [teams, setTeams] = React.useState<TeamRow[]>([]);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [error, setError] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<TeamInput | null>(null);
  const [filter, setFilter] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setError("");
    fetchTeamsApi().then(setTeams).catch((e) => setError(e instanceof Error ? e.message : "Could not load teams."));
  }, []);
  React.useEffect(() => {
    load();
    fetchUsersApi().then(setUsers).catch(() => toast.error("Could not load users."));
    fetchBranchesApi().then(setBranches).catch(() => setBranches([]));
  }, [load]);

  const userName = (id?: string) => {
    const u = users.find((row) => row.id === id);
    return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "—";
  };

  function open(team?: TeamRow) {
    setEditingId(team?.id ?? null);
    setForm(team ? { name: team.name, description: team.description ?? "", branchId: team.branchId ?? "", leadUserId: team.leadUserId ?? "", memberUserIds: [...team.memberUserIds] } : { ...EMPTY });
    setFilter("");
  }

  async function save() {
    if (!form || saving) return;
    if (!form.name.trim()) {
      toast.error("Give the team a name.");
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, branchId: form.branchId || undefined, leadUserId: form.leadUserId || undefined };
      if (editingId) await updateTeamApi(editingId, body);
      else await createTeamApi(body);
      toast.success(editingId ? "Team saved." : "Team created.");
      setForm(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the team.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(team: TeamRow) {
    if (!confirm(`Archive the team "${team.name}"? Its members keep their roles and branches.`)) return;
    try {
      await archiveTeamApi(team.id);
      toast.success("Team archived.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not archive the team.");
    }
  }

  const shownUsers = users.filter((u) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
  });

  return (
    <PageLayout title="Teams" description="Group people under a lead, such as a van-sales crew, a packing shift or a branch sales team.">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => open()}>New team</Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Card>
          <CardContent className="p-0">
            {teams.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No teams yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <span className="font-medium">{team.name}</span>
                        {team.description ? <span className="block text-xs text-muted-foreground">{team.description}</span> : null}
                      </TableCell>
                      <TableCell>{branches.find((b) => b.id === team.branchId)?.name ?? "All branches"}</TableCell>
                      <TableCell>{userName(team.leadUserId)}</TableCell>
                      <TableCell className="text-right tabular-nums">{team.memberUserIds.length}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => open(team)}>Edit</Button>{" "}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void archive(team)}>Archive</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {form ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{editingId ? "Edit team" : "New team"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="team-name">Name</Label>
                  <Input id="team-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="team-branch">Branch</Label>
                  <select id="team-branch" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.branchId ?? ""} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                    <option value="">All branches</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="team-description">What the team does</Label>
                  <Input id="team-description" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="team-lead">Team lead</Label>
                  <select id="team-lead" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.leadUserId ?? ""} onChange={(e) => setForm({ ...form, leadUserId: e.target.value })}>
                    <option value="">No lead</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{userName(u.id)}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-2">
                  <Label>Members ({form.memberUserIds.length})</Label>
                  <Input className="max-w-xs" placeholder="Find a person" value={filter} onChange={(e) => setFilter(e.target.value)} />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border p-3 space-y-2">
                  {shownUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.memberUserIds.includes(u.id)}
                        onCheckedChange={() =>
                          setForm({
                            ...form,
                            memberUserIds: form.memberUserIds.includes(u.id) ? form.memberUserIds.filter((id) => id !== u.id) : [...form.memberUserIds, u.id],
                          })
                        }
                      />
                      <span className="text-sm">{userName(u.id)}</span>
                      <span className="text-xs text-muted-foreground">{u.roleNames.join(", ")}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save team"}</Button>
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageLayout>
  );
}
