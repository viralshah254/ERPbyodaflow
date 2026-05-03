"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PERISHABLE_DISTRIBUTION_TEMPLATE_IDS,
  getAllTemplates,
} from "@/config/industryTemplates/templates";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useAuthStore } from "@/stores/auth-store";
import {
  fetchOrgProfileApi,
  saveOrgProfileApi,
  uploadOrgComplianceDocApi,
  downloadOrgComplianceDoc,
  type OrgComplianceDocKindSlug,
} from "@/lib/api/org";
import type { OrgComplianceAttachmentSummary } from "@/lib/types/org";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const ALL_TEMPLATES = getAllTemplates();

function formatBytes(bytes?: number): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}

export default function OrganizationPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canManageOrg = permissions.includes("admin.settings");

  const { templateId, template } = useOrgContextStore();
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [orgId, setOrgId] = React.useState("");
  const [name, setName] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [registrationNumber, setRegistrationNumber] = React.useState("");
  const [taxPinAttachment, setTaxPinAttachment] = React.useState<OrgComplianceAttachmentSummary | null>(null);
  const [coiAttachment, setCoiAttachment] = React.useState<OrgComplianceAttachmentSummary | null>(null);

  const [uploadingTax, setUploadingTax] = React.useState(false);
  const [uploadingCoi, setUploadingCoi] = React.useState(false);

  const taxFileRef = React.useRef<HTMLInputElement>(null);
  const coiFileRef = React.useRef<HTMLInputElement>(null);

  const refreshProfile = React.useCallback(async () => {
    const profile = await fetchOrgProfileApi();
    setOrgId(profile.id);
    setName(profile.name);
    setTaxId(profile.taxId);
    setRegistrationNumber(profile.registrationNumber);
    setTaxPinAttachment(profile.taxPinAttachment);
    setCoiAttachment(profile.certificateOfIncorporationAttachment);
    return profile;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const profile = await fetchOrgProfileApi();
        if (cancelled) return;
        setOrgId(profile.id);
        setName(profile.name);
        setTaxId(profile.taxId);
        setRegistrationNumber(profile.registrationNumber);
        setTaxPinAttachment(profile.taxPinAttachment);
        setCoiAttachment(profile.certificateOfIncorporationAttachment);
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const profile = await saveOrgProfileApi({
        name,
        taxId,
        registrationNumber,
      });
      setOrgId(profile.id);
      setTaxPinAttachment(profile.taxPinAttachment);
      setCoiAttachment(profile.certificateOfIncorporationAttachment);
      toast.success("Organization saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copyOrgId = () => {
    if (!orgId) return;
    void navigator.clipboard.writeText(orgId);
    toast.success("Organization ID copied.");
  };

  const handleCompliancePick = async (kind: OrgComplianceDocKindSlug, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast.error("File too large — max 12 MB.");
      return;
    }
    const setBusy = kind === "tax-pin" ? setUploadingTax : setUploadingCoi;
    setBusy(true);
    try {
      await uploadOrgComplianceDocApi(kind, file);
      toast.success("Document uploaded.");
      await refreshProfile();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (kind === "tax-pin" && taxFileRef.current) taxFileRef.current.value = "";
      if (kind === "certificate-of-incorporation" && coiFileRef.current) coiFileRef.current.value = "";
    }
  };

  return (
    <PageLayout title="Organization Profile" description="Manage your organization details">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
            <CardDescription>
              Visible to users with organisation settings access. Compliance scans are PDF or image (JPEG, PNG,
              WEBP).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="org-id">Organization ID</Label>
              <div className="flex gap-2">
                <Input
                  id="org-id"
                  readOnly
                  value={orgId}
                  className="font-mono text-sm"
                  disabled={loading}
                  placeholder="Loading…"
                />
                <Button type="button" variant="outline" size="icon" onClick={copyOrgId} disabled={loading || !orgId} aria-label="Copy organization ID">
                  <Icons.Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Stable tenant identifier — share only with authorised support staff or integrations when asked.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading || !canManageOrg} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID</Label>
              <Input
                id="tax-id"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Enter tax ID"
                disabled={loading || !canManageOrg}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number</Label>
              <Input
                id="registration"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="Enter registration number"
                disabled={loading || !canManageOrg}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
              <ComplianceDocSlot
                label="Tax PIN (scan / photo)"
                description="Government-issued taxpayer PIN document or stamped letter."
                attachment={taxPinAttachment}
                disabled={loading}
                uploading={uploadingTax}
                canManage={canManageOrg}
                fileInputRef={taxFileRef}
                onFileChange={(fl) => void handleCompliancePick("tax-pin", fl)}
                onDownload={() =>
                  downloadOrgComplianceDoc("tax-pin", taxPinAttachment?.fileName ?? "tax-pin-document", (m) =>
                    toast.error(m)
                  )
                }
              />
              <ComplianceDocSlot
                label="Certificate of incorporation"
                description="Company registry certificate or equivalent legal formation document."
                attachment={coiAttachment}
                disabled={loading}
                uploading={uploadingCoi}
                canManage={canManageOrg}
                fileInputRef={coiFileRef}
                onFileChange={(fl) => void handleCompliancePick("certificate-of-incorporation", fl)}
                onDownload={() =>
                  downloadOrgComplianceDoc(
                    "certificate-of-incorporation",
                    coiAttachment?.fileName ?? "certificate-of-incorporation",
                    (m) => toast.error(m)
                  )
                }
              />
            </div>

            <Button disabled={saving || loading || !canManageOrg} onClick={handleSave}>
              <Icons.Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
            {!canManageOrg && (
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Icons.Info className="h-4 w-4 shrink-0 mt-0.5" />
                Your role can view this organisation profile. Ask an administrator to edit fields or upload
                compliance documents.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Industry Template</CardTitle>
            <CardDescription>
              The active template controls which modules, feature flags, and terminology are available for your
              organisation. Contact Odaflow to change your template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const active = template ?? ALL_TEMPLATES.find((t) => t.id === templateId) ?? null;
              const isPerishable =
                active && PERISHABLE_DISTRIBUTION_TEMPLATE_IDS.includes(active.id as (typeof PERISHABLE_DISTRIBUTION_TEMPLATE_IDS)[number]);
              return (
                <div className="flex items-start gap-3 rounded-lg border border-primary bg-primary/5 ring-1 ring-primary p-4 max-w-sm">
                  <div className="mt-0.5">
                    {isPerishable ? (
                      <Icons.Fish className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Icons.Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{active?.name ?? templateId ?? "—"}</span>
                      <Badge variant="default" className="text-[10px]">
                        Active
                      </Badge>
                    </div>
                    {active?.description && <p className="text-xs text-muted-foreground line-clamp-2">{active.description}</p>}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

function ComplianceDocSlot({
  label,
  description,
  attachment,
  disabled,
  uploading,
  canManage,
  fileInputRef,
  onFileChange,
  onDownload,
}: {
  label: string;
  description: string;
  attachment: OrgComplianceAttachmentSummary | null;
  disabled: boolean;
  uploading: boolean;
  canManage: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (files: FileList | null) => void;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{label}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files)}
      />
      {attachment ? (
        <div className="text-xs rounded-md bg-muted/50 border px-3 py-2 space-y-1">
          <div className="font-medium truncate" title={attachment.fileName}>
            {attachment.fileName}
          </div>
          <div className="text-muted-foreground">
            {formatBytes(attachment.sizeBytes)}
            {attachment.uploadedAt ? ` · ${new Date(attachment.uploadedAt).toLocaleDateString()}` : null}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No file uploaded yet.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {canManage && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Icons.Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Icons.Upload className="mr-2 h-3.5 w-3.5" />
                {attachment ? "Replace" : "Upload"}
              </>
            )}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={disabled || !attachment} onClick={onDownload}>
          <Icons.Download className="mr-2 h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
}
