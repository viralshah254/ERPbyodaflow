"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api/client";
import type { UserRow } from "@/lib/types/users-roles";

type Level = "none" | "read" | "write";
type Levels = Record<string, Level>;
type Membership = "inherit" | "include" | "exclude";
type Team = { enabled: boolean; levels: Levels };
type Assignment = { membership: Membership; levels: Partial<Levels> };
type Access = {
  team: Team;
  areas: { key: string; label: string; writable: boolean }[];
  members: { id: string; name: string; employeeCode?: string; assignedByRole: boolean; access?: Assignment; effective?: Levels }[];
};

const endpoint = "/api/settings/accounts-access";
const levelLabel = { none: "No access", read: "Read only", write: "Read & write" };
const defaultAssignment: Assignment = { membership: "inherit", levels: {} };
const control = "w-full rounded-md border bg-background px-3 py-2 text-sm";

export function AccountsAccessPanel({ users }: { users: UserRow[] }) {
  const [access, setAccess] = React.useState<Access | null>(null);
  const [subject, setSubject] = React.useState("");
  const [team, setTeam] = React.useState<Team | null>(null);
  const [assignment, setAssignment] = React.useState<Assignment>(defaultAssignment);
  const [review, setReview] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoadError("");
    try {
      const data = await apiRequest<Access>(endpoint);
      setAccess(data);
      setTeam(data.team);
      return data;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load ERP access.");
      return null;
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  function selectSubject(userId: string) {
    setSubject(userId);
    setAssignment(access?.members.find((member) => member.id === userId)?.access ?? defaultAssignment);
    if (access) setTeam(access.team);
    setReview(false);
  }

  if (loadError && !access) {
    return <Card><CardContent className="space-y-3 pt-6">
      <p role="alert">{loadError}</p>
      <Button variant="outline" onClick={() => void load()}>Retry</Button>
    </CardContent></Card>;
  }
  if (!access || !team) return <p role="status" className="py-4 text-muted-foreground">Loading ERP access…</p>;

  const selectedUser = access.members.find((member) => member.id === subject);
  const editingTeam = !subject;
  const usesProfile = editingTeam || assignment.membership === "include" ||
    (assignment.membership === "inherit" && access.team.enabled && selectedUser?.assignedByRole);
  const affected = access.members.filter((member) => {
    const prior = Boolean(member.effective);
    const next = member.access?.membership === "include" ||
      (team.enabled && member.assignedByRole && member.access?.membership !== "exclude");
    return prior || next;
  });
  const subjectUser = users.find((user) => user.id === subject);
  const personLabel = selectedUser?.name || [subjectUser?.firstName, subjectUser?.lastName].filter(Boolean).join(" ");
  const original = editingTeam ? access.team.levels : selectedUser?.effective;
  const next = editingTeam ? team.levels : usesProfile ? { ...access.team.levels, ...assignment.levels } : undefined;
  const changes = access.areas.filter((area) => original?.[area.key] !== next?.[area.key]);
  const changed = editingTeam
    ? team.enabled !== access.team.enabled || changes.length > 0
    : JSON.stringify(assignment) !== JSON.stringify(selectedUser?.access ?? defaultAssignment);

  async function save() {
    setSaving(true);
    try {
      if (editingTeam) {
        await apiRequest(endpoint, { method: "PUT", body: team });
      } else {
        await apiRequest(`${endpoint}/users/${encodeURIComponent(subject)}`, { method: "PUT", body: assignment });
      }
      const refreshed = await load();
      if (refreshed && !editingTeam) {
        setAssignment(refreshed.members.find((member) => member.id === subject)?.access ?? assignment);
      }
      toast.success("ERP access saved.");
      setReview(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save ERP access.");
    } finally {
      setSaving(false);
    }
  }

  function setLevel(area: string, value: Level | "inherit") {
    setReview(false);
    if (editingTeam && value !== "inherit") {
      setTeam((current) => current && { ...current, levels: { ...current.levels, [area]: value } });
      return;
    }
    setAssignment((current) => {
      const levels = { ...current.levels };
      if (value === "inherit") delete levels[area];
      else levels[area] = value;
      return { ...current, levels };
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ERP access</CardTitle>
        <CardDescription>Set the Accounts team default or adjust access for one person. Branch assignments are managed on each user’s profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Edit access for
            <select className={control} value={subject} disabled={saving} onChange={(event) => selectSubject(event.target.value)}>
              <option value="">Accounts team default</option>
              <optgroup label="Accounts assignments">
                {access.members.map((member) => <option key={member.id} value={member.id}>{member.name || "ERP user"}{member.employeeCode ? ` · ${member.employeeCode}` : ""}</option>)}
              </optgroup>
              <optgroup label="Other active users">
                {users.filter((user) => (user.status ?? "ACTIVE") === "ACTIVE" && !access.members.some((member) => member.id === user.id))
                  .map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
              </optgroup>
            </select>
          </label>
          {editingTeam ? (
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox checked={team.enabled} disabled={saving} onCheckedChange={(checked) => {
                setTeam({ ...team, enabled: checked === true });
                setReview(false);
              }} />
              Apply to users assigned Finance Officer
            </label>
          ) : (
            <label className="grid gap-1.5 text-sm font-medium">
              Profile assignment
              <select className={control} value={assignment.membership} disabled={saving}
                onChange={(event) => { setAssignment({ ...assignment, membership: event.target.value as Membership }); setReview(false); }}>
                <option value="inherit">Follow team assignment</option>
                <option value="include">Apply Accounts access to this person</option>
                <option value="exclude">Use existing roles</option>
              </select>
            </label>
          )}
        </div>

        {usesProfile ? <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(8.25rem,36%)] gap-3 bg-muted/50 px-3 py-2 text-sm font-medium">
            <span>ERP area</span><span>Access level</span>
          </div>
          {access.areas.map((area) => (
            <label key={area.key} className="grid grid-cols-[minmax(0,1fr)_minmax(8.25rem,36%)] items-center gap-3 border-t px-3 py-2.5 text-sm font-medium">
              <span>{area.label}</span>
              <select className={control} value={editingTeam ? team.levels[area.key] : assignment.levels[area.key] ?? "inherit"}
                disabled={saving} onChange={(event) => setLevel(area.key, event.target.value as Level | "inherit")}>
                {!editingTeam && <option value="inherit">Inherit · {levelLabel[access.team.levels[area.key]]}</option>}
                <option value="none">No access</option>
                <option value="read">Read only</option>
                {area.writable && <option value="write">Read &amp; write</option>}
              </select>
            </label>
          ))}
        </div> : (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">This person uses their existing ERP roles. Choose an Accounts profile assignment to set access by area.</p>
        )}

        {review && <section className="space-y-2 rounded-md border bg-muted/30 p-4 text-sm" aria-label="Review access changes">
          <h3 className="font-medium">{editingTeam ? `Review Accounts default · ${affected.length} active users` : `Review access for ${personLabel}`}</h3>
          {editingTeam && affected.length > 0 && <p className="text-muted-foreground">{affected.map((member) => member.name || member.employeeCode || "ERP user").join(", ")}</p>}
          {changes.length > 0 && <ul className="space-y-1">
            {changes.map((area) => <li key={area.key}>{area.label} · {next ? levelLabel[next[area.key]!] : "Existing roles"}</li>)}
          </ul>}
          <p className="text-muted-foreground">Approval and posting controls are assigned separately. Users can refresh ERP to see their updated navigation.</p>
        </section>}

        {loadError && <p role="alert" className="text-sm text-destructive">{loadError}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {review ? <>
            <Button variant="outline" disabled={saving} onClick={() => setReview(false)}>Back</Button>
            <Button disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save access"}</Button>
          </> : <Button disabled={!changed} onClick={() => setReview(true)}>Review access</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
