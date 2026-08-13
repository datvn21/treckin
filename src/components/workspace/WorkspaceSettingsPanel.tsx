/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · genre: modern-minimal · macrostructure: Workbench · theme: Dropbox warm */

import { useEffect, useState, useMemo, type FormEvent } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  LockKeyhole,
  QrCode,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/atoms/Button";
import { Input } from "@/atoms/Input";
import { Select } from "@/atoms/Select";
import { SkeletonList } from "@/atoms/Skeleton";
import { FormField } from "@/molecules/FormField";
import { useToast } from "@/molecules/Toast";
import { parseApiError } from "@/lib/parseApiError";
import { AvatarUpload } from "@/molecules/AvatarUpload";
import { cn } from "@/lib/utils";

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
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex w-full items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition-all duration-150 outline-none cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-primary/30",
        checked
          ? "border-primary-border/70 bg-primary-muted/30 shadow-xs"
          : "border-border-1 bg-surface hover:border-border-2 hover:bg-surface-raised/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5 text-ink-1 group-hover:text-primary transition-colors">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-4.5 text-ink-3">{description}</span>
        )}
      </div>
      <div
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
          checked ? "bg-primary" : "bg-border-2 group-hover:bg-border-3",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-primary",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        >
          {checked && <Check size={11} strokeWidth={3.5} />}
        </span>
      </div>
    </button>
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
  const [initialSettings, setInitialSettings] = useState<SettingsFormState | null>(null);
  const [initialPolicy, setInitialPolicy] = useState<PolicyFormState | null>(null);
  const [copiedId, setCopiedId] = useState(false);

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
      const response = await api.patch<{ logoUrl: string }>(
        `/workspaces/${workspaceId}/avatar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
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
        const sForm = settingsToForm(settingsRes.data);
        const pForm = policyToForm(policyRes.data);
        setSettingsForm(sForm);
        setPolicyForm(pForm);
        setInitialSettings(sForm);
        setInitialPolicy(pForm);
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

  const isDirty = useMemo(() => {
    if (!initialSettings || !initialPolicy || !settingsForm || !policyForm) return false;
    return (
      name.trim() !== workspaceName ||
      JSON.stringify(settingsForm) !== JSON.stringify(initialSettings) ||
      JSON.stringify(policyForm) !== JSON.stringify(initialPolicy)
    );
  }, [name, workspaceName, settingsForm, policyForm, initialSettings, initialPolicy]);

  const handleCopyId = () => {
    void navigator.clipboard.writeText(workspaceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleReset = () => {
    setName(workspaceName);
    if (initialSettings) setSettingsForm({ ...initialSettings });
    if (initialPolicy) setPolicyForm({ ...initialPolicy });
  };

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
          }),
        );
      }

      await Promise.all(patchPromises);

      setInitialSettings({ ...settingsForm });
      setInitialPolicy({ ...policyForm });

      if (name.trim() !== workspaceName && onWorkspaceUpdate) {
        onWorkspaceUpdate({ name: name.trim() });
      }

      toast.success(t("workspace.settingsSaved", { defaultValue: "Workspace settings saved" }));
    } catch (err) {
      toast.error(
        parseApiError(
          err,
          t("workspace.settingsSaveFailed", { defaultValue: "Could not save workspace settings" }),
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settingsForm || !policyForm) {
    return <SkeletonList count={4} />;
  }

  return (
    <form className="space-y-6 pb-20 animate-fade-in-up" onSubmit={save}>
      {/* ── 1. General Profile Card ────────────────────────────────────── */}
      <div className="card overflow-hidden p-6 border-border-1 bg-surface shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-border-1 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="text-section-title text-ink-1">
                {t("workspace.settingsInfo", { defaultValue: "Workspace settings" })}
              </h3>
              <p className="text-xs text-ink-3">
                {t("workspace.settingsInfoDesc", {
                  defaultValue: "Cấu hình tên, biểu tượng đại diện và nhận diện của workspace",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyId}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-caption font-medium rounded-full bg-surface-raised text-ink-3 hover:text-ink-1 border border-border-1 transition-colors"
          >
            {copiedId ? (
              <CheckCircle2 size={12} className="text-success" />
            ) : (
              <Copy size={12} />
            )}
            <span>ID: {workspaceId.slice(0, 8)}...</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <AvatarUpload
              src={logoSrc}
              name={name || workspaceName}
              size="xl"
              onUpload={handleLogoUpload}
              disabled={saving}
            />
            <span className="text-caption font-medium text-ink-3">Logo workspace</span>
          </div>

          <div className="flex-1 w-full space-y-2">
            <FormField label={t("workspace.workspaceName", { defaultValue: "Workspace name" })}>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("workspace.workspaceNamePlaceholder", {
                  defaultValue: "Enter workspace name",
                })}
              />
            </FormField>
            <p className="text-caption text-ink-4">
              Tên workspace xuất hiện trên tất cả báo cáo và thông báo tới các thành viên.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Event Defaults & Lifecycle Grid ───────────────────────────── */}
      <div className="card p-6 border-border-1 bg-surface shadow-2xs space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <QrCode size={18} />
          </div>
          <div>
            <h3 className="text-section-title text-ink-1">
              {t("workspace.defaults", { defaultValue: "Event defaults" })}
            </h3>
            <p className="text-xs text-ink-3">
              {t("workspace.defaultsDesc", {
                defaultValue: "Quy định lưu trữ dữ liệu, thời hạn QR và quyền xem mặc định",
              })}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            label={t("workspace.defaultRetentionDays", {
              defaultValue: "Default retention days",
            })}
          >
            <div className="relative flex items-center">
              <Input
                type="number"
                min={1}
                max={3650}
                className="pr-14"
                value={settingsForm.defaultRetentionDays}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, defaultRetentionDays: e.target.value })
                }
              />
              <span className="absolute right-3 text-caption font-semibold text-ink-3 pointer-events-none select-none">
                ngày
              </span>
            </div>
          </FormField>

          <FormField
            label={t("workspace.retentionDays", { defaultValue: "Policy retention days" })}
          >
            <div className="relative flex items-center">
              <Input
                type="number"
                min={1}
                max={3650}
                className="pr-14"
                value={policyForm.retentionDays}
                onChange={(e) => setPolicyForm({ ...policyForm, retentionDays: e.target.value })}
              />
              <span className="absolute right-3 text-caption font-semibold text-ink-3 pointer-events-none select-none">
                ngày
              </span>
            </div>
          </FormField>

          <FormField
            label={t("workspace.defaultQrTtlSeconds", { defaultValue: "QR TTL seconds" })}
          >
            <div className="relative flex items-center">
              <Input
                type="number"
                min={5}
                max={600}
                className="pr-14"
                value={settingsForm.defaultQrTtlSeconds}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, defaultQrTtlSeconds: e.target.value })
                }
              />
              <span className="absolute right-3 text-caption font-semibold text-ink-3 pointer-events-none select-none">
                giây
              </span>
            </div>
          </FormField>

          <FormField
            label={t("workspace.defaultOfflineGraceSeconds", {
              defaultValue: "Offline grace seconds",
            })}
          >
            <div className="relative flex items-center">
              <Input
                type="number"
                min={0}
                max={3600}
                className="pr-14"
                value={settingsForm.defaultOfflineGraceSeconds}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, defaultOfflineGraceSeconds: e.target.value })
                }
              />
              <span className="absolute right-3 text-caption font-semibold text-ink-3 pointer-events-none select-none">
                giây
              </span>
            </div>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-1">
          <FormField
            label={t("workspace.defaultEventVisibility", {
              defaultValue: "Default event visibility",
            })}
          >
            <div className="relative flex items-center">
              <Select
                value={settingsForm.defaultEventVisibility}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    defaultEventVisibility: e.target.value as EventVisibility,
                  })
                }
              >
                <option value="PRIVATE">
                  {t("workspace.visibility.private", { defaultValue: "Private" })}
                </option>
                <option value="WORKSPACE">
                  {t("workspace.visibility.workspace", { defaultValue: "Workspace" })}
                </option>
                <option value="PUBLIC_LINK">
                  {t("workspace.visibility.publicLink", { defaultValue: "Public link" })}
                </option>
              </Select>
            </div>
          </FormField>

          <FormField
            label={t("workspace.dataDeletionMode", { defaultValue: "Data deletion mode" })}
          >
            <Select
              value={policyForm.dataDeletionMode}
              onChange={(e) =>
                setPolicyForm({
                  ...policyForm,
                  dataDeletionMode: e.target.value as DataDeletionMode,
                })
              }
            >
              <option value="ANONYMIZE">
                {t("workspace.deletion.anonymize", { defaultValue: "Anonymize" })}
              </option>
              <option value="PURGE">
                {t("workspace.deletion.purge", { defaultValue: "Purge" })}
              </option>
            </Select>
          </FormField>
        </div>
      </div>

      {/* ── 3. Access Defaults & Role Policies Grid ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Access Defaults */}
        <div className="card p-6 border-border-1 bg-surface shadow-2xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Eye size={18} />
            </div>
            <div>
              <h3 className="text-section-title text-ink-1">
                {t("workspace.accessDefaults", { defaultValue: "Access defaults" })}
              </h3>
              <p className="text-xs text-ink-3">Quyền tham gia và xem sự kiện ban đầu</p>
            </div>
          </div>

          <div className="space-y-3">
            <ToggleRow
              title={t("workspace.allowPublicEventJoin", {
                defaultValue: "Allow public event join",
              })}
              description={t("workspace.allowPublicEventJoinDesc", {
                defaultValue:
                  "Allow attendees with a public link to join when an event allows it.",
              })}
              checked={settingsForm.allowPublicEventJoin}
              onChange={(allowPublicEventJoin) =>
                setSettingsForm({ ...settingsForm, allowPublicEventJoin })
              }
            />
            <ToggleRow
              title={t("workspace.requireEmailVerification", {
                defaultValue: "Require email verification",
              })}
              description={t("workspace.requireEmailVerificationDesc", {
                defaultValue: "Require verified email before sensitive attendee actions.",
              })}
              checked={settingsForm.requireEmailVerification}
              onChange={(requireEmailVerification) =>
                setSettingsForm({ ...settingsForm, requireEmailVerification })
              }
            />
            <ToggleRow
              title={t("workspace.allowMemberEventView", {
                defaultValue: "Members can view workspace events",
              })}
              description={t("workspace.allowMemberEventViewDesc", {
                defaultValue: "Let standard members see events they are allowed to access.",
              })}
              checked={settingsForm.allowMemberEventView}
              onChange={(allowMemberEventView) =>
                setSettingsForm({ ...settingsForm, allowMemberEventView })
              }
            />
            <ToggleRow
              title={t("workspace.allowViewerReports", {
                defaultValue: "Viewers can see reports",
              })}
              description={t("workspace.allowViewerReportsDesc", {
                defaultValue:
                  "Allow read-only roles to open reports when policy also permits it.",
              })}
              checked={settingsForm.allowViewerReports}
              onChange={(allowViewerReports) =>
                setSettingsForm({ ...settingsForm, allowViewerReports })
              }
            />
          </div>
        </div>

        {/* Right: Role Policy */}
        <div className="card p-6 border-border-1 bg-surface shadow-2xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-section-title text-ink-1">
                {t("workspace.rolePolicy", { defaultValue: "Role policy" })}
              </h3>
              <p className="text-xs text-ink-3">Quyền hạn của Thành viên và Event Manager</p>
            </div>
          </div>

          <div className="space-y-3">
            <ToggleRow
              title={t("workspace.memberCanCreateEvents", {
                defaultValue: "Members can create events",
              })}
              description={t("workspace.memberCanCreateEventsDesc", {
                defaultValue:
                  "Keep this off when only owners and admins should create events.",
              })}
              checked={policyForm.memberCanCreateEvents}
              onChange={(memberCanCreateEvents) =>
                setPolicyForm({ ...policyForm, memberCanCreateEvents })
              }
            />
            <ToggleRow
              title={t("workspace.eventManagerCanInviteScanner", {
                defaultValue: "Event managers can invite scanners",
              })}
              description={t("workspace.eventManagerCanInviteScannerDesc", {
                defaultValue: "Let event managers add scanner assignments for their event.",
              })}
              checked={policyForm.eventManagerCanInviteScanner}
              onChange={(eventManagerCanInviteScanner) =>
                setPolicyForm({ ...policyForm, eventManagerCanInviteScanner })
              }
            />
            <ToggleRow
              title={t("workspace.eventManagerCanExportReports", {
                defaultValue: "Event managers can export reports",
              })}
              description={t("workspace.eventManagerCanExportReportsDesc", {
                defaultValue: "Allow event managers to export operational event reports.",
              })}
              checked={policyForm.eventManagerCanExportReports}
              onChange={(eventManagerCanExportReports) =>
                setPolicyForm({ ...policyForm, eventManagerCanExportReports })
              }
            />
            <ToggleRow
              title={t("workspace.viewerCanExportReports", {
                defaultValue: "Viewers can export reports",
              })}
              description={t("workspace.viewerCanExportReportsDesc", {
                defaultValue: "Permit read-only report exports for viewer roles.",
              })}
              checked={policyForm.viewerCanExportReports}
              onChange={(viewerCanExportReports) =>
                setPolicyForm({ ...policyForm, viewerCanExportReports })
              }
            />
          </div>
        </div>
      </div>

      {/* ── 4. Operations & Audit Policy Card ────────────────────────────── */}
      <div className="card p-6 border-border-1 bg-surface shadow-2xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <LockKeyhole size={18} />
          </div>
          <div>
            <h3 className="text-section-title text-ink-1">
              {t("workspace.operationsPolicy", { defaultValue: "Operations policy" })}
            </h3>
            <p className="text-xs text-ink-3">
              Quy trình check-in, luồng duyệt sự kiện và bảo mật dữ liệu
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow
            title={t("workspace.scannerCanSeeAttendeeList", {
              defaultValue: "Scanners can see attendee list",
            })}
            description={t("workspace.scannerCanSeeAttendeeListDesc", {
              defaultValue: "Show attendee roster to scanner users during check-in.",
            })}
            checked={policyForm.scannerCanSeeAttendeeList}
            onChange={(scannerCanSeeAttendeeList) =>
              setPolicyForm({ ...policyForm, scannerCanSeeAttendeeList })
            }
          />
          <ToggleRow
            title={t("workspace.scannerCanManualCheckin", {
              defaultValue: "Scanners can manual check-in",
            })}
            description={t("workspace.scannerCanManualCheckinDesc", {
              defaultValue: "Allow scanner users to create manual check-ins when needed.",
            })}
            checked={policyForm.scannerCanManualCheckin}
            onChange={(scannerCanManualCheckin) =>
              setPolicyForm({ ...policyForm, scannerCanManualCheckin })
            }
          />
          <ToggleRow
            title={t("workspace.requireApprovalForEvents", {
              defaultValue: "Require approval for events",
            })}
            description={t("workspace.requireApprovalForEventsDesc", {
              defaultValue: "Place newly created events into an approval workflow.",
            })}
            checked={policyForm.requireApprovalForEvents}
            onChange={(requireApprovalForEvents) =>
              setPolicyForm({ ...policyForm, requireApprovalForEvents })
            }
          />
          <ToggleRow
            title={t("workspace.requireApprovalForImports", {
              defaultValue: "Require approval for imports",
            })}
            description={t("workspace.requireApprovalForImportsDesc", {
              defaultValue:
                "Require approval before large attendee or check-in imports are applied.",
            })}
            checked={policyForm.requireApprovalForImports}
            onChange={(requireApprovalForImports) =>
              setPolicyForm({ ...policyForm, requireApprovalForImports })
            }
          />
          <div className="sm:col-span-2">
            <ToggleRow
              title={t("workspace.requireReasonForManualEdit", {
                defaultValue: "Require reason for manual edits",
              })}
              description={t("workspace.requireReasonForManualEditDesc", {
                defaultValue: "Require an audit reason before manual attendance corrections.",
              })}
              checked={policyForm.requireReasonForManualEdit}
              onChange={(requireReasonForManualEdit) =>
                setPolicyForm({ ...policyForm, requireReasonForManualEdit })
              }
            />
          </div>
        </div>
      </div>

      {/* ── 5. Retention Posture Callout ─────────────────────────────────── */}
      <div className="rounded-xl bg-surface border border-primary-border/60 bg-primary-muted/30 p-6 flex items-start gap-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary mt-0.5">
          <Database size={16} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-1">
            {t("workspace.retentionNote", { defaultValue: "Retention posture" })}
          </p>
          <p className="text-body-sm text-ink-3 leading-relaxed">
            {t("workspace.retentionNoteDesc", {
              defaultValue:
                "Default retention is set to 30 days unless changed here. Anonymize keeps aggregate reporting usable; purge removes retained records when cleanup jobs are added.",
            })}
          </p>
        </div>
      </div>

      {/* ── 6. Sticky Save Action Bar ───────────────────────────────────── */}
      <div className="z-20 bg-surface/90  px-4 sm:px-6 py-3.5  transition-all duration-200 lg:pb-3.5 pb-16">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isDirty ? (
              <span className="flex items-center gap-2 text-caption font-semibold text-warning">
                <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                Có thay đổi chưa lưu
              </span>
            ) : (
              <span className="flex items-center gap-2 text-caption font-medium text-ink-4">
                <CheckCircle2 size={14} className="text-success" />
                Đã đồng bộ cài đặt
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleReset}
                disabled={saving}
              >
                Hủy thay đổi
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={saving}
              className="gap-2 px-5 font-semibold min-h-[38px]"
            >
              <Save size={14} />
              {t("workspace.saveSettings", { defaultValue: "Lưu cài đặt" })}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

