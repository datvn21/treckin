/* ═══════════════════════════════════════════════════════════════
   AppShell Template — topbar with centered search + rich avatar dropdown
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Ticket,
  Building2,
  ChevronRight,
  Plus,
  CalendarDays,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { getFlowPreference } from "@/lib/flow-preference";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/organisms/BottomNav";
import { Avatar } from "@/atoms/Avatar";
import { NavDropdown } from "@/components/navigation/NavDropdown";
import type { DropdownItem } from "@/components/navigation/NavDropdown";
import { TopbarSearch } from "@/components/navigation/TopbarSearch";
import { UserMenu } from "@/components/navigation/UserMenu";

/* ── Types ─────────────────────────────────────────────────────── */
export interface Workspace {
  id: string;
  name: string;
  logoUrl?: string | null;
  _count?: { events: number; members: number };
  members?: Array<{ role: string }>;
}

export interface AppShellContext {
  workspaces: Workspace[];
  isLoadingWorkspaces: boolean;
  refetchWorkspaces: () => Promise<void>;
}

/* ── Main AppShell ─────────────────────────────────────────────── */
export function AppShell() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const mode = getFlowPreference() ?? "attendee";

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [myEvents, setMyEvents] = useState<{ id: string; title: string }[]>([]);
  const [workspaceEvents, setWorkspaceEvents] = useState<{
    id: string;
    title: string;
  }[]>([]);

  /* Route context */
  const wsMatch = location.pathname.match(
    /^\/app\/workspaces\/([^/]+)/,
  );
  const currentWsId = wsMatch?.[1];
  const currentWs = workspaces.find((ws) => ws.id === currentWsId);

  const eventMatch = location.pathname.match(/^\/app\/events\/([^/]+)/);
  const currentEventId = eventMatch?.[1];
  const currentEvent = myEvents.find((e) => e.id === currentEventId);

  const [activeEventDetail, setActiveEventDetail] = useState<{
    id: string;
    title: string;
    workspaceId?: string;
    workspace?: { id: string; name: string };
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoadingWorkspaces(true);
      const { data } = await api.get<Workspace[]>("/workspaces");
      setWorkspaces(data);
    } catch {
      /* non-critical */
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void fetchWorkspaces();
  }, [isAuthenticated, fetchWorkspaces]);

  useEffect(() => {
    if (mode !== "attendee" || !isAuthenticated) return;
    api
      .get<{ data: { id: string; title: string }[] } | { id: string; title: string }[]>(
        "/me/events",
        { params: { view: "attending" } },
      )
      .then(({ data }) => {
        const arr = Array.isArray(data) ? data : data.data;
        setMyEvents(arr.map((e) => ({ id: e.id, title: e.title })));
      })
      .catch(() => {});
  }, [mode, isAuthenticated]);

  useEffect(() => {
    if (!currentEventId || !isAuthenticated) {
      setActiveEventDetail(null);
      return;
    }

    let active = true;
    api.get(`/events/${currentEventId}`)
      .then(({ data }) => {
        if (active) setActiveEventDetail(data as any);
      })
      .catch(() => {
        if (active) setActiveEventDetail(null);
      });

    return () => {
      active = false;
    };
  }, [currentEventId, isAuthenticated]);

  const activeWsId =
    location.pathname.includes("/manage") && activeEventDetail
      ? activeEventDetail.workspace?.id ||
        (activeEventDetail as any).workspaceId
      : currentWsId;

  const activeWsName =
    location.pathname.includes("/manage") && activeEventDetail
      ? activeEventDetail.workspace?.name ||
        workspaces.find(
          (w) => w.id === (activeEventDetail as any).workspaceId,
        )?.name
      : currentWs?.name;

  const activeWs = workspaces.find((ws) => ws.id === activeWsId);

  useEffect(() => {
    if (!activeWsId || !isAuthenticated || mode !== "organizer") {
      setWorkspaceEvents([]);
      return;
    }

    let active = true;
    api
      .get<{ data: any[] } | any[]>(
        `/workspaces/${activeWsId}/events`,
      )
      .then(({ data }) => {
        if (active) {
          const arr = Array.isArray(data) ? data : data.data;
          setWorkspaceEvents(
            arr.map((e: any) => ({ id: e.id, title: e.title ?? "" })),
          );
        }
      })
      .catch(() => {
        if (active) setWorkspaceEvents([]);
      });

    return () => {
      active = false;
    };
  }, [activeWsId, isAuthenticated, mode]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (currentWsId) {
      localStorage.setItem("lastActiveWorkspaceId", currentWsId);
    }
  }, [currentWsId]);

  useEffect(() => {
    if (currentEventId) {
      localStorage.setItem("lastActiveEventId", currentEventId);
    }
  }, [currentEventId]);

  const handleLogoClick = () => {
    if (mode === "organizer") {
      const id =
        currentWsId || localStorage.getItem("lastActiveWorkspaceId");
      if (id && workspaces.some((w) => w.id === id)) {
        navigate(`/app/workspaces/${id}`);
      } else {
        navigate("/app/workspaces");
      }
    } else {
      const id = currentEventId || localStorage.getItem("lastActiveEventId");
      if (id && myEvents.some((e) => e.id === id)) {
        navigate(`/app/events/${id}`);
      } else {
        navigate("/app/events");
      }
    }
  };

  /* Dropdown items */
  const wsDropdownItems: DropdownItem[] = workspaces.map((ws) => ({
    id: ws.id,
    label: ws.name,
    to: `/app/workspaces/${ws.id}`,
    meta: ws._count ? `${ws._count.events}` : undefined,
    icon: (
      <Avatar
        src={ws.logoUrl}
        name={ws.name}
        size="xs"
        className="w-7 h-7"
      />
    ),
  }));

  const eventDropdownItems: DropdownItem[] = myEvents.map((e) => ({
    id: e.id,
    label: e.title,
    to: `/app/events/${e.id}`,
    icon: (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-ink-3 shrink-0">
        <CalendarDays size={13} />
      </span>
    ),
  }));

  const wsEventsDropdownItems: DropdownItem[] = workspaceEvents.map((e) => ({
    id: e.id,
    label: e.title,
    to: `/app/events/${e.id}/manage`,
    icon: (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-ink-3 shrink-0">
        <CalendarDays size={13} />
      </span>
    ),
  }));

  /* Search data */
  const searchEvents =
    mode === "attendee"
      ? myEvents
      : workspaces.flatMap((ws) =>
          (ws as any).events?.map((e: any) => ({
            id: e.id,
            title: e.title ?? "",
          })) ?? [],
        );

  const outletContext: AppShellContext = {
    workspaces,
    isLoadingWorkspaces,
    refetchWorkspaces: fetchWorkspaces,
  };

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ══ Topbar ══════════════════════════════════════════════════ */}
      <header className="topbar sticky top-0 z-20 relative">
        {/* Left: Logo + breadcrumb nav */}
        <div className="flex items-center gap-1 shrink-0 min-w-0">
          {/* Logo */}
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2 mr-1.5 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none"
            aria-label="Treckin home"
          >
            <img
              src="/assets/Treckin.svg"
              alt="Treckin"
              className="h-8 w-auto"
              draggable={false}
            />
            <span className="font-bold text-lg text-ink-1 tracking-tight">
              Treckin
            </span>
          </button>

          {/* Breadcrumb nav — desktop */}
          <nav
            className="hidden lg:flex items-center gap-1 ml-1"
            aria-label="Main navigation"
          >
            {mode === "organizer" ? (
              <>
                <NavLink
                  to="/app/workspaces"
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium",
                      "transition-[color,background-color] duration-100",
                      isActive
                        ? "text-ink-1 bg-surface-raised"
                        : "text-ink-3 hover:text-ink-1 hover:bg-surface-raised",
                    )
                  }
                >
                  <Building2 size={15} />
                  {t("nav.workspace")}
                </NavLink>

                {/* Second level: Workspace name dropdown */}
                {activeWsId && activeWsName ? (
                  <>
                    <ChevronRight
                      size={14}
                      className="text-ink-4 shrink-0"
                    />
                    <NavDropdown
                      label={activeWsName}
                      headerLabel={t("workspace.myWorkspaces")}
                      icon={
                        <Avatar
                          src={activeWs?.logoUrl}
                          name={activeWsName}
                          size="xs"
                          className="w-5 h-5"
                        />
                      }
                      dropdownHeaderIcon={
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-ink-3 shrink-0">
                          <Building2 size={13} />
                        </span>
                      }
                      homeHref="/app/workspaces"
                      isActive={
                        location.pathname === `/app/workspaces/${activeWsId}` ||
                        location.pathname.startsWith(
                          `/app/workspaces/${activeWsId}/`,
                        )
                      }
                      activeId={activeWsId}
                      items={wsDropdownItems}
                      emptyLabel={t("workspace.noWorkspaces")}
                      footerItem={{
                        label: t("workspace.createWorkspace"),
                        icon: <Plus size={13} />,
                        onClick: () =>
                          navigate("/app/workspaces?create=1"),
                      }}
                      onSelect={(item) => navigate(item.to)}
                    />
                  </>
                ) : null}

                {/* Third level: Event manage */}
                {location.pathname.includes("/manage") &&
                activeEventDetail ? (
                  <>
                    <ChevronRight
                      size={14}
                      className="text-ink-4 shrink-0"
                    />
                    <NavDropdown
                      label={activeEventDetail.title}
                      headerLabel={t("workspace.events")}
                      icon={null}
                      dropdownHeaderIcon={
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-ink-3 shrink-0">
                          <CalendarDays size={13} />
                        </span>
                      }
                      homeHref={`/app/workspaces/${activeWsId}`}
                      isActive={
                        location.pathname ===
                        `/app/events/${activeEventDetail.id}/manage`
                      }
                      activeId={activeEventDetail.id}
                      items={wsEventsDropdownItems}
                      emptyLabel={t("event.noEvents")}
                      footerItem={{
                        label: t("event.createEvent"),
                        icon: <Plus size={13} />,
                        onClick: () =>
                          navigate(
                            `/app/workspaces/${activeWsId}/events/create`,
                          ),
                      }}
                      onSelect={(item) => navigate(item.to)}
                    />
                  </>
                ) : null}

                {location.pathname.endsWith("/events/create") ? (
                  <>
                    <ChevronRight
                      size={14}
                      className="text-ink-4 shrink-0"
                    />
                    <span className="text-sm font-medium text-ink-1 max-w-[160px] truncate">
                      {t("event.createEvent")}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <NavLink
                  to="/app/join"
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium",
                      "transition-[color,background-color] duration-100",
                      isActive
                        ? "text-ink-1 bg-surface-raised"
                        : "text-ink-3 hover:text-ink-1 hover:bg-surface-raised",
                    )
                  }
                >
                  <Ticket size={15} />
                  {t("nav.events")}
                </NavLink>

                {/* Second level: Event name dropdown */}
                {(() => {
                  const activeEventId =
                    activeEventDetail?.id || currentEvent?.id;
                  const activeEventTitle =
                    activeEventDetail?.title || currentEvent?.title;

                  if (!activeEventId || !activeEventTitle) return null;

                  return (
                    <>
                      <ChevronRight
                        size={14}
                        className="text-ink-4 shrink-0"
                      />
                      <NavDropdown
                        label={activeEventTitle}
                        headerLabel={t("nav.events")}
                        icon={null}
                        dropdownHeaderIcon={
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-ink-3 shrink-0">
                            <Ticket size={13} />
                          </span>
                        }
                        homeHref="/app/events"
                        isActive={location.pathname === "/app/events"}
                        activeId={currentEventId}
                        items={eventDropdownItems}
                        emptyLabel={t("join.emptyJoinedEvents")}
                        onSelect={(item) => navigate(item.to)}
                      />
                    </>
                  );
                })()}
              </>
            )}
          </nav>
        </div>

        {/* Center: Search */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center pointer-events-auto">
          <TopbarSearch workspaces={workspaces} events={searchEvents} />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: User menu */}
        <div className="flex items-center gap-1 shrink-0">
          {user ? (
            <UserMenu
              name={user.name}
              email={user.email}
              avatarUrl={user.avatarUrl}
              onProfile={() => navigate("/app/profile")}
              onLogout={handleLogout}
            />
          ) : null}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="page-content-mobile" aria-label="Main content">
        <div className="page-inner">
          <div className="page-route">
            <Outlet context={outletContext} />
          </div>
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <BottomNav mode={mode} />
    </div>
  );
}
