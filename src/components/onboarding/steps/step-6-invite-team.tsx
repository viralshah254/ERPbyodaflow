"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import * as Icons from "lucide-react";

interface Step6InviteTeamProps {
  onNext: () => void;
  onBack: () => void;
}

interface InvitedUser {
  email: string;
  role: string;
}

const rolePresets = ["Admin", "Finance", "Warehouse", "Sales", "Approver"];

export function Step6InviteTeam({ onNext, onBack }: Step6InviteTeamProps) {
  const { data, updateData } = useOnboardingStore();
  const [invitedUsers, setInvitedUsers] = React.useState<InvitedUser[]>(
    data.invitedUsers || []
  );

  const handleAddUser = () => {
    setInvitedUsers([
      ...invitedUsers,
      {
        email: "",
        role: "Admin",
      },
    ]);
  };

  const handleRemoveUser = (index: number) => {
    setInvitedUsers(invitedUsers.filter((_, i) => i !== index));
  };

  const handleUpdateUser = (
    index: number,
    field: keyof InvitedUser,
    value: string
  ) => {
    setInvitedUsers(
      invitedUsers.map((user, i) =>
        i === index ? { ...user, [field]: value } : user
      )
    );
  };

  const handleNext = () => {
    updateData({ invitedUsers });
    onNext();
  };

  const handleSkip = () => {
    onNext();
  };

  return (
    <Card className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Invite team members</h2>
        <p className="text-muted-foreground">
          Invite your team to collaborate. You can skip this and add members later.
        </p>
      </div>

      {invitedUsers.length > 0 && (
        <div className="space-y-4 mb-6">
          {invitedUsers.map((user, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between mb-4">
                <span className="text-sm font-medium">Team member {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveUser(index)}
                >
                  <Icons.X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={user.email}
                    onChange={(e) =>
                      handleUpdateUser(index, "email", e.target.value)
                    }
                    placeholder="colleague@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleUpdateUser(index, "role", e.target.value)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {rolePresets.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-6">
        <Button variant="outline" onClick={handleAddUser} className="w-full">
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add team member
        </Button>
      </div>

      <div className="mb-6 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Icons.Link className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Invite link</Label>
        </div>
        <div className="flex gap-2">
          <Input
            value="https://erp.odaflow.com/invite/abc123"
            readOnly
            className="font-mono text-xs"
          />
          <Button variant="outline" size="sm">
            <Icons.Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Share this link to invite team members
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleNext}>Continue</Button>
        </div>
      </div>
    </Card>
  );
}





