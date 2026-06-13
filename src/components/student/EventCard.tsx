import { MapPin, Clock } from "lucide-react";
import type { EventSummary, EventStatus } from "@/types";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/utils";

interface EventCardProps {
  event: EventSummary;
  isActive?: boolean;
  showStatus?: boolean;
}

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; className: string }
> = {
  active: { label: "Đang diễn ra", className: "badge-green" },
  upcoming: { label: "Sắp tới", className: "badge-warning" },
  completed: {
    label: "Hoàn thành",
    className:
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-600",
  },
  cancelled: {
    label: "Đã hủy",
    className: "badge-danger",
  },
};

/**
 * Event summary card used in the student dashboard.
 * Uses the `.ticket-card` design-system class for consistent
 * shadow/radius styling, with an optional active-state highlight.
 */
export function EventCard({ event, isActive = false, showStatus = true }: EventCardProps) {
  const statusConfig = STATUS_CONFIG[event.status];

  return (
    <article
      className={cn(
        "ticket-card",
        isActive && "border-l-4 border-primary",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* ── Event Details ── */}
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-semibold text-xl text-ink-1 truncate">
            {event.title}
          </h3>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-ink-3">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs text-ink-3">
                {formatDate(event.date)} · {formatTime(event.startTime, "HH:mm")}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-3">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>

        {/* ── Status Badge ── */}
        {showStatus && (
          <span className={cn("flex-shrink-0 mt-0.5", statusConfig.className)}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* ── Checkin Stats ── */}
      <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center gap-4">
        <div className="text-xs text-ink-3">
          <span className="font-semibold text-ink-1">
            {event.totalCheckins}
          </span>
          /{event.totalRegistered} đã điểm danh
        </div>
        {event.boardCount > 0 && (
          <div className="text-xs text-ink-3">
            {event.boardCount} bảng
          </div>
        )}
      </div>
    </article>
  );
}
