/* ═══════════════════════════════════════════════════════════════
   EventSettingsPanel — consolidated settings tab.
   Groups: Event Info | Sessions (collapsible) |
           Check-in Settings (collapsible) |
           Assignments (collapsible) | Danger Zone
   ═══════════════════════════════════════════════════════════════ */

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Info,
  CalendarClock,
  SlidersHorizontal,
  Users,
  TriangleAlert,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/parseApiError";
import { useToast } from "@/molecules/Toast";
import { CollapsibleSection } from "@/molecules/CollapsibleSection";
import { Modal } from "@/molecules/Modal";
import { FormField } from "@/molecules/FormField";
import { Button } from "@/atoms/Button";
import { Input } from "@/atoms/Input";
import { Select } from "@/atoms/Select";
import { Badge } from "@/atoms/Badge";
import { EmptyState } from "@/atoms/EmptyState";
import { EventCheckinSettingsPanel } from "./EventCheckinSettingsPanel";
import { EventSessionsPanel } from "./EventSessionsPanel";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string;
  userId: string;
  role: "SCANNER" | "MANAGER";
  boardId?: string | null;
  user: { name: string; email: string };
  board?: { name: string } | null;
}

interface WsMember {
  userId: string;
  name: string;
  email: string;
}

interface EventSettingsPanelProps {
  eventId: string;
  workspaceId: string;
  /** Current editable event fields */
  title: string;
  date: string;
  startTime: string;
  location: string;
  assignments: Assignment[];
  wsMembers: WsMember[];
  /** Called when event info is saved (so parent can update state) */
  onEventInfoSaved: (data: {
    title: string;
    date: string;
    startTime: string;
    location: string;
  }) => void;
  /** Called when cancel event succeeds */
  onEventCancelled: () => void;
  /** Called when assignments change */
  onAssignmentsChanged: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function EventSettingsPanel({
  eventId,
  title,
  date,
  startTime,
  location,
  assignments,
  wsMembers,
  onEventInfoSaved,
  onEventCancelled,
  onAssignmentsChanged,
}: EventSettingsPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();

  // Event info form
  const [editTitle, setEditTitle] = useState(title);
  const [editDate, setEditDate] = useState(date);
  const [editStartTime, setEditStartTime] = useState(startTime);
  const [editLocation, setEditLocation] = useState(location);
  const [isSaving, setIsSaving] = useState(false);

  // Assignment modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState<"SCANNER" | "MANAGER">("SCANNER");
  const [isAssigning, setIsAssigning] = useState(false);

  // Cancel event modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // ── Event info save ────────────────────────────────────────────
  const saveEventInfo = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/events/${eventId}`, {
        title: editTitle,
        date: editDate,
        startTime: editStartTime,
        location: editLocation,
      });
      onEventInfoSaved({
        title: editTitle,
        date: editDate,
        startTime: editStartTime,
        location: editLocation,
      });
      toast.success(t("event.updateSuccess"));
    } catch (err) {
      toast.error(parseApiError(err, t("event.updateFailed")));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Assignment actions ─────────────────────────────────────────
  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignUserId) return;
    setIsAssigning(true);
    try {
      await api.post(`/events/${eventId}/assignments`, {
        userId: assignUserId,
        role: assignRole,
      });
      toast.success(t("manage.assignSuccess"));
      setAssignOpen(false);
      setAssignUserId("");
      onAssignmentsChanged();
    } catch (err) {
      toast.error(parseApiError(err, t("manage.assignFailed")));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    try {
      await api.delete(`/events/${eventId}/assignments/${userId}`);
      toast.success(t("manage.removeAssignment"));
      onAssignmentsChanged();
    } catch (err) {
      toast.error(parseApiError(err, t("common.error")));
    }
  };

  // ── Cancel event ──────────────────────────────────────────────
  const doCancelEvent = async () => {
    setIsCancelling(true);
    try {
      await api.patch(`/events/${eventId}`, { status: "CANCELLED" });
      toast.success(t("manage.cancelSuccess"));
      setCancelOpen(false);
      onEventCancelled();
    } catch (err) {
      toast.error(parseApiError(err, t("common.error")));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* ── 1. Event Info — always open ──────────────────────────── */}
      <CollapsibleSection
        title={t("manage.settingsTitle")}
        icon={<Info size={15} />}
        defaultOpen={true}
      >
        <div className="space-y-3">
          <FormField label={t("event.title")} required>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("event.date")} required>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </FormField>
            <FormField label={t("event.startTime")} required>
              <Input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label={t("event.location")}>
            <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
          </FormField>
          <div className="flex justify-end">
            <Button variant="primary" isLoading={isSaving} onClick={saveEventInfo}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 2. Sessions ─────────────────────────────────────────── */}
      <CollapsibleSection
        title={t("eventManage.sessions.tab")}
        icon={<CalendarClock size={15} />}
        defaultOpen={false}
      >
        <EventSessionsPanel eventId={eventId} />
      </CollapsibleSection>

      {/* ── 3. Check-in Settings ────────────────────────────────── */}
      <CollapsibleSection
        title={t("eventManage.checkinSettings.tab")}
        icon={<SlidersHorizontal size={15} />}
        defaultOpen={false}
      >
        <EventCheckinSettingsPanel eventId={eventId} />
      </CollapsibleSection>

      {/* ── 4. Assignments ──────────────────────────────────────── */}
      <CollapsibleSection
        title={t("manage.assignments")}
        icon={<Users size={15} />}
        defaultOpen={false}
        badge={
          assignments.length > 0 ? <Badge variant="blue">{assignments.length}</Badge> : undefined
        }
        headerAction={
          <Button variant="default" size="sm" onClick={() => setAssignOpen(true)}>
            <Plus size={14} />
            {t("manage.addAssignment")}
          </Button>
        }
      >
        {assignments.length === 0 ? (
          <EmptyState
            title={t("manage.noAssignments")}
            description={t("manage.noAssignmentsDesc")}
            icon={<Users size={20} />}
            action={
              <Button variant="primary" size="sm" onClick={() => setAssignOpen(true)}>
                <Plus size={14} />
                {t("manage.addAssignment")}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2 border-b border-border-1 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-1 truncate">{a.user.name}</p>
                  <p className="text-xs text-ink-4 truncate">{a.user.email}</p>
                  {a.board && (
                    <p className="text-xs text-ink-3 mt-0.5">
                      {t("manage.boardLabel")} {a.board.name}
                    </p>
                  )}
                </div>
                <Badge variant={a.role === "MANAGER" ? "yellow" : "blue"}>
                  {a.role === "MANAGER" ? t("manage.manager") : t("manage.scanner")}
                </Badge>
                <button
                  type="button"
                  className="btn-icon text-danger shrink-0"
                  onClick={() => void handleRemoveAssignment(a.userId)}
                  aria-label={t("manage.removeAssignment")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ── 5. Danger Zone ──────────────────────────────────────── */}
      <div className={cn("card p-4 space-y-3 border border-danger/30 bg-danger/4")}>
        <div className="flex items-center gap-2">
          <TriangleAlert size={15} className="text-danger shrink-0" />
          <p className="text-sm font-semibold text-danger">{t("manage.dangerZone")}</p>
        </div>
        <p className="text-sm text-ink-3">{t("manage.cancelWarning")}</p>
        <Button variant="danger" onClick={() => setCancelOpen(true)}>
          {t("manage.cancelEvent")}
        </Button>
      </div>

      {/* ── Add Assignment Modal ─────────────────────────────────── */}
      <Modal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title={t("manage.addAssignment")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setAssignOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="assign-form"
              isLoading={isAssigning}
              disabled={!assignUserId}
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <form id="assign-form" onSubmit={(e) => void handleAssign(e)} className="space-y-3">
          <FormField label={t("manage.selectMember")} htmlFor="assign-user">
            <Select
              id="assign-user"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            >
              <option value="">{t("manage.selectMemberPlaceholder")}</option>
              {wsMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.email})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("manage.role")} htmlFor="assign-role">
            <Select
              id="assign-role"
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as "SCANNER" | "MANAGER")}
            >
              <option value="SCANNER">{t("manage.scanner")}</option>
              <option value="MANAGER">{t("manage.manager")}</option>
            </Select>
          </FormField>
        </form>
      </Modal>

      {/* ── Cancel Confirmation Modal ────────────────────────────── */}
      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("manage.cancelEvent")}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="default" onClick={() => setCancelOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" isLoading={isCancelling} onClick={() => void doCancelEvent()}>
              {t("manage.cancelEvent")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-2">{t("manage.cancelWarning")}</p>
      </Modal>
    </div>
  );
}
