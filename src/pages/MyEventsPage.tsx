/* ═══════════════════════════════════════════════════════════════
   MyEventsPage — /app/events
   Attendee view: list of events the current user has joined.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, QrCode } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/molecules/Toast";
import { PageHeader } from "@/organisms/PageHeader";
import { EventTable } from "@/organisms/EventTable";
import { Button } from "@/atoms";
import { setFlowPreference } from "@/lib/flow-preference";
import { isApiEventOngoing, mapApiEventStatus } from "@/lib/event-status";
import type { EventItem as EventItemType } from "@/molecules/EventCard";
import { useDocumentTitle } from "@/hooks";
import { parseApiError } from "@/lib/parseApiError";

// ── API shape from /me/events?view=attending ─────────────────────────────────
interface ApiEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  status: string;
  joinCode: string;
  registrationEnabled: boolean;
  _count?: { checkins: number; registrations: number };
}

function mapEvent(e: ApiEvent): EventItemType {
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

export function MyEventsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("event.myEvents"));
  const navigate = useNavigate();
  const toast = useToast();

  const [events, setEvents] = useState<EventItemType[]>([]);
  const [rawEvents, setRawEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: ApiEvent[] } | ApiEvent[]>("/me/events", {
        params: { view: "attending" },
      });
      const arr = Array.isArray(data) ? data : data.data;
      setRawEvents(arr);
      setEvents(arr.map(mapEvent));
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    setFlowPreference("attendee");
    void loadEvents();
  }, [loadEvents]);

  const isActive = (event: EventItemType) =>
    isApiEventOngoing(rawEvents.find((r) => r.id === event.id)?.status);

  const activeCount = events.filter((e) => isActive(e)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("event.myEvents")}
        subtitle={!loading ? t("event.eventsCount", { count: events.length }) : undefined}
        action={
          <Button variant="primary" size="sm" onClick={() => navigate("/app/join")}>
            {t("join.title")}
          </Button>
        }
      />

      {/* Stat-Led Summary Header Pills */}
      {!loading && events.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 animate-fade-in-up">
          <div className="card px-3.5 py-2 flex items-center gap-2 text-caption">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-ink-3">{t("event.myEvents", "Joined Events")}:</span>
            <span className="font-semibold text-ink-1">{events.length}</span>
          </div>
          <div className="card px-3.5 py-2 flex items-center gap-2 text-caption">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-ink-3">{t("eventDetail.status.active", "Active")}:</span>
            <span className="font-semibold text-ink-1">{activeCount}</span>
          </div>
        </div>
      )}

      {/* Event table */}
      <EventTable
        events={events}
        loading={loading}
        emptyTitle={t("event.eventsCountZero")}
        emptyDescription={t("event.joinEvent")}
        emptyIcon={<CalendarDays size={24} />}
        onEventClick={(ev) => navigate(`/app/events/${ev.id}`)}
        emptyAction={
          <Button variant="primary" size="sm" onClick={() => navigate("/app/join")}>
            {t("join.title")}
          </Button>
        }
        renderActions={(ev) =>
          isActive(ev) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/app/events/${ev.id}?tab=credential`);
              }}
              className="btn-primary btn-sm gap-1"
              aria-label={t("eventDetail.showQr")}
            >
              <QrCode size={13} />
              QR
            </button>
          ) : null
        }
      />
    </div>
  );
}
