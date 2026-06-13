/* ═══════════════════════════════════════════════════════════════
   AppSidebar Organism — desktop fixed sidebar navigation (≥ lg)
   ═══════════════════════════════════════════════════════════════ */

import { NavLink, useNavigate } from "react-router-dom";
import {
  Building2,
  User,
  Plus,
  LogOut,
  Settings,
  Ticket,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/atoms/Avatar";
import { ThemeToggle } from "@/molecules/ThemeToggle";
import { LanguageSwitcher } from "@/molecules/LanguageSwitcher";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────── */
export interface SidebarWorkspace {
  id: string;
  name: string;
  _count?: { events: number; members?: number };
}

interface AppSidebarProps {
  mode: "attendee" | "organizer";
  workspaces: SidebarWorkspace[];
  selectedWsId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
}

/* ── Helpers ───────────────────────────────────────────────────── */

/** Deterministic hue from string → HSL color for workspace letter avatar */
function nameToHsl(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

/* ── Main Component ─────────────────────────────────────────────── */
export function AppSidebar({
  mode,
  workspaces,
  selectedWsId,
  onSelectWorkspace,
  onCreateWorkspace,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const NAV_ITEMS =
    mode === "attendee"
      ? [
          {
            to: "/app/join",
            icon: <Ticket size={16} />,
            label: t("nav.events"),
          },
          {
            to: "/app/profile",
            icon: <User size={16} />,
            label: t("nav.profile"),
          },
        ]
      : [
          {
            to: "/app/workspaces",
            icon: <Building2 size={16} />,
            label: t("nav.workspace"),
          },
          {
            to: "/app/profile",
            icon: <User size={16} />,
            label: t("nav.profile"),
          },
        ];

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <aside className="sidebar hidden lg:flex" aria-label="Main navigation">
      {/* ── Logo ── */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border-1 shrink-0">
        <img
          src="/assets/Treckin.svg"
          alt="Treckin"
          className="h-6 w-auto"
          draggable={false}
        />
        <span className="font-semibold text-sm text-ink-1 tracking-tight">
          Treckin
        </span>
      </div>

      {/* ── Primary Nav ── */}
      <nav className="sidebar-section pt-3 shrink-0">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn("sidebar-item", isActive && "active")
            }
          >
            <span className="shrink-0 text-current">{icon}</span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Workspace Quick-list (organizer only) ── */}
      {mode === "organizer" && (
        <div className="sidebar-section flex-1 min-h-0 overflow-hidden flex flex-col mt-2 border-t border-border-1 pt-2">
          <p className="sidebar-label mb-1">
            {t("workspace.myWorkspaces")}
          </p>

          {/* Scrollable workspace list */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5 pb-1">
            {workspaces.map((ws) => {
              const letter = ws.name.charAt(0).toUpperCase();
              const isSelected = ws.id === selectedWsId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onSelectWorkspace(ws.id)}
                  className={cn(
                    "sidebar-item w-full text-left",
                    isSelected && "active"
                  )}
                  aria-current={isSelected ? "page" : undefined}
                  title={ws.name}
                >
                  {/* Letter avatar */}
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: nameToHsl(ws.name) }}
                    aria-hidden
                  >
                    {letter}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-xs">
                    {ws.name}
                  </span>
                  {ws._count && (
                    <span className="sidebar-count shrink-0">
                      {ws._count.events}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Create workspace */}
          <button
            type="button"
            onClick={onCreateWorkspace}
            className="sidebar-item w-full text-left text-ink-3 mt-1"
          >
            <Plus size={14} className="shrink-0" />
            <span className="text-xs">{t("workspace.createWorkspace")}</span>
          </button>
        </div>
      )}

      {/* Spacer for attendee mode so footer stays at bottom */}
      {mode === "attendee" && <div className="flex-1" />}

      {/* ── Footer ── */}
      <div className="border-t border-border-1 p-3 space-y-2 shrink-0">
        {/* Controls row */}
        <div className="flex items-center justify-between gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => navigate("/app/profile")}
            aria-label={t("common.settings")}
            className="btn-icon"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 px-1">
            <Avatar
              src={user.avatarUrl}
              name={user.name}
              size="sm"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-1 truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-ink-4 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t("auth.logout")}
              title={t("auth.logout")}
              className="btn-icon shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
