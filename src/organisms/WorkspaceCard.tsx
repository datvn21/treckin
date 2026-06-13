/* ═══════════════════════════════════════════════════════════════
   WorkspaceCard Organism — workspace summary card
   ═══════════════════════════════════════════════════════════════ */

import { Calendar, Users, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface WorkspaceCardWorkspace {
  id: string;
  name: string;
  logoUrl?: string | null;
  _count?: { events: number; members?: number };
  members?: Array<{ role: string }>;
}

interface WorkspaceCardProps {
  workspace?: WorkspaceCardWorkspace;
  /** Deprecated flat props kept for backwards compat */
  name?: string;
  eventCount?: number;
  memberCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onSettings?: () => void;
  role?: "OWNER" | "MEMBER";
  className?: string;
}

/** Deterministic hue from string for workspace color avatar */
function nameToHsl(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

export function WorkspaceCard({
  workspace,
  name: nameProp,
  eventCount: eventCountProp,
  memberCount: memberCountProp,
  isSelected = false,
  onClick,
  onSettings,
  role,
  className,
}: WorkspaceCardProps) {
  const { t } = useTranslation();

  // Support both structured workspace prop and legacy flat props
  const name = workspace?.name ?? nameProp ?? "";
  const eventCount = workspace?._count?.events ?? eventCountProp;
  const memberCount = workspace?._count?.members ?? memberCountProp;

  const letter = name.charAt(0).toUpperCase();

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "card p-5 flex flex-col gap-4 animate-fade-in-up transition-[background-color,border-color]",
        onClick && "cursor-pointer hover:border-border-2",
        isSelected && "border-primary bg-primary-muted",
        className,
      )}
      aria-current={isSelected ? "true" : undefined}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {workspace?.logoUrl ? (
          <img
            src={workspace.logoUrl}
            alt={name}
            className="w-14 h-14 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ backgroundColor: nameToHsl(name) }}
            aria-hidden
          >
            {letter}
          </span>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-section-title text-ink-1 truncate font-semibold">{name}</p>
          {role && (
            <p className="text-body-sm text-ink-3 mt-1">
              {role === "OWNER" ? t("workspace.owner") : t("workspace.member")}
            </p>
          )}
        </div>
        {onSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettings();
            }}
            aria-label={t("workspace.settings")}
            className="btn-icon shrink-0 -mr-1.5 -mt-1"
          >
            <Settings size={15} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-body-sm text-ink-3 pt-3 border-t border-border-1">
        <span className="flex items-center gap-1.5">
          <Calendar size={15} />
          {eventCount ?? 0} {t("workspace.events")}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={15} />
          {memberCount ?? 0} {t("workspace.members")}
        </span>
      </div>
    </div>
  );
}
