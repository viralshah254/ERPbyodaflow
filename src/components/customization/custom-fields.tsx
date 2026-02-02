"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { CustomFieldDefinition } from "@/types/erp";

interface CustomFieldsProps {
  entity: string;
  fields?: CustomFieldDefinition[];
  onFieldsChange?: (fields: CustomFieldDefinition[]) => void;
}

export function CustomFields({ entity, fields = [], onFieldsChange }: CustomFieldsProps) {
  const fieldTypes = [
    { value: "TEXT", label: "Text" },
    { value: "NUMBER", label: "Number" },
    { value: "DATE", label: "Date" },
    { value: "BOOLEAN", label: "Boolean" },
    { value: "SELECT", label: "Select" },
    { value: "MULTI_SELECT", label: "Multi-Select" },
  ];

  const handleAddField = () => {
    const newField: CustomFieldDefinition = {
      fieldId: `field-${Date.now()}`,
      orgId: "org-1",
      entity,
      fieldName: "",
      fieldType: "TEXT",
      label: "",
      required: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    onFieldsChange?.([...fields, newField]);
  };

  const handleRemoveField = (fieldId: string) => {
    onFieldsChange?.(fields.filter((f) => f.fieldId !== fieldId));
  };

  const handleFieldChange = (fieldId: string, updates: Partial<CustomFieldDefinition>) => {
    onFieldsChange?.(
      fields.map((f) => (f.fieldId === fieldId ? { ...f, ...updates } : f))
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>
              Add custom fields to {entity} entities
            </CardDescription>
          </div>
          <Button onClick={handleAddField} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom fields defined. Click &quot;Add Field&quot; to create one.
            </p>
          ) : (
            fields.map((field) => (
              <div key={field.fieldId} className="rounded-lg border p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Field Name</Label>
                    <Input
                      value={field.fieldName}
                      onChange={(e) =>
                        handleFieldChange(field.fieldId, { fieldName: e.target.value })
                      }
                      placeholder="field_name"
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        handleFieldChange(field.fieldId, { label: e.target.value })
                      }
                      placeholder="Display Label"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Field Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={field.fieldType}
                      onChange={(e) =>
                        handleFieldChange(field.fieldId, {
                          fieldType: e.target.value as CustomFieldDefinition["fieldType"],
                        })
                      }
                    >
                      {fieldTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          handleFieldChange(field.fieldId, { required: e.target.checked })
                        }
                      />
                      <span className="text-sm">Required</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveField(field.fieldId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

