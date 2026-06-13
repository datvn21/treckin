/* ═══════════════════════════════════════════════════════════════
   WorkspaceDetailPage — /app/workspaces/:id
   Shows workspace events list + member management + invite modal.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Users, Calendar, Settings, X } from "lucide-react";
import { WorkspaceMembersPanel } from "@/components/workspace/WorkspaceMembersPanel";
import { WorkspaceSettingsPanel } from "@/components/workspace/WorkspaceSettingsPanel";
import { api } from "@/lib/api";
import { useToast } from "@/molecules/Toast";
import type { AppShellContext } from "@/templates/AppShell";
import { EventTable } from "@/organisms/EventTable";
import { PageHeader } from "@/organisms/PageHeader";
import { Button, Avatar } from "@/atoms";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import type { EventItem } from "@/molecules/EventCard";
import { mapApiEventStatus } from "@/lib/event-status";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks";
import { parseApiError } from "@/lib/parseApiError";


// ── Types ────────────────────────────────────────────────────────────────────
interface WsMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  avatarUrl?: string;
}

interface WsInvite {
  id: string;
  email: string;
  createdAt: string;
  status?: string;
  token?: string;
  metadata?: { role?: WorkspaceRole } | null;
  inviteLink?: string;
}

interface WsDetail {
  id: string;
  name: string;
  logoUrl?: string | null;
  role: WorkspaceRole;
  events: ApiEvent[];
  members: WsMember[];
  pendingInvitations?: WsInvite[];
  _count?: { events: number; members: number };
}

interface ApiWorkspaceDetail {
  id: string;
  name: string;
  logoUrl?: string | null;
  members?: Array<{ role: WorkspaceRole }>;
  _count?: { events: number; members: number };
}

interface ApiWorkspaceMember {
  id: string;
  role: WorkspaceRole;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

interface ApiEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  location?: string;
  status: string;
  _count?: { checkins: number; registrations: number };
}

function mapEvent(e: ApiEvent): EventItem {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    location: e.location,
    status: mapApiEventStatus(e.status),
    totalCheckins: e._count?.checkins ?? 0,
    totalRegistered: e._count?.registrations ?? 0,
  };
}


type Tab = "events" | "members" | "settings";
type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
type EventFilter = "all" | "upcoming" | "active" | "completed" | "cancelled";

// ── Component ────────────────────────────────────────────────────────────────
export function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { refetchWorkspaces } = useOutletContext<AppShellContext>();

  const [ws, setWs] = useState<WsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  useDocumentTitle(ws?.name ?? t("workspace.myWorkspaces"));

  const isOwner = ws?.role === "OWNER";
  const isWorkspaceAdmin = ws?.role === "OWNER" || ws?.role === "ADMIN";



  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: base } = await api.get<ApiWorkspaceDetail>(`/workspaces/${id}`);
      const role = base.members?.[0]?.role ?? "MEMBER";
      const [eventsRes, membersRes, invitationsRes] = await Promise.all([
        api.get<{ data: ApiEvent[] } | ApiEvent[]>(`/workspaces/${id}/events`),
        api.get<ApiWorkspaceMember[]>(`/workspaces/${id}/members`),
        role === "OWNER"
          ? api.get<WsInvite[]>(`/workspaces/${id}/invitations`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] as WsInvite[] }),
      ]);

      const events = Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data.data;
      const members = membersRes.data
        .filter((member) => member.user)
        .map((member) => ({
          id: member.user!.id,
          name: member.user!.name,
          email: member.user!.email,
          avatarUrl: member.user!.avatarUrl,
          role: member.role,
        }));

      setWs({
        id: base.id,
        name: base.name,
        logoUrl: base.logoUrl,
        role,
        events,
        members,
        pendingInvitations: invitationsRes.data.filter(
          (inv) => !inv.status || inv.status === "PENDING",
        ),
        _count: base._count,
      });
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const events = useMemo(() => (ws?.events ?? []).map(mapEvent), [ws?.events]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return events;
    return events.filter((e) => e.status === eventFilter);
  }, [events, eventFilter]);

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return <SkeletonList count={4} />;
  }

  if (!ws) {
    return <EmptyState title={t("workspace.notFound")} description={t("workspace.notFoundDesc")} />;
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "events", label: t("workspace.events"), icon: <Calendar size={14} /> },
    { key: "members", label: t("workspace.members"), icon: <Users size={14} /> },
    ...(isWorkspaceAdmin
      ? [{ key: "settings" as Tab, label: t("workspace.settings"), icon: <Settings size={14} /> }]
      : []),
  ];

  const headerActions = (() => {
    if (!isWorkspaceAdmin) return undefined;
    if (activeTab === "events") {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/app/workspaces/${id}/events/create`)}
        >
          <Plus size={15} />
          {t("event.createEvent")}
        </Button>
      );
    }
    if (activeTab === "members") {
      return undefined;
    }
    return undefined;
  })();

  return (
    <div className="relative">
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

      <PageHeader
        title={ws.name}
        subtitle={t("workspace.detailSubtitle", {
          events: ws._count?.events ?? 0,
          members: ws._count?.members ?? 0,
        })}
        avatar={
          <Avatar
            src={ws.logoUrl}
            name={ws.name}
            size="lg"
          />
        }
        actions={headerActions}
        className=""
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

      {/* ── Events tab ──────────────────────────────────────────── */}
      {activeTab === "events" && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(
              [
                { key: "all", label: t("common.all", { defaultValue: "Tất cả" }) },
                { key: "upcoming", label: t("eventDetail.status.upcoming", { defaultValue: "Sắp tới" }) },
                { key: "active", label: t("eventDetail.status.active", { defaultValue: "Đang diễn ra" }) },
                { key: "completed", label: t("eventDetail.status.completed", { defaultValue: "Đã kết thúc" }) },
                { key: "cancelled", label: t("eventDetail.status.cancelled", { defaultValue: "Đã huỷ" }) },
              ] as const
            ).map((f) => {
              const isActive = eventFilter === f.key;
              const count = f.key === "all"
                ? events.length
                : events.filter((e) => e.status === f.key).length;

              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setEventFilter(f.key)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-100 flex items-center gap-2 outline-none",
                    isActive
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-ink-3 border-border-1 hover:border-border-2 hover:text-ink-1"
                  )}
                >
                  <span>{f.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 text-[10px] rounded-full font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-surface-raised text-ink-4"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <EventTable
            events={filteredEvents}
            loading={false}
            emptyTitle={t("event.noEvents")}
            emptyDescription={t("event.noEventsDescription")}
            emptyIcon={<Calendar size={24} />}
            emptyAction={
              isWorkspaceAdmin ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/app/workspaces/${id}/events/create`)}
                >
                  <Plus size={15} />
                  {t("event.createEvent")}
                </Button>
              ) : undefined
            }
            onEventClick={(ev) =>
              isWorkspaceAdmin ? navigate(`/app/events/${ev.id}/manage`) : navigate(`/app/events/${ev.id}`)
            }
          />
        </div>
      )}

      {/* ── Members tab ─────────────────────────────────────────── */}
      {activeTab === "members" && (
        <div className="space-y-3 animate-fade-in-up">
          <WorkspaceMembersPanel
            workspaceId={ws.id}
            currentUserRole={ws.role}
            members={ws.members}
            pendingInvitations={isOwner ? ws.pendingInvitations : []}
            onReload={() => void load()}
          />
        </div>
      )}

      {/* ── Settings tab (OWNER only) ───────────────────────────── */}
      {activeTab === "settings" && isWorkspaceAdmin && (
        <WorkspaceSettingsPanel
          workspaceId={ws.id}
          workspaceName={ws.name}
          logoUrl={ws.logoUrl}
          onWorkspaceUpdate={(data) => {
            setWs((prev) => (prev ? { ...prev, ...data } : null));
            void refetchWorkspaces();
          }}
        />
      )}

    </div>
  );
}
