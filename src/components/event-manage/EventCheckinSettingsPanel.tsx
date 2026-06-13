import { useEffect, useMemo, useState, type FormEvent } from "react";
import { SlidersHorizontal } from "lucide-react";
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

type AttendancePolicy = "SINGLE_IN" | "IN_OUT" | "BOARD_REQUIREMENTS";
type CheckinMode = "ATTENDEE_CREDENTIAL" | "BOARD_QR";
type EventQrBehavior = "JOIN_ONLY" | "JOIN_AND_CHECKIN";

interface EventSettings {
  attendancePolicy: AttendancePolicy;
  requiredBoardCount?: number | null;
  checkinModes: CheckinMode[];
  eventQrBehavior: EventQrBehavior;
  qrTtlSeconds: number;
  credentialGraceSeconds: number;
  offlineSyncEnabled: boolean;
  geofenceEnabled: boolean;
  geofenceRadiusMeters?: number | null;
  manualCheckinEnabled: boolean;
  manualCorrectionEnabled: boolean;
  requireCorrectionReason: boolean;
  certificateEnabled: boolean;
  attendanceProofEnabled: boolean;
}

interface SettingsFormState {
  attendancePolicy: AttendancePolicy;
  requiredBoardCount: string;
  checkinModes: CheckinMode[];
  eventQrBehavior: EventQrBehavior;
  qrTtlSeconds: string;
  credentialGraceSeconds: string;
  offlineSyncEnabled: boolean;
  geofenceEnabled: boolean;
  geofenceRadiusMeters: string;
  manualCheckinEnabled: boolean;
  manualCorrectionEnabled: boolean;
  requireCorrectionReason: boolean;
  certificateEnabled: boolean;
  attendanceProofEnabled: boolean;
}

interface EventCheckinSettingsPanelProps {
  eventId: string;
}


function formFromSettings(settings: EventSettings): SettingsFormState {
  return {
    attendancePolicy: settings.attendancePolicy,
    requiredBoardCount: settings.requiredBoardCount == null ? "" : String(settings.requiredBoardCount),
    checkinModes: settings.checkinModes ?? ["ATTENDEE_CREDENTIAL", "BOARD_QR"],
    eventQrBehavior: settings.eventQrBehavior,
    qrTtlSeconds: String(settings.qrTtlSeconds ?? 30),
    credentialGraceSeconds: String(settings.credentialGraceSeconds ?? 120),
    offlineSyncEnabled: Boolean(settings.offlineSyncEnabled),
    geofenceEnabled: Boolean(settings.geofenceEnabled),
    geofenceRadiusMeters: settings.geofenceRadiusMeters == null ? "" : String(settings.geofenceRadiusMeters),
    manualCheckinEnabled: Boolean(settings.manualCheckinEnabled),
    manualCorrectionEnabled: Boolean(settings.manualCorrectionEnabled),
    requireCorrectionReason: Boolean(settings.requireCorrectionReason),
    certificateEnabled: Boolean(settings.certificateEnabled),
    attendanceProofEnabled: Boolean(settings.attendanceProofEnabled),
  };
}

function numberOrUndefined(value: string) {
  return value.trim() ? Number(value) : undefined;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <CheckboxCard label={label} description={description} checked={checked} onChange={onChange} />
  );
}

export function EventCheckinSettingsPanel({ eventId }: EventCheckinSettingsPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsFormState | null>(null);

  const attendanceLabels = useMemo<Record<AttendancePolicy, string>>(
    () => ({
      SINGLE_IN: t("event.singleIn"),
      IN_OUT: t("event.inOut"),
      BOARD_REQUIREMENTS: t("event.boardRequirements"),
    }),
    [t],
  );

  const modeLabels = useMemo<Record<CheckinMode, string>>(
    () => ({
      ATTENDEE_CREDENTIAL: t("event.scannerScanQr"),
      BOARD_QR: t("event.attendeeScanBoard"),
    }),
    [t],
  );

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<EventSettings>(`/events/${eventId}/settings`);
      setForm(formFromSettings(data));
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [eventId]);

  const updateMode = (mode: CheckinMode, checked: boolean) => {
    if (!form) return;
    const next = checked
      ? Array.from(new Set([...form.checkinModes, mode]))
      : form.checkinModes.filter((m) => m !== mode);
    setForm({ ...form, checkinModes: next.length > 0 ? next : form.checkinModes });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await api.patch(`/events/${eventId}/settings`, {
        attendancePolicy: form.attendancePolicy,
        requiredBoardCount:
          form.attendancePolicy === "BOARD_REQUIREMENTS"
            ? numberOrUndefined(form.requiredBoardCount)
            : undefined,
        checkinModes: form.checkinModes,
        eventQrBehavior: form.eventQrBehavior,
        qrTtlSeconds: numberOrUndefined(form.qrTtlSeconds),
        credentialGraceSeconds: numberOrUndefined(form.credentialGraceSeconds),
        offlineSyncEnabled: form.offlineSyncEnabled,
        geofenceEnabled: form.geofenceEnabled,
        geofenceRadiusMeters: form.geofenceEnabled ? numberOrUndefined(form.geofenceRadiusMeters) : undefined,
        manualCheckinEnabled: form.manualCheckinEnabled,
        manualCorrectionEnabled: form.manualCorrectionEnabled,
        requireCorrectionReason: form.requireCorrectionReason,
        certificateEnabled: form.certificateEnabled,
        attendanceProofEnabled: form.attendanceProofEnabled,
      });
      toast.success(t("eventManage.checkinSettings.saveSuccess", { defaultValue: "Check-in settings saved." }));
      await load();
    } catch (err) {
      toast.error(parseApiError(err, t("event.updateFailed")));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <SkeletonList count={4} />;
  }

  return (
    <form className="space-y-4 animate-fade-in-up" onSubmit={submit}>
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={17} className="text-primary" />
          <p className="text-section-title text-ink-1">
            {t("eventManage.checkinSettings.attendanceRules", { defaultValue: "Attendance rules" })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("event.attendancePolicy")}>
            <Select
              value={form.attendancePolicy}
              onChange={(e) => setForm({ ...form, attendancePolicy: e.target.value as AttendancePolicy })}
            >
              {Object.entries(attendanceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          {form.attendancePolicy === "BOARD_REQUIREMENTS" && (
            <FormField label={t("event.requiredBoardCount")}>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.requiredBoardCount}
                onChange={(e) => setForm({ ...form, requiredBoardCount: e.target.value })}
              />
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["ATTENDEE_CREDENTIAL", "BOARD_QR"] as CheckinMode[]).map((mode) => (
            <ToggleRow
              key={mode}
              label={modeLabels[mode]}
              checked={form.checkinModes.includes(mode)}
              onChange={(checked) => updateMode(mode, checked)}
            />
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <p className="text-section-title text-ink-1">
          {t("eventManage.checkinSettings.qrAndLocation", { defaultValue: "QR and location" })}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("event.qrBehavior")}>
            <Select
              value={form.eventQrBehavior}
              onChange={(e) => setForm({ ...form, eventQrBehavior: e.target.value as EventQrBehavior })}
            >
              <option value="JOIN_ONLY">{t("event.joinOnly")}</option>
              <option value="JOIN_AND_CHECKIN">{t("event.joinAndCheckin")}</option>
            </Select>
          </FormField>
          <FormField label={t("eventManage.checkinSettings.qrTtl", { defaultValue: "QR TTL (seconds)" })}>
            <Input
              type="number"
              min={5}
              max={600}
              value={form.qrTtlSeconds}
              onChange={(e) => setForm({ ...form, qrTtlSeconds: e.target.value })}
            />
          </FormField>
          <FormField label={t("eventManage.checkinSettings.grace", { defaultValue: "Grace (seconds)" })}>
            <Input
              type="number"
              min={0}
              max={3600}
              value={form.credentialGraceSeconds}
              onChange={(e) => setForm({ ...form, credentialGraceSeconds: e.target.value })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToggleRow
            label={t("eventManage.checkinSettings.offlineSync", { defaultValue: "Offline sync" })}
            checked={form.offlineSyncEnabled}
            onChange={(checked) => setForm({ ...form, offlineSyncEnabled: checked })}
          />
          <ToggleRow
            label={t("eventManage.checkinSettings.geofence", { defaultValue: "Geofence required" })}
            checked={form.geofenceEnabled}
            onChange={(checked) => setForm({ ...form, geofenceEnabled: checked })}
          />
        </div>

        {form.geofenceEnabled && (
          <FormField label={t("eventManage.checkinSettings.geofenceRadius", { defaultValue: "Geofence radius (meters)" })}>
            <Input
              type="number"
              min={10}
              max={10000}
              value={form.geofenceRadiusMeters}
              onChange={(e) => setForm({ ...form, geofenceRadiusMeters: e.target.value })}
            />
          </FormField>
        )}
      </div>

      <div className="card p-4 space-y-4">
        <p className="text-section-title text-ink-1">
          {t("eventManage.checkinSettings.operatorTools", { defaultValue: "Operator tools" })}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToggleRow
            label={t("eventManage.checkinSettings.manualCheckin", { defaultValue: "Manual check-in" })}
            checked={form.manualCheckinEnabled}
            onChange={(checked) => setForm({ ...form, manualCheckinEnabled: checked })}
          />
          <ToggleRow
            label={t("eventManage.checkinSettings.manualCorrection", { defaultValue: "Manual correction" })}
            checked={form.manualCorrectionEnabled}
            onChange={(checked) => setForm({ ...form, manualCorrectionEnabled: checked })}
          />
          <ToggleRow
            label={t("eventManage.checkinSettings.correctionReason", { defaultValue: "Require correction reason" })}
            checked={form.requireCorrectionReason}
            onChange={(checked) => setForm({ ...form, requireCorrectionReason: checked })}
          />
          <ToggleRow
            label={t("eventManage.checkinSettings.attendanceProof", { defaultValue: "Attendance proof" })}
            checked={form.attendanceProofEnabled}
            onChange={(checked) => setForm({ ...form, attendanceProofEnabled: checked })}
          />
          <ToggleRow
            label={t("eventManage.checkinSettings.certificate", { defaultValue: "Certificates" })}
            checked={form.certificateEnabled}
            onChange={(checked) => setForm({ ...form, certificateEnabled: checked })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" type="submit" isLoading={saving}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
