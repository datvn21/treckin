/* ═══════════════════════════════════════════════════════════════
   EventTable Organism — searchable table view for events
   ═══════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import { Search, X, CalendarDays, MapPin, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import type { EventItem } from "@/molecules/EventCard";

export type { EventItem };

// ─── Status helpers (mirrors EventCard) ───────────────────────────────────────
type DotColor = "green" | "yellow" | "red" | "gray" | "blue";

const STATUS_DOT_COLOR: Record<string, DotColor> = {
  active: "green",
  upcoming: "blue",
  completed: "gray",
  cancelled: "red",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: "badge-green",
  upcoming: "badge-blue",
  completed: "badge-gray",
  cancelled: "badge-red",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={cn("badge", STATUS_BADGE_CLASS[status] ?? "badge-gray")}>
      {t(`eventDetail.status.${status}`)}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface EventTableProps {
  events: EventItem[];
  isLoading?: boolean;
  /** @deprecated use isLoading */
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  renderActions?: (event: EventItem) => React.ReactNode;
  onEventClick?: (event: EventItem) => void;
  skeletonCount?: number;
  searchPlaceholder?: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function EventTable({
  events,
  isLoading,
  loading,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  renderActions,
  onEventClick,
  skeletonCount = 5,
  searchPlaceholder,
  className,
}: EventTableProps) {
  const { t } = useTranslation();
  const showLoading = isLoading ?? loading ?? false;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return events;
    const q = query.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.joinCode?.toLowerCase().includes(q) ||
        e.date?.toLowerCase().includes(q),
    );
  }, [events, query]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (showLoading) {
    return (
      <div className={cn("card overflow-hidden", className)}>
        {/* Search bar skeleton */}
        <div className="px-4 py-3 border-b border-border-1">
          <div className="h-10 bg-surface-raised rounded animate-pulse" />
        </div>
        {/* Table header skeleton */}
        <div className="grid grid-cols-[1fr_120px_140px_100px_80px] gap-4 px-4 py-3 border-b border-border-1 bg-surface-base">
          <div className="h-3 bg-surface-raised rounded animate-pulse w-16" />
          <div className="h-3 bg-surface-raised rounded animate-pulse w-20" />
          <div className="h-3 bg-surface-raised rounded animate-pulse w-24" />
          <div className="h-3 bg-surface-raised rounded animate-pulse w-16" />
          <div className="h-3 bg-surface-raised rounded animate-pulse w-12" />
        </div>
        <SkeletonList count={skeletonCount} />
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <div className={cn("card overflow-hidden", className)}>
        <EmptyState
          title={emptyTitle ?? t("event.eventsCountZero")}
          description={emptyDescription}
          icon={emptyIcon ?? <CalendarDays size={24} />}
          action={emptyAction}
        />
      </div>
    );
  }

  // ── No search results ─────────────────────────────────────────────────────
  if (filtered.length === 0) {
    return (
      <div className={cn("card overflow-hidden", className)}>
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-border-1">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder ?? t("common.searchPlaceholder")}
              className="input pl-9 pr-9 w-full"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors cursor-pointer"
                aria-label={t("common.clearSearch", "Clear search")}
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <EmptyState
          title={t("common.noResults")}
          description={t("event.noResultsForQuery", {
            query,
            defaultValue: `No events match "${query}"`,
          })}
          icon={<Search size={24} />}
        />
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn("card overflow-hidden", className)}>
      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border-1 bg-surface-base">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? t("common.searchPlaceholder")}
            className="input pl-9 pr-9 w-full"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors cursor-pointer"
              aria-label={t("common.clearSearch")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-1 bg-surface-base text-caption text-ink-3 font-medium">
            <th className="text-left px-4 py-3">{t("event.table.event")}</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">{t("event.table.date")}</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">
              {t("event.table.location")}
            </th>
            <th className="text-left px-4 py-3">{t("event.table.status")}</th>
            <th className="text-right px-4 py-3 pr-4">{t("event.table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-1">
          {filtered.map((event, idx) => {
            const isClickable = Boolean(onEventClick);
            return (
              <tr
                key={event.id}
                onClick={isClickable ? () => onEventClick?.(event) : undefined}
                className={cn(
                  "group transition-colors duration-150 animate-fade-in-up",
                  isClickable && "cursor-pointer hover:bg-surface-raised",
                )}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Title */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-ink-1 truncate max-w-[200px] sm:max-w-[280px] md:max-w-[320px]">
                      {event.title}
                    </span>
                    <div className="flex items-center gap-3 text-caption text-ink-3 sm:hidden">
                      {event.date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={11} aria-hidden="true" />
                          {formatDate(event.date)}
                        </span>
                      )}
                      {event.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} aria-hidden="true" />
                          <span className="truncate max-w-[100px]">{event.location}</span>
                        </span>
                      )}
                    </div>
                    {/* Meta row on mobile */}
                    <div className="flex items-center gap-2 text-caption text-ink-3 md:hidden">
                      <StatusBadge status={event.status} />
                      {event._count && (
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} aria-hidden="true" />
                          {event._count.checkins}/{event._count.registrations}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Date */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex flex-col gap-0.5 text-caption text-ink-2">
                    {event.date && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays
                          size={12}
                          className="text-ink-4 shrink-0"
                          aria-hidden="true"
                        />
                        {formatDate(event.date)}
                      </span>
                    )}
                    {event.startTime && (
                      <span className="text-ink-3">{formatTime(event.startTime, "HH:mm")}</span>
                    )}
                  </div>
                </td>

                {/* Location */}
                <td className="px-4 py-3 hidden md:table-cell">
                  {event.location ? (
                    <span className="inline-flex items-center gap-1.5 text-caption text-ink-2 truncate max-w-[160px]">
                      <MapPin size={12} className="text-ink-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  ) : (
                    <span className="text-caption text-ink-3">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.status} />
                    {/* Attendees count — hidden on mobile */}
                    <span className="hidden md:inline-flex items-center gap-1 text-caption text-ink-3">
                      <Users size={12} aria-hidden="true" />
                      {event._count ? (
                        <span>
                          {event._count.checkins}/{event._count.registrations}
                        </span>
                      ) : (
                        <span>
                          {event.totalCheckins ?? 0}/{event.totalRegistered ?? 0}
                        </span>
                      )}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 pr-4">
                  <div className="flex items-center justify-end gap-1.5">
                    {renderActions ? (
                      renderActions(event)
                    ) : (
                      <span className="text-caption text-ink-3">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Footer: result count ─────────────────────────────────────────── */}
      {query && (
        <div className="px-4 py-3 border-t border-border-1 bg-surface-base text-caption text-ink-3">
          {t("event.filteredCount", {
            count: filtered.length,
            total: events.length,
            defaultValue: `${filtered.length} of ${events.length} events`,
          })}
        </div>
      )}
    </div>
  );
}
