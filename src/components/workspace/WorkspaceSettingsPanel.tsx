import { useEffect, useState, type FormEvent } from "react";
import { Database, Eye, LockKeyhole, QrCode, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/atoms/Button";
import { CheckboxCard } from "@/atoms/CheckboxCard";
import { Input } from "@/atoms/Input";
import { Select } from "@/atoms/Select";
import { SkeletonList } from "@/atoms/Skeleton";
import { FormField } from "@/molecules/FormField";
import { useToast } from "@/molecules/Toast";
import { parseApiError } from "@/lib/parseApiError";
import { AvatarUpload } from "@/molecules/AvatarUpload";

type EventVisibility = "PRIVATE" | "WORKSPACE" | "PUBLIC_LINK";
type DataDeletionMode = "PURGE" | "ANONYMIZE";

interface WorkspaceSettings {
  defaultRetentionDays: number;
  allowPublicEventJoin: boolean;
  requireEmailVerification: boolean;
  allowMemberEventView: boolean;
  allowViewerReports: boolean;
  defaultEventVisibility: EventVisibility;
  defaultQrTtlSeconds: number;
  defaultOfflineGraceSeconds: number;
}

interface WorkspacePolicy {
  memberCanCreateEvents: boolean;
  eventManagerCanInviteScanner: boolean;
  eventManagerCanExportReports: boolean;
  scannerCanSeeAttendeeList: boolean;
  scannerCanManualCheckin: boolean;
  viewerCanExportReports: boolean;
  requireApprovalForEvents: boolean;
  requireApprovalForImports: boolean;
  requireReasonForManualEdit: boolean;
  dataDeletionMode: DataDeletionMode;
  retentionDays: number;
}

interface WorkspaceSettingsPanelProps {
  workspaceId: string;
  workspaceName: string;
  logoUrl?: string | null;
  onWorkspaceUpdate?: (data: { name?: string; logoUrl?: string | null }) => void;
}

interface SettingsFormState {
  defaultRetentionDays: string;
  allowPublicEventJoin: boolean;
  requireEmailVerification: boolean;
  allowMemberEventView: boolean;
  allowViewerReports: boolean;
  defaultEventVisibility: EventVisibility;
  defaultQrTtlSeconds: string;
  defaultOfflineGraceSeconds: string;
}

interface PolicyFormState {
  memberCanCreateEvents: boolean;
  eventManagerCanInviteScanner: boolean;
  eventManagerCanExportReports: boolean;
  scannerCanSeeAttendeeList: boolean;
  scannerCanManualCheckin: boolean;
  viewerCanExportReports: boolean;
  requireApprovalForEvents: boolean;
  requireApprovalForImports: boolean;
  requireReasonForManualEdit: boolean;
  dataDeletionMode: DataDeletionMode;
  retentionDays: string;
}


function settingsToForm(settings: WorkspaceSettings): SettingsFormState {
  return {
    defaultRetentionDays: String(settings.defaultRetentionDays ?? 30),
    allowPublicEventJoin: Boolean(settings.allowPublicEventJoin),
    requireEmailVerification: Boolean(settings.requireEmailVerification),
    allowMemberEventView: Boolean(settings.allowMemberEventView),
    allowViewerReports: Boolean(settings.allowViewerReports),
    defaultEventVisibility: settings.defaultEventVisibility ?? "WORKSPACE",
    defaultQrTtlSeconds: String(settings.defaultQrTtlSeconds ?? 30),
    defaultOfflineGraceSeconds: String(settings.defaultOfflineGraceSeconds ?? 120),
  };
}

function policyToForm(policy: WorkspacePolicy): PolicyFormState {
  return {
    memberCanCreateEvents: Boolean(policy.memberCanCreateEvents),
    eventManagerCanInviteScanner: Boolean(policy.eventManagerCanInviteScanner),
    eventManagerCanExportReports: Boolean(policy.eventManagerCanExportReports),
    scannerCanSeeAttendeeList: Boolean(policy.scannerCanSeeAttendeeList),
    scannerCanManualCheckin: Boolean(policy.scannerCanManualCheckin),
    viewerCanExportReports: Boolean(policy.viewerCanExportReports),
    requireApprovalForEvents: Boolean(policy.requireApprovalForEvents),
    requireApprovalForImports: Boolean(policy.requireApprovalForImports),
    requireReasonForManualEdit: Boolean(policy.requireReasonForManualEdit),
    dataDeletionMode: policy.dataDeletionMode ?? "ANONYMIZE",
    retentionDays: String(policy.retentionDays ?? 30),
  };
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <CheckboxCard
      label={title}
      description={description}
      checked={checked}
      onChange={onChange}
      variant="row"
      className="w-full hover:bg-surface-raised/30 transition-colors duration-150"
    />
  );
}

export function WorkspaceSettingsPanel({
  workspaceId,
  workspaceName,
  logoUrl,
  onWorkspaceUpdate,
}: WorkspaceSettingsPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState | null>(null);
  const [policyForm, setPolicyForm] = useState<PolicyFormState | null>(null);

  const [name, setName] = useState(workspaceName);
  const [logoSrc, setLogoSrc] = useState<string | null | undefined>(logoUrl);

  useEffect(() => {
    setName(workspaceName);
  }, [workspaceName]);

  useEffect(() => {
    setLogoSrc(logoUrl);
  }, [logoUrl]);

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.patch<{ logoUrl: string }>(`/workspaces/${workspaceId}/avatar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setLogoSrc(response.data.logoUrl);
      if (onWorkspaceUpdate) {
        onWorkspaceUpdate({ logoUrl: response.data.logoUrl });
      }
      toast.success(t("avatar.uploadSuccess", { defaultValue: "Logo updated successfully" }));
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? t("avatar.uploadError");
      toast.error(Array.isArray(msg) ? msg.join(" ") : msg);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [settingsRes, policyRes] = await Promise.all([
          api.get<WorkspaceSettings>(`/workspaces/${workspaceId}/settings`),
          api.get<WorkspacePolicy>(`/workspaces/${workspaceId}/policy`),
        ]);
        if (cancelled) return;
        setSettingsForm(settingsToForm(settingsRes.data));
        setPolicyForm(policyToForm(policyRes.data));
      } catch (err) {
        toast.error(parseApiError(err, t("common.loadFailed")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, t, toast]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!settingsForm || !policyForm) return;

    setSaving(true);
    try {
      const patchPromises: Promise<any>[] = [
        api.patch(`/workspaces/${workspaceId}/settings`, {
          ...settingsForm,
          defaultRetentionDays: Number(settingsForm.defaultRetentionDays),
          defaultQrTtlSeconds: Number(settingsForm.defaultQrTtlSeconds),
          defaultOfflineGraceSeconds: Number(settingsForm.defaultOfflineGraceSeconds),
        }),
        api.patch(`/workspaces/${workspaceId}/policy`, {
          ...policyForm,
          retentionDays: Number(policyForm.retentionDays),
        }),
      ];

      if (name.trim() !== workspaceName) {
        patchPromises.push(
          api.patch(`/workspaces/${workspaceId}`, {
            name: name.trim(),
          })
        );
      }

      await Promise.all(patchPromises);

      if (name.trim() !== workspaceName && onWorkspaceUpdate) {
        onWorkspaceUpdate({ name: name.trim() });
      }

      toast.success(t("workspace.settingsSaved", { defaultValue: "Workspace settings saved" }));
    } catch (err) {
      toast.error(parseApiError(err, t("workspace.settingsSaveFailed", { defaultValue: "Could not save workspace settings" })));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settingsForm || !policyForm) {
    return <SkeletonList count={4} />;
  }

  return (
    <form className="space-y-4 animate-fade-in-up" onSubmit={save}>
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary" />
          <p className="text-section-title text-ink-1">
            {t("workspace.settingsInfo", { defaultValue: "Workspace settings" })}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <AvatarUpload
              src={logoSrc}
              name={name || workspaceName}
              size="xl"
              onUpload={handleLogoUpload}
              disabled={saving}
            />
            <span className="text-xs text-ink-3 font-medium">Logo workspace</span>
          </div>
          <div className="flex-1 w-full">
            <FormField label={t("workspace.workspaceName", { defaultValue: "Workspace name" })}>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("workspace.workspaceNamePlaceholder", { defaultValue: "Enter workspace name" })}
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-primary" />
            <p className="text-section-title text-ink-1">
              {t("workspace.defaults", { defaultValue: "Event defaults" })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("workspace.defaultRetentionDays", { defaultValue: "Default retention days" })}>
              <Input
                type="number"
                min={1}
                max={3650}
                value={settingsForm.defaultRetentionDays}
                onChange={(e) => setSettingsForm({ ...settingsForm, defaultRetentionDays: e.target.value })}
              />
            </FormField>
            <FormField label={t("workspace.retentionDays", { defaultValue: "Policy retention days" })}>
              <Input
                type="number"
                min={1}
                max={3650}
                value={policyForm.retentionDays}
                onChange={(e) => setPolicyForm({ ...policyForm, retentionDays: e.target.value })}
              />
            </FormField>
            <FormField label={t("workspace.defaultQrTtlSeconds", { defaultValue: "QR TTL seconds" })}>
              <Input
                type="number"
                min={5}
                max={600}
                value={settingsForm.defaultQrTtlSeconds}
                onChange={(e) => setSettingsForm({ ...settingsForm, defaultQrTtlSeconds: e.target.value })}
              />
            </FormField>
            <FormField label={t("workspace.defaultOfflineGraceSeconds", { defaultValue: "Offline grace seconds" })}>
              <Input
                type="number"
                min={0}
                max={3600}
                value={settingsForm.defaultOfflineGraceSeconds}
                onChange={(e) => setSettingsForm({ ...settingsForm, defaultOfflineGraceSeconds: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label={t("workspace.defaultEventVisibility", { defaultValue: "Default event visibility" })}>
            <Select
              value={settingsForm.defaultEventVisibility}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, defaultEventVisibility: e.target.value as EventVisibility })
              }
            >
              <option value="PRIVATE">{t("workspace.visibility.private", { defaultValue: "Private" })}</option>
              <option value="WORKSPACE">{t("workspace.visibility.workspace", { defaultValue: "Workspace" })}</option>
              <option value="PUBLIC_LINK">{t("workspace.visibility.publicLink", { defaultValue: "Public link" })}</option>
            </Select>
          </FormField>
          <FormField label={t("workspace.dataDeletionMode", { defaultValue: "Data deletion mode" })}>
            <Select
              value={policyForm.dataDeletionMode}
              onChange={(e) => setPolicyForm({ ...policyForm, dataDeletionMode: e.target.value as DataDeletionMode })}
            >
              <option value="ANONYMIZE">{t("workspace.deletion.anonymize", { defaultValue: "Anonymize" })}</option>
              <option value="PURGE">{t("workspace.deletion.purge", { defaultValue: "Purge" })}</option>
            </Select>
          </FormField>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-primary" />
            <p className="text-section-title text-ink-1">
              {t("workspace.accessDefaults", { defaultValue: "Access defaults" })}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <ToggleRow
              title={t("workspace.allowPublicEventJoin", { defaultValue: "Allow public event join" })}
              description={t("workspace.allowPublicEventJoinDesc", {
                defaultValue: "Allow attendees with a public link to join when an event allows it.",
              })}
              checked={settingsForm.allowPublicEventJoin}
              onChange={(allowPublicEventJoin) => setSettingsForm({ ...settingsForm, allowPublicEventJoin })}
            />
            <ToggleRow
              title={t("workspace.requireEmailVerification", { defaultValue: "Require email verification" })}
              description={t("workspace.requireEmailVerificationDesc", {
                defaultValue: "Require verified email before sensitive attendee actions.",
              })}
              checked={settingsForm.requireEmailVerification}
              onChange={(requireEmailVerification) => setSettingsForm({ ...settingsForm, requireEmailVerification })}
            />
            <ToggleRow
              title={t("workspace.allowMemberEventView", { defaultValue: "Members can view workspace events" })}
              description={t("workspace.allowMemberEventViewDesc", {
                defaultValue: "Let standard members see events they are allowed to access.",
              })}
              checked={settingsForm.allowMemberEventView}
              onChange={(allowMemberEventView) => setSettingsForm({ ...settingsForm, allowMemberEventView })}
            />
            <ToggleRow
              title={t("workspace.allowViewerReports", { defaultValue: "Viewers can see reports" })}
              description={t("workspace.allowViewerReportsDesc", {
                defaultValue: "Allow read-only roles to open reports when policy also permits it.",
              })}
              checked={settingsForm.allowViewerReports}
              onChange={(allowViewerReports) => setSettingsForm({ ...settingsForm, allowViewerReports })}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-primary" />
            <p className="text-section-title text-ink-1">
              {t("workspace.rolePolicy", { defaultValue: "Role policy" })}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <ToggleRow
              title={t("workspace.memberCanCreateEvents", { defaultValue: "Members can create events" })}
              description={t("workspace.memberCanCreateEventsDesc", {
                defaultValue: "Keep this off when only owners and admins should create events.",
              })}
              checked={policyForm.memberCanCreateEvents}
              onChange={(memberCanCreateEvents) => setPolicyForm({ ...policyForm, memberCanCreateEvents })}
            />
            <ToggleRow
              title={t("workspace.eventManagerCanInviteScanner", { defaultValue: "Event managers can invite scanners" })}
              description={t("workspace.eventManagerCanInviteScannerDesc", {
                defaultValue: "Let event managers add scanner assignments for their event.",
              })}
              checked={policyForm.eventManagerCanInviteScanner}
              onChange={(eventManagerCanInviteScanner) => setPolicyForm({ ...policyForm, eventManagerCanInviteScanner })}
            />
            <ToggleRow
              title={t("workspace.eventManagerCanExportReports", { defaultValue: "Event managers can export reports" })}
              description={t("workspace.eventManagerCanExportReportsDesc", {
                defaultValue: "Allow event managers to export operational event reports.",
              })}
              checked={policyForm.eventManagerCanExportReports}
              onChange={(eventManagerCanExportReports) => setPolicyForm({ ...policyForm, eventManagerCanExportReports })}
            />
            <ToggleRow
              title={t("workspace.viewerCanExportReports", { defaultValue: "Viewers can export reports" })}
              description={t("workspace.viewerCanExportReportsDesc", {
                defaultValue: "Permit read-only report exports for viewer roles.",
              })}
              checked={policyForm.viewerCanExportReports}
              onChange={(viewerCanExportReports) => setPolicyForm({ ...policyForm, viewerCanExportReports })}
            />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <LockKeyhole size={16} className="text-primary" />
            <p className="text-section-title text-ink-1">
              {t("workspace.operationsPolicy", { defaultValue: "Operations policy" })}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <ToggleRow
              title={t("workspace.scannerCanSeeAttendeeList", { defaultValue: "Scanners can see attendee list" })}
              description={t("workspace.scannerCanSeeAttendeeListDesc", {
                defaultValue: "Show attendee roster to scanner users during check-in.",
              })}
              checked={policyForm.scannerCanSeeAttendeeList}
              onChange={(scannerCanSeeAttendeeList) => setPolicyForm({ ...policyForm, scannerCanSeeAttendeeList })}
            />
            <ToggleRow
              title={t("workspace.scannerCanManualCheckin", { defaultValue: "Scanners can manual check-in" })}
              description={t("workspace.scannerCanManualCheckinDesc", {
                defaultValue: "Allow scanner users to create manual check-ins when needed.",
              })}
              checked={policyForm.scannerCanManualCheckin}
              onChange={(scannerCanManualCheckin) => setPolicyForm({ ...policyForm, scannerCanManualCheckin })}
            />
            <ToggleRow
              title={t("workspace.requireApprovalForEvents", { defaultValue: "Require approval for events" })}
              description={t("workspace.requireApprovalForEventsDesc", {
                defaultValue: "Place newly created events into an approval workflow.",
              })}
              checked={policyForm.requireApprovalForEvents}
              onChange={(requireApprovalForEvents) => setPolicyForm({ ...policyForm, requireApprovalForEvents })}
            />
            <ToggleRow
              title={t("workspace.requireApprovalForImports", { defaultValue: "Require approval for imports" })}
              description={t("workspace.requireApprovalForImportsDesc", {
                defaultValue: "Require approval before large attendee or check-in imports are applied.",
              })}
              checked={policyForm.requireApprovalForImports}
              onChange={(requireApprovalForImports) => setPolicyForm({ ...policyForm, requireApprovalForImports })}
            />
            <ToggleRow
              title={t("workspace.requireReasonForManualEdit", { defaultValue: "Require reason for manual edits" })}
              description={t("workspace.requireReasonForManualEditDesc", {
                defaultValue: "Require an audit reason before manual attendance corrections.",
              })}
              checked={policyForm.requireReasonForManualEdit}
              onChange={(requireReasonForManualEdit) => setPolicyForm({ ...policyForm, requireReasonForManualEdit })}
            />
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Database size={16} className="text-primary" />
          <p className="text-section-title text-ink-1">
            {t("workspace.retentionNote", { defaultValue: "Retention posture" })}
          </p>
        </div>
        <p className="text-sm leading-6 text-ink-3">
          {t("workspace.retentionNoteDesc", {
            defaultValue:
              "Default retention is set to 30 days unless changed here. Anonymize keeps aggregate reporting usable; purge removes retained records when cleanup jobs are added.",
          })}
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" type="submit" isLoading={saving}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
