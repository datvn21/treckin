/* ═══════════════════════════════════════════════════════════════
   WorkspaceDetailPage — /app/workspaces/:id
   Shows workspace events list + member management + invite modal.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Users, Calendar, Settings, X } from "lucide-react";
import { WorkspaceMembersPanel } from "@/components/workspace/WorkspaceMembersPanel";
import { WorkspaceSettingsPanel } from "@/components/workspace/WorkspaceSettingsPanel";
import { api } from "@/lib/api";
import { useToast } from "@/molecules/Toast";
import { EventList } from "@/organisms/EventList";
import { PageHeader } from "@/organisms/PageHeader";
import { Button } from "@/atoms";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import type { EventItem } from "@/molecules/EventCard";
import { mapApiEventStatus } from "@/lib/event-status";
import { cn } from "@/lib/utils";

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
  role: WorkspaceRole;
  events: ApiEvent[];
  members: WsMember[];
  pendingInvitations?: WsInvite[];
  _count?: { events: number; members: number };
}

interface ApiWorkspaceDetail {
  id: string;
  name: string;
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

function parseApiError(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const e = err as { response?: { data?: { message?: string | string[] } } };
    const msg = e.response?.data?.message;
    return Array.isArray(msg) ? msg.join(" ") : (msg ?? fallback);
  }
  return fallback;
}

type Tab = "events" | "members" | "settings";
type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

// ── Component ────────────────────────────────────────────────────────────────
export function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [ws, setWs] = useState<WsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("events");

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

  const events = (ws.events ?? []).map(mapEvent);

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
        <EventList
          events={events}
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
          renderActions={(ev) =>
            isWorkspaceAdmin ? (
              <button
                type="button"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-colors shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/events/${ev.id}/manage`);
                }}
                aria-label={t("manage.title")}
              >
                <Settings size={15} />
              </button>
            ) : null
          }
        />
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
        <WorkspaceSettingsPanel workspaceId={ws.id} workspaceName={ws.name} />
      )}

    </div>
  );
}
