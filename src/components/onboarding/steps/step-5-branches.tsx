"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import * as Icons from "lucide-react";

interface Step5BranchesProps {
  onNext: () => void;
  onBack: () => void;
}

interface BranchInput {
  name: string;
  address?: string;
  isHeadOffice: boolean;
}

export function Step5Branches({ onNext, onBack }: Step5BranchesProps) {
  const { data, updateData } = useOnboardingStore();
  const [branches, setBranches] = React.useState<BranchInput[]>(
    (data.branches ?? []).length > 0
      ? data.branches!.map((b) => ({ name: b.name, address: b.address ?? "", isHeadOffice: b.isHeadOffice }))
      : [{ name: "Head Office", address: "", isHeadOffice: true }]
  );

  const handleAddBranch = () => {
    setBranches([
      ...branches,
      {
        name: "",
        address: "",
        isHeadOffice: false,
      },
    ]);
  };

  const handleRemoveBranch = (index: number) => {
    if (branches[index].isHeadOffice) return; // Can't remove head office
    setBranches(branches.filter((_, i) => i !== index));
  };

  const handleUpdateBranch = (index: number, field: keyof BranchInput, value: string) => {
    setBranches(
      branches.map((branch, i) =>
        i === index ? { ...branch, [field]: value } : branch
      )
    );
  };

  const handleNext = () => {
    updateData({ branches });
    onNext();
  };

  return (
    <Card className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Branch setup</h2>
        <p className="text-muted-foreground">
          Set up your head office and any additional branches. You can add more later.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {branches.map((branch, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {branch.isHeadOffice && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    HEAD OFFICE
                  </span>
                )}
              </div>
              {!branch.isHeadOffice && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBranch(index)}
                >
                  <Icons.X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Branch name</Label>
                <Input
                  value={branch.name}
                  onChange={(e) =>
                    handleUpdateBranch(index, "name", e.target.value)
                  }
                  placeholder="Branch name"
                />
              </div>
              <div className="space-y-2">
                <Label>Address (optional)</Label>
                <Input
                  value={branch.address}
                  onChange={(e) =>
                    handleUpdateBranch(index, "address", e.target.value)
                  }
                  placeholder="Street, City, Country"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-6">
        <Button variant="outline" onClick={handleAddBranch} className="w-full">
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add branch
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          You can import branches from CSV later
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Continue</Button>
      </div>
    </Card>
  );
}





