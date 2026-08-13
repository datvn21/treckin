/* ═══════════════════════════════════════════════════════════════
   BottomNav Organism — mobile primary navigation (< lg)
   Fixed bottom bar with swipe gesture support.
   ═══════════════════════════════════════════════════════════════ */

import { useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Building2, User, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  mode: "attendee" | "organizer";
}

const ATTENDEE_TABS = [
  { to: "/app/join", icon: Ticket, labelKey: "nav.events", fallback: "Sự kiện" },
  { to: "/app/profile", icon: User, labelKey: "nav.profile", fallback: "Hồ sơ" },
] as const;

const ORGANIZER_TABS = [
  { to: "/app/workspaces", icon: Building2, labelKey: "nav.workspace", fallback: "Workspace" },
  { to: "/app/profile", icon: User, labelKey: "nav.profile", fallback: "Hồ sơ" },
] as const;

const SWIPE_THRESHOLD = 50; // px

export function BottomNav({ mode }: BottomNavProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const TABS = mode === "attendee" ? ATTENDEE_TABS : ORGANIZER_TABS;

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  /* Current tab index from URL */
  const currentIdx = TABS.findIndex((tab) => location.pathname.startsWith(tab.to));

  /* ── Swipe gesture handlers ── */
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    // Only handle horizontal swipes (dy < dx in absolute terms)
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) {
      touchStartX.current = null;
      return;
    }

    const idx = currentIdx < 0 ? 0 : currentIdx;

    if (dx < 0 && idx < TABS.length - 1) {
      // Swipe left → next tab
      navigate(TABS[idx + 1]!.to);
    } else if (dx > 0 && idx > 0) {
      // Swipe right → previous tab
      navigate(TABS[idx - 1]!.to);
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const isTabActive = (tabTo: string) => {
    if (tabTo === "/app/workspaces") {
      return (
        location.pathname.startsWith("/app/workspaces") ||
        location.pathname.includes("/manage") ||
        (mode === "organizer" && location.pathname.startsWith("/app/events"))
      );
    }
    if (tabTo === "/app/join") {
      return (
        location.pathname.startsWith("/app/join") ||
        (mode === "attendee" && location.pathname.startsWith("/app/events"))
      );
    }
    return location.pathname.startsWith(tabTo);
  };

  return (
    <nav
      className={cn("bottom-nav lg:hidden tap-transparent")}
      style={{ "--bottom-nav-cols": TABS.length } as React.CSSProperties}
      aria-label="Mobile navigation"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {TABS.map(({ to, icon: Icon, labelKey, fallback }) => (
        <NavLink
          key={to}
          to={to}
          className={() => cn("bottom-nav-item", isTabActive(to) && "active")}
          aria-label={t(labelKey, { defaultValue: fallback })}
        >
          <Icon size={24} strokeWidth={1.75} aria-hidden />
          <span className="bottom-nav-label">{t(labelKey, { defaultValue: fallback })}</span>
        </NavLink>
      ))}
    </nav>
  );
}
