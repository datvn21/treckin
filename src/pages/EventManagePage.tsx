/* ═══════════════════════════════════════════════════════════════
   EventManagePage — /app/events/:id/manage
   Manager view: stats overview, board assignments, settings.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ScanQrCode, Users, CheckSquare, Percent, LayoutGrid,
  Plus, Trash2, ExternalLink, Settings, ClipboardList, X,
  CalendarClock, SlidersHorizontal,
} from "lucide-react";
import { EventCheckinSettingsPanel } from "@/components/event-manage/EventCheckinSettingsPanel";
import { EventSessionsPanel } from "@/components/event-manage/EventSessionsPanel";
import { api } from "@/lib/api";
import { useToast } from "@/molecules/Toast";
import { Modal } from "@/molecules/Modal";
import { FormField } from "@/molecules/FormField";
import { PageHeader } from "@/organisms/PageHeader";
import { StatCard } from "@/molecules/StatCard";
import { Button } from "@/atoms";
import { Badge } from "@/atoms/Badge";
import { Input } from "@/atoms/Input";
import { Select } from "@/atoms/Select";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface EventDetail {
  id: string;
  title: string;
  status: string;
  date: string;
  startTime: string;
  location: string;
  workspaceId: string;
  attendancePolicy: string;
  requiredBoardCount?: number | null;
  boards?: Array<{ id: string; name: string; checkinCount?: number }>;
  assignments?: Assignment[];
  _count?: { checkins: number; registrations: number };
}

interface WsMember {
  id?: string;
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER";
  user?: { id: string; name: string; email: string };
}

interface Assignment {
  id: string;
  userId: string;
  role: "SCANNER" | "MANAGER";
  boardId?: string | null;
  user: { name: string; email: string };
  board?: { name: string } | null;
}

interface EventStats {
  totalRegistrations: number;
  checkedIn: number;
  boards?: { id: string; name: string; checkins: number }[];
}

interface ApiWorkspaceMember {
  id: string;
  role: "OWNER" | "MEMBER";
  user?: { id: string; name: string; email: string };
}

function parseApiError(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const e = err as { response?: { data?: { message?: string | string[] } } };
    const msg = e.response?.data?.message;
    return Array.isArray(msg) ? msg.join(" ") : msg ?? fallback;
  }
  return fallback;
}

function statusVariant(s: string): "green" | "blue" | "gray" | "red" {
  switch (s?.toUpperCase()) {
    case "ONGOING":   return "green";
    case "COMPLETED": return "gray";
    case "CANCELLED": return "red";
    default:          return "blue";
  }
}

type Tab = "overview" | "sessions" | "checkinSettings" | "assignments" | "settings";

// ── Component ────────────────────────────────────────────────────────────────
export function EventManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  // statusLabel uses t() so it lives inside the component
  function statusLabel(s: string): string {
    const map: Record<string, string> = {
      ONGOING:   t("manage.status.active"),
      PUBLISHED: t("manage.status.upcoming"),
      DRAFT:     t("manage.status.upcoming"),
      COMPLETED: t("manage.status.completed"),
      CANCELLED: t("manage.status.cancelled"),
    };
    return map[s?.toUpperCase()] ?? s;
  }

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [wsMembers, setWsMembers] = useState<WsMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Assignment modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState<"SCANNER" | "MANAGER">("SCANNER");
  const [assigning, setAssigning] = useState(false);

  // Cancel confirmation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Settings edit state
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const evRes = await api.get<EventDetail>(`/events/${id}`);
      const nextEvent = evRes.data;
      setEvent(nextEvent);
      setStats({
        totalRegistrations: nextEvent._count?.registrations ?? 0,
        checkedIn: nextEvent._count?.checkins ?? 0,
        boards: nextEvent.boards?.map((board) => ({
          id: board.id,
          name: board.name,
          checkins: board.checkinCount ?? 0,
        })) ?? [],
      });
      setAssignments(nextEvent.assignments ?? []);

      // Load workspace members for assignment
      if (nextEvent.workspaceId) {
        const wsRes = await api.get<ApiWorkspaceMember[]>(
          `/workspaces/${nextEvent.workspaceId}/members`
        ).catch(() => ({ data: [] }));
        setWsMembers(
          wsRes.data
            .filter((member) => member.user)
            .map((member) => ({
              id: member.id,
              userId: member.user!.id,
              name: member.user!.name,
              email: member.user!.email,
              role: member.role,
            }))
        );
      }
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useEffect(() => { void load(); }, [load]);

  // Sync settings edit fields from loaded event
  useEffect(() => {
    if (event) {
      setEditTitle(event.title);
      setEditDate(event.date);
      setEditStartTime(event.startTime);
      setEditLocation(event.location);
    }
  }, [event]);

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignUserId) return;
    setAssigning(true);
    try {
      await api.post(`/events/${id}/assignments`, {
        userId: assignUserId,
        role: assignRole,
      });
      toast.success(t("manage.assignSuccess"));
      setAssignOpen(false);
      setAssignUserId("");
      void load();
    } catch (err) {
      toast.error(parseApiError(err, t("manage.assignFailed")));
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    try {
      await api.delete(`/events/${id}/assignments/${userId}`);
      toast.success(t("manage.removeAssignment"));
      void load();
    } catch (err) {
      toast.error(parseApiError(err, t("common.error")));
    }
  };

  // Extracted cancel logic (called from modal confirm)
  const doCancelEvent = async () => {
    setIsCancelling(true);
    try {
      await api.patch(`/events/${id}`, { status: "CANCELLED" });
      toast.success(t("manage.cancelSuccess"));
      void load();
    } catch (err) {
      toast.error(parseApiError(err, t("common.error")));
    } finally {
      setIsCancelling(false);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await api.patch(`/events/${id}`, {
        title: editTitle,
        date: editDate,
        startTime: editStartTime,
        location: editLocation,
      });
      setEvent((prev) =>
        prev ? { ...prev, title: editTitle, date: editDate, startTime: editStartTime, location: editLocation } : prev
      );
      toast.success(t("event.updateSuccess"));
    } catch (err) {
      toast.error(parseApiError(err, t("event.updateFailed")));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ── Computed values ────────────────────────────────────────────
  const totalReg = stats?.totalRegistrations ?? event?._count?.registrations ?? 0;
  const checkedIn = stats?.checkedIn ?? event?._count?.checkins ?? 0;
  const rate = totalReg > 0 ? Math.round((checkedIn / totalReg) * 100) : 0;
  const boardCount = stats?.boards?.length ?? event?.boards?.length ?? 0;

  if (loading) {
    const closePath = event?.workspaceId ? `/app/workspaces/${event.workspaceId}` : "/app/workspaces";
    return (
      <div>
        <div className="mb-4 w-full flex justify-end">
          <button
            type="button"
            onClick={() => navigate(closePath)}
            aria-label={t("common.close")}
            className="z-10 flex items-center justify-center w-8 h-8 rounded-full border border-border-1 text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 shrink-0"
          >
            <X size={15} />
          </button>
        </div>
        <PageHeader title="" />
        <SkeletonList count={5} />
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <div className="mb-4 w-full flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/app/workspaces")}
            aria-label={t("common.close")}
            className="z-10 flex items-center justify-center w-8 h-8 rounded-full border border-border-1 text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 shrink-0"
          >
            <X size={15} />
          </button>
        </div>
        <PageHeader title={t("manage.title")} />
        <EmptyState title={t("manage.eventNotFound")} />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview",          label: t("manage.overview"), icon: <ClipboardList size={14} /> },
    { key: "sessions",          label: t("eventManage.sessions.tab", { defaultValue: "Sessions" }), icon: <CalendarClock size={14} /> },
    { key: "checkinSettings",   label: t("eventManage.checkinSettings.tab", { defaultValue: "Check-in" }), icon: <SlidersHorizontal size={14} /> },
    { key: "assignments",       label: t("manage.assignments"), icon: <Users size={14} /> },
    { key: "settings",          label: t("manage.settings"), icon: <Settings size={14} /> },
  ];

  const closePath = event.workspaceId ? `/app/workspaces/${event.workspaceId}` : "/app/workspaces";

  return (
    <div>
      <div className="mb-4 w-full flex justify-end">
        <button
          type="button"
          onClick={() => navigate(closePath)}
          aria-label={t("common.close")}
          className="z-10 flex items-center justify-center w-8 h-8 rounded-full border border-border-1 text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 shrink-0"
        >
          <X size={15} />
        </button>
      </div>

      <PageHeader
        title={event.title}
        subtitle={t("manage.title")}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(event.status)}>{statusLabel(event.status)}</Badge>
            <button
              type="button"
              className="btn-icon"
              onClick={() => navigate(`/app/events/${id}`)}
              aria-label={t("manage.viewAsAttendee")}
              title={t("manage.viewAsAttendee")}
            >
              <ExternalLink size={16} />
            </button>
            {event.status === "ONGOING" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const firstBoardId = event.boards?.[0]?.id || stats?.boards?.[0]?.id;
                  if (firstBoardId) {
                    navigate(`/staff/scanner/${id}/${firstBoardId}`);
                  } else {
                    toast.error(t("manage.noBoards"));
                  }
                }}
              >
                <ScanQrCode size={14} />
                {t("event.openScanner")}
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="tab-list mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={cn("tab-item gap-1", activeTab === tab.key && "active")}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t("manage.totalRegistrations")}
              value={totalReg}
              icon={<Users size={16} />}
            />
            <StatCard
              label={t("manage.checkedIn")}
              value={checkedIn}
              icon={<CheckSquare size={16} />}
            />
            <StatCard
              label={t("manage.checkinRate")}
              value={`${rate}%`}
              icon={<Percent size={16} />}
            />
            <StatCard
              label={t("manage.boardCount")}
              value={boardCount}
              icon={<LayoutGrid size={16} />}
            />
          </div>

          {/* Board breakdown */}
          {stats?.boards && stats.boards.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-border-1">
                <p className="text-section-title text-ink-1">{t("manage.checkinsPerBoard")}</p>
              </div>
              {stats.boards.map((board) => (
                <div key={board.id} className="flex items-center gap-3 px-4 py-3 border-b border-border-1 last:border-b-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-1">{board.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="blue">{t("manage.boardCheckins", { count: board.checkins })}</Badge>
                    {event.status === "ONGOING" && (
                      <button
                        type="button"
                        className="btn-ghost btn-xs p-1"
                        onClick={() => navigate(`/staff/scanner/${id}/${board.id}`)}
                        title={t("manage.openScannerForBoard")}
                        aria-label={t("manage.openScannerForBoard")}
                      >
                        <ScanQrCode size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Assignments tab ───────────────────────────────────── */}
      {activeTab === "sessions" && <EventSessionsPanel eventId={event.id} />}

      {activeTab === "checkinSettings" && <EventCheckinSettingsPanel eventId={event.id} />}

      {activeTab === "assignments" && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setAssignOpen(true)}>
              <Plus size={15} />
              {t("manage.addAssignment")}
            </Button>
          </div>

          {assignments.length === 0 ? (
            <EmptyState
              title={t("manage.noAssignments")}
              description={t("manage.noAssignmentsDesc")}
              icon={<Users size={24} />}
              action={
                <Button variant="primary" size="sm" onClick={() => setAssignOpen(true)}>
                  <Plus size={15} />
                  {t("manage.addAssignment")}
                </Button>
              }
            />
          ) : (
            <div className="card overflow-hidden">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-border-1 last:border-b-0">
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
                    className="btn-icon text-danger"
                    onClick={() => handleRemoveAssignment(a.userId)}
                    aria-label={t("manage.removeAssignment")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Settings tab ─────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="card p-4 space-y-3">
            <p className="text-section-title text-ink-1">{t("manage.settingsTitle")}</p>
            <FormField label={t("event.title")} required>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("event.date")} required>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </FormField>
              <FormField label={t("event.startTime")} required>
                <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
              </FormField>
            </div>
            <FormField label={t("event.location")}>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </FormField>
            <div className="flex justify-end">
              <Button variant="primary" isLoading={isSavingSettings} onClick={saveSettings}>
                {t("common.save")}
              </Button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card p-4 space-y-3 border-danger-border">
            <p className="text-section-title text-danger">{t("manage.dangerZone")}</p>
            <p className="text-sm text-ink-3">{t("manage.cancelWarning")}</p>
            <Button variant="danger" onClick={() => setShowCancelModal(true)}>
              {t("manage.cancelEvent")}
            </Button>
          </div>
        </div>
      )}

      {/* Add Assignment Modal */}
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
              isLoading={assigning}
              disabled={!assignUserId}
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <form id="assign-form" onSubmit={handleAssign} className="space-y-3">
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

      {/* Cancel Confirmation Modal */}
      <Modal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        title={t("manage.cancelEvent")}
        description={t("manage.cancelWarning")}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="default" onClick={() => setShowCancelModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              isLoading={isCancelling}
              onClick={async () => {
                await doCancelEvent();
                setShowCancelModal(false);
              }}
            >
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
