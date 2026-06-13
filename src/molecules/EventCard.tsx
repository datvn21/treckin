import * as React from 'react';
import { CalendarDays, MapPin, Hash, Users, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, formatDate } from '@/lib/utils';
import { Dot } from '@/atoms/Dot';
import type { EventStatus } from '@/types';

function formatEventTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    }
  } catch {
    // fallback
  }

  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeStr;
}

// ─── EventItem type ──────────────────────────────────────────────────────────
export interface EventItem {
  id:                  string;
  title:               string;
  date:                string;
  startTime?:          string;
  location?:           string;
  joinCode?:           string;
  status:              EventStatus;
  attendancePolicy?:   string;
  boards?:             unknown[];
  workspace?:          unknown;
  registrations?:      unknown[];
  _count?:             { registrations?: number; checkins?: number };
  checkinModes?:       string[];
  eventQrBehavior?:    string;
  registrationEnabled?: boolean;
  totalCheckins?:      number;
  totalRegistered?:    number;
  boardCount?:         number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
type DotColor = 'green' | 'yellow' | 'red' | 'gray' | 'blue';

const STATUS_DOT_COLOR: Record<EventStatus, DotColor> = {
  active:    'green',
  upcoming:  'blue',
  completed: 'gray',
  cancelled: 'red',
};

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  active:    'badge-green',
  upcoming:  'badge-blue',
  completed: 'badge-gray',
  cancelled: 'badge-red',
};

function StatusBadge({ status }: { status: EventStatus }) {
  const { t } = useTranslation();

  const LABEL: Record<EventStatus, string> = {
    active:    t('eventDetail.status.active',    { defaultValue: 'Đang diễn ra' }),
    upcoming:  t('eventDetail.status.upcoming',  { defaultValue: 'Sắp diễn ra' }),
    completed: t('eventDetail.status.completed', { defaultValue: 'Đã kết thúc' }),
    cancelled: t('eventDetail.status.cancelled', { defaultValue: 'Đã hủy' }),
  };

  return (
    <span className={STATUS_BADGE_CLASS[status]}>
      {LABEL[status]}
    </span>
  );
}

// ─── EventCard props ──────────────────────────────────────────────────────────
export interface EventCardProps {
  event:       EventItem;
  variant?:    'row' | 'card';
  onClick?:    () => void;
  actions?:    React.ReactNode;
  showStatus?: boolean;
  className?:  string;
  style?:      React.CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────
const EventCard: React.FC<EventCardProps> = ({
  event,
  variant = 'row',
  onClick,
  actions,
  showStatus = true,
  className,
  style,
}) => {
  const { t } = useTranslation();
  const isClickable = Boolean(onClick);

  const checkins   = event.totalCheckins ?? event._count?.checkins    ?? 0;
  const registered = event.totalRegistered ?? event._count?.registrations ?? 0;

  const sharedInteractive = isClickable
    ? {
        role:       'button' as const,
        tabIndex:   0,
        onClick,
        onKeyDown:  (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        },
      }
    : {};

  // ── Row variant ────────────────────────────────────────────────────────────
  if (variant === 'row') {
    return (
      <div
        {...sharedInteractive}
        className={cn(
          'event-row tap-transparent animate-fade-in-up flex items-center justify-between gap-4 py-4 px-5',
          isClickable && 'cursor-pointer',
          className
        )}
        style={style}
      >
        {/* Left side: Title & Meta info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Title block */}
          <h3 className="event-title truncate font-semibold text-ink-1 leading-snug">{event.title}</h3>
          
          {/* Metadata block */}
          <div className="event-meta flex flex-wrap items-center gap-x-5 gap-y-1.5 text-caption text-ink-3">
            {event.date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
                <span>{formatDate(event.date)}</span>
              </span>
            )}
            {event.startTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
                <span>{formatEventTime(event.startTime)}</span>
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
                <span className="truncate max-w-[200px]">{event.location}</span>
              </span>
            )}
            {event.joinCode && (
              <span className="inline-flex items-center gap-1.5">
                <Hash size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
                <span className="font-mono text-[11px] bg-surface-raised border border-border-1 rounded px-1 py-0.5 text-ink-3">{event.joinCode}</span>
              </span>
            )}
            {registered > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
                <span>{checkins}/{registered} {t('event.people', { defaultValue: 'người' })}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right side: Status Badge + Actions */}
        <div className="flex items-center gap-2.5 shrink-0 ml-4">
          {showStatus && <StatusBadge status={event.status} />}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      </div>
    );
  }

  // ── Card variant ───────────────────────────────────────────────────────────
  return (
    <article
      {...sharedInteractive}
      className={cn(
        'card p-4 flex flex-col gap-3 animate-fade-in-up',
        isClickable && 'cursor-pointer',
        className
      )}
      style={style}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Dot
            color={STATUS_DOT_COLOR[event.status]}
            size="md"
            animated={event.status === 'active'}
            className="shrink-0"
          />
          <h3 className="event-title truncate-2 font-semibold text-ink-1 leading-snug">{event.title}</h3>
        </div>
        {showStatus && <StatusBadge status={event.status} />}
      </div>

      {/* Meta */}
      <div className="event-meta flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-2">
        {event.date && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
            <span>{formatDate(event.date)}</span>
          </span>
        )}
        {event.startTime && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
            <span>{formatEventTime(event.startTime)}</span>
          </span>
        )}
        {event.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[150px]">{event.location}</span>
          </span>
        )}
        {event.joinCode && (
          <span className="inline-flex items-center gap-1.5">
            <Hash size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
            <span className="font-mono text-[11px] bg-surface-raised border border-border-1 rounded px-1 py-0.5 text-ink-3">{event.joinCode}</span>
          </span>
        )}
      </div>

      {/* Footer */}
      {(registered > 0 || actions) && (
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border-1">
          {registered > 0 && (
            <span className="inline-flex items-center gap-1.5 text-caption text-ink-2 font-medium">
              <Users size={13} className="text-ink-4 shrink-0" aria-hidden="true" />
              <span>{checkins} / {registered} {t('event.people', { defaultValue: 'người' })}</span>
            </span>
          )}
          {actions && <div className="flex gap-1.5 ml-auto">{actions}</div>}
        </div>
      )}
    </article>
  );
};

EventCard.displayName = 'EventCard';

export { EventCard };

