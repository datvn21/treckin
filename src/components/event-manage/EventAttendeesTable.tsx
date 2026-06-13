/* ═══════════════════════════════════════════════════════════════
   EventAttendeesTable — displays all registrants with check-in status.
   Supports search, filter by status, and real-time highlight when
   a new check-in arrives via Socket.io.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { UserCheck, UserX, Users } from "lucide-react";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/parseApiError";
import { formatTime } from "@/lib/utils";
import { useToast } from "@/molecules/Toast";
import { SearchBar } from "@/molecules/SearchBar";
import { Badge } from "@/atoms/Badge";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
export interface AttendeeRow {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  /** null = registered but not yet checked in */
  checkinTime: string | null;
  boardName: string | null;
  sessionName: string | null;
  direction: "IN" | "OUT" | null;
}

type FilterKey = "all" | "checked-in" | "not-checked-in";

interface EventAttendeesPanelProps {
  eventId: string;
  /** Called when the attendee list is freshly loaded (passes count) */
  onLoad?: (count: number) => void;
  /** Bump this value to trigger a reload (e.g., when a new socket checkin arrives) */
  refreshTick?: number;
}

interface ApiRegistration {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  checkins?: Array<{
    timestamp: string;
    direction: "IN" | "OUT";
    board?: { name: string } | null;
    session?: { title: string } | null;
  }>;
}

function mapRegistration(reg: ApiRegistration): AttendeeRow {
  const latestCheckin = reg.checkins?.[0] ?? null;
  return {
    userId: reg.userId,
    name: reg.user.name,
    email: reg.user.email,
    avatarUrl: reg.user.avatarUrl,
    checkinTime: latestCheckin?.timestamp ?? null,
    boardName: latestCheckin?.board?.name ?? null,
    sessionName: latestCheckin?.session?.title ?? null,
    direction: latestCheckin?.direction ?? null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function EventAttendeesTable({ eventId, onLoad, refreshTick }: EventAttendeesPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [newCheckinIds, setNewCheckinIds] = useState<Set<string>>(new Set());

  // Load registrations + their check-in status
  const load = async () => {
    try {
      const { data } = await api.get<{ data: ApiRegistration[] } | ApiRegistration[]>(
        `/events/${eventId}/registrations`,
      );
      const list = Array.isArray(data) ? data : data.data;
      const mapped = list.map(mapRegistration);
      setRows(mapped);
      onLoad?.(mapped.length);
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, refreshTick]);

  // Highlight newly checked-in rows for 3 seconds
  const flashCheckin = (userId: string) => {
    setNewCheckinIds((prev) => new Set(prev).add(userId));
    setTimeout(() => {
      setNewCheckinIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }, 3000);
  };

  // Expose flash so parent can call it when socket fires
  useEffect(() => {
    // expose flashCheckin via a custom event so socket handler in parent can trigger
    const handler = (e: Event) => {
      const userId = (e as CustomEvent<string>).detail;
      flashCheckin(userId);
    };
    window.addEventListener(`attendee-checkin:${eventId}`, handler);
    return () => window.removeEventListener(`attendee-checkin:${eventId}`, handler);
  }, [eventId]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "checked-in") list = list.filter((r) => r.checkinTime !== null);
    if (filter === "not-checked-in") list = list.filter((r) => r.checkinTime === null);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, filter, search]);

  const checkedInCount = rows.filter((r) => r.checkinTime !== null).length;

  // ── Filter pills ──────────────────────────────────────────────
  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: t("common.all"), count: rows.length },
    { key: "checked-in", label: t("manage.attendees.checkedIn"), count: checkedInCount },
    {
      key: "not-checked-in",
      label: t("manage.attendees.notCheckedIn"),
      count: rows.length - checkedInCount,
    },
  ];

  if (loading) return <SkeletonList count={5} />;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex-1 min-w-[180px]">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t("manage.attendees.searchPlaceholder")}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-100 flex items-center gap-1.5 outline-none",
              filter === f.key
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface text-ink-3 border-border-1 hover:border-border-2 hover:text-ink-1",
            )}
          >
            <span>{f.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] rounded-full font-bold",
                filter === f.key ? "bg-white/20 text-white" : "bg-surface-raised text-ink-4",
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title={t("common.noResults")} icon={<Users size={24} />} />
      ) : (
        <div className="card overflow-hidden">
          {/* Table header — hidden on mobile */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 px-4 py-2.5 border-b border-border-1 bg-surface-raised">
            <span className="text-xs font-semibold text-ink-4 uppercase tracking-wide w-6 text-center">
              #
            </span>
            <span className="text-xs font-semibold text-ink-4 uppercase tracking-wide">
              {t("manage.attendees.name")}
            </span>
            <span className="text-xs font-semibold text-ink-4 uppercase tracking-wide">
              {t("manage.attendees.board")}
            </span>
            <span className="text-xs font-semibold text-ink-4 uppercase tracking-wide text-right">
              {t("manage.attendees.time")}
            </span>
          </div>

          {/* Rows */}
          {filtered.map((row, idx) => {
            const isNew = newCheckinIds.has(row.userId);
            const hasCheckin = row.checkinTime !== null;

            return (
              <div
                key={row.userId}
                className={cn(
                  "grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_1fr_auto] items-center gap-3 px-4 py-3",
                  "border-b border-border-1 last:border-b-0 transition-colors duration-300",
                  isNew && "bg-success/8 animate-pulse-once",
                )}
              >
                {/* Index */}
                <span className="text-xs text-ink-4 tabular-nums w-6 text-center shrink-0">
                  {idx + 1}
                </span>

                {/* Name + email */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-1 truncate">{row.name}</p>
                  <p className="text-xs text-ink-4 truncate">{row.email}</p>
                </div>

                {/* Board / session — hidden on mobile, shown inline on small screens */}
                <div className="hidden sm:block min-w-0">
                  {hasCheckin ? (
                    <p className="text-xs text-ink-2 truncate">
                      {row.boardName ?? "—"}
                      {row.sessionName && <span className="text-ink-4"> · {row.sessionName}</span>}
                    </p>
                  ) : (
                    <span className="text-xs text-ink-4">—</span>
                  )}
                </div>

                {/* Status badge + time */}
                <div className="flex flex-col items-end gap-1 shrink-0 col-start-2 sm:col-auto row-start-1 sm:row-auto">
                  {hasCheckin ? (
                    <>
                      <Badge variant="green">
                        <UserCheck size={10} className="mr-0.5" />
                        {t("manage.attendees.checkedIn")}
                      </Badge>
                      <span className="text-[10px] tabular-nums text-ink-4">
                        {formatTime(row.checkinTime!)}
                      </span>
                    </>
                  ) : (
                    <Badge variant="gray">
                      <UserX size={10} className="mr-0.5" />
                      {t("manage.attendees.notCheckedIn")}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
