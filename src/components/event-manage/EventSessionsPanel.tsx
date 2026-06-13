import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Check, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/atoms/Button";
import { Badge } from "@/atoms/Badge";
import { EmptyState } from "@/atoms/EmptyState";
import { Input } from "@/atoms/Input";
import { Select } from "@/atoms/Select";
import { Textarea } from "@/atoms/Textarea";
import { SkeletonList } from "@/atoms/Skeleton";
import { Modal } from "@/molecules/Modal";
import { FormField } from "@/molecules/FormField";
import { useToast } from "@/molecules/Toast";
import { parseApiError } from "@/lib/parseApiError";

type SessionStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED";

interface EventSession {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  locationName?: string | null;
  capacity?: number | null;
  status: SessionStatus;
  isDefault?: boolean;
  checkinOpensAt?: string | null;
  checkinClosesAt?: string | null;
  boards?: Array<{ id: string; name: string }>;
  _count?: { checkins: number };
}

interface SessionFormState {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  capacity: string;
  status: SessionStatus;
  checkinOpensAt: string;
  checkinClosesAt: string;
}

interface EventSessionsPanelProps {
  eventId: string;
}

interface EventSessionMeta {
  customSessionsEnabled?: boolean;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function emptyForm(): SessionFormState {
  return {
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    locationName: "",
    capacity: "",
    status: "SCHEDULED",
    checkinOpensAt: "",
    checkinClosesAt: "",
  };
}

function formFromSession(session: EventSession): SessionFormState {
  return {
    title: session.title,
    description: session.description ?? "",
    startsAt: toDateTimeLocal(session.startsAt),
    endsAt: toDateTimeLocal(session.endsAt),
    locationName: session.locationName ?? "",
    capacity: session.capacity == null ? "" : String(session.capacity),
    status: session.status,
    checkinOpensAt: toDateTimeLocal(session.checkinOpensAt),
    checkinClosesAt: toDateTimeLocal(session.checkinClosesAt),
  };
}

function statusVariant(status: SessionStatus): "blue" | "green" | "gray" | "red" | "yellow" {
  switch (status) {
    case "OPEN":
      return "green";
    case "CLOSED":
      return "gray";
    case "CANCELLED":
      return "red";
    case "DRAFT":
      return "yellow";
    default:
      return "blue";
  }
}

export function EventSessionsPanel({ eventId }: EventSessionsPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [eventMeta, setEventMeta] = useState<EventSessionMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingCustom, setTogglingCustom] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EventSession | null>(null);
  const [form, setForm] = useState<SessionFormState>(() => emptyForm());

  const statusLabels = useMemo<Record<SessionStatus, string>>(
    () => ({
      DRAFT: t("eventManage.sessions.statusDraft", { defaultValue: "Draft" }),
      SCHEDULED: t("eventManage.sessions.statusScheduled", { defaultValue: "Scheduled" }),
      OPEN: t("eventManage.sessions.statusOpen", { defaultValue: "Open" }),
      CLOSED: t("eventManage.sessions.statusClosed", { defaultValue: "Closed" }),
      CANCELLED: t("eventManage.sessions.statusCancelled", { defaultValue: "Cancelled" }),
    }),
    [t],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [sessionsRes, eventRes] = await Promise.all([
        api.get<EventSession[]>(`/events/${eventId}/sessions`),
        api.get<EventSessionMeta>(`/events/${eventId}`),
      ]);
      setSessions(sessionsRes.data);
      setEventMeta(eventRes.data);
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomSessions = async (customSessionsEnabled: boolean) => {
    setTogglingCustom(true);
    try {
      await api.patch(`/events/${eventId}`, { customSessionsEnabled });
      setEventMeta((prev) => ({ ...prev, customSessionsEnabled }));
      toast.success(
        customSessionsEnabled
          ? t("eventManage.sessions.customEnabled", { defaultValue: "Custom sessions enabled." })
          : t("eventManage.sessions.customDisabled", { defaultValue: "Custom sessions disabled." }),
      );
    } catch (err) {
      toast.error(parseApiError(err, t("common.error")));
    } finally {
      setTogglingCustom(false);
    }
  };

  useEffect(() => {
    void load();
  }, [eventId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (session: EventSession) => {
    setEditing(session);
    setForm(formFromSession(session));
    setModalOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
        locationName: form.locationName.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        status: form.status,
        checkinOpensAt: toIso(form.checkinOpensAt),
        checkinClosesAt: toIso(form.checkinClosesAt),
      };

      if (editing) {
        await api.patch(`/events/${eventId}/sessions/${editing.id}`, payload);
        toast.success(
          t("eventManage.sessions.updateSuccess", { defaultValue: "Session updated." }),
        );
      } else {
        await api.post(`/events/${eventId}/sessions`, payload);
        toast.success(
          t("eventManage.sessions.createSuccess", { defaultValue: "Session created." }),
        );
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(parseApiError(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonList count={3} />;
  }

  const defaultSession = sessions.find((session) => session.isDefault);
  const customSessions = sessions.filter((session) => !session.isDefault);
  const customSessionsEnabled = Boolean(eventMeta?.customSessionsEnabled);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div
        className={[
          "card px-4 py-3 transition-[background-color,border-color,opacity]",
          customSessionsEnabled ? "bg-surface-raised opacity-70" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={[
                  "text-sm font-semibold",
                  customSessionsEnabled ? "text-ink-3" : "text-ink-1",
                ].join(" ")}
              >
                {t("eventManage.sessions.defaultTitle", { defaultValue: "Full event session" })}
              </p>
              <Badge variant={customSessionsEnabled ? "gray" : "blue"}>
                {customSessionsEnabled
                  ? t("eventManage.sessions.defaultDisabled", { defaultValue: "Disabled" })
                  : t("eventManage.sessions.defaultBadge", { defaultValue: "Default" })}
              </Badge>
            </div>
            <p className="text-xs text-ink-3 mt-1">
              {defaultSession
                ? `${new Date(defaultSession.startsAt).toLocaleString()} - ${new Date(defaultSession.endsAt).toLocaleString()}`
                : t("eventManage.sessions.defaultPending", {
                    defaultValue: "The full-event session is managed by the event schedule.",
                  })}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3 border-b border-border-1 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={togglingCustom}
            onClick={() => void toggleCustomSessions(!customSessionsEnabled)}
            className="flex min-w-0 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-[background-color,border-color,color]",
                customSessionsEnabled
                  ? "border-primary bg-primary text-white"
                  : "border-border-2 bg-surface text-transparent",
              ].join(" ")}
              aria-hidden="true"
            >
              <Check size={13} strokeWidth={3.25} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-1">
                {t("eventManage.sessions.customToggle", { defaultValue: "Use custom sessions" })}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-ink-3">
                {t("eventManage.sessions.customToggleDesc", {
                  defaultValue: "Split this event into shifts or time blocks.",
                })}
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {customSessionsEnabled && (
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus size={15} />
                {t("eventManage.sessions.add", { defaultValue: "Add session" })}
              </Button>
            )}
          </div>
        </div>

        {!customSessionsEnabled ? (
          <EmptyState
            title={t("eventManage.sessions.simpleTitle", {
              defaultValue: "Using the full event schedule",
            })}
            description={t("eventManage.sessions.simpleDesc", {
              defaultValue:
                "Turn on custom sessions only when this event needs separate shifts or time blocks.",
            })}
            icon={<CalendarClock size={24} />}
            className="py-8"
          />
        ) : customSessions.length === 0 ? (
          <EmptyState
            title={t("eventManage.sessions.emptyTitle", { defaultValue: "No sessions yet" })}
            description={t("eventManage.sessions.emptyDesc", {
              defaultValue:
                "Create sessions when this event has multiple time blocks or check-in windows.",
            })}
            icon={<CalendarClock size={24} />}
            className="py-8"
            action={
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus size={15} />
                {t("eventManage.sessions.add", { defaultValue: "Add session" })}
              </Button>
            }
          />
        ) : (
          <>
            {customSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 px-4 py-3 border-b border-border-1 last:border-b-0 sm:flex-row sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-1 truncate">{session.title}</p>
                    <Badge variant={statusVariant(session.status)}>
                      {statusLabels[session.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-3 mt-1">
                    {new Date(session.startsAt).toLocaleString()} -{" "}
                    {new Date(session.endsAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {session.locationName ||
                      t("eventManage.sessions.noLocation", { defaultValue: "No location" })}
                    {session.capacity ? ` - ${session.capacity}` : ""}
                    {` - ${session._count?.checkins ?? 0} ${t("eventManage.sessions.checkins", { defaultValue: "check-ins" })}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(session)}>
                  <Pencil size={14} />
                  {t("common.edit")}
                </Button>
              </div>
            ))}
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={
          editing
            ? t("eventManage.sessions.editTitle", { defaultValue: "Edit session" })
            : t("eventManage.sessions.createTitle", { defaultValue: "Create session" })
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="event-session-form"
              isLoading={saving}
              disabled={!form.title || !form.startsAt || !form.endsAt}
            >
              {t("common.save")}
            </Button>
          </>
        }
      >
        <form id="event-session-form" className="space-y-3" onSubmit={submit}>
          <FormField
            label={t("eventManage.sessions.title", { defaultValue: "Session title" })}
            required
          >
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </FormField>
          <FormField label={t("eventManage.sessions.description", { defaultValue: "Description" })}>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label={t("eventManage.sessions.startsAt", { defaultValue: "Starts at" })}
              required
            >
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </FormField>
            <FormField
              label={t("eventManage.sessions.endsAt", { defaultValue: "Ends at" })}
              required
            >
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label={t("eventManage.sessions.status", { defaultValue: "Status" })}>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as SessionStatus })}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t("eventManage.sessions.capacity", { defaultValue: "Capacity" })}>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </FormField>
            <FormField label={t("event.location")}>
              <Input
                value={form.locationName}
                onChange={(e) => setForm({ ...form, locationName: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label={t("eventManage.sessions.checkinOpensAt", { defaultValue: "Check-in opens" })}
            >
              <Input
                type="datetime-local"
                value={form.checkinOpensAt}
                onChange={(e) => setForm({ ...form, checkinOpensAt: e.target.value })}
              />
            </FormField>
            <FormField
              label={t("eventManage.sessions.checkinClosesAt", { defaultValue: "Check-in closes" })}
            >
              <Input
                type="datetime-local"
                value={form.checkinClosesAt}
                onChange={(e) => setForm({ ...form, checkinClosesAt: e.target.value })}
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
