/* ═══════════════════════════════════════════════════════════════
   EventDetailPage — /app/events/:id
   Attendee view of an event: details + QR Check-in tab.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarDays, MapPin, CheckCircle2, Clock, Users, ShieldCheck, QrCode, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/molecules/Toast";
import { PageHeader } from "@/organisms/PageHeader";
import { Badge } from "@/atoms/Badge";
import { Skeleton } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import { Button } from "@/atoms/Button";
import { QRCodeDisplay } from "@/components/student/QRCodeDisplay";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks";
import { parseApiError } from "@/lib/parseApiError";


// ── Types ─────────────────────────────────────────────────────────
interface ApiEventDetail {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  status: string;
  joinCode: string;
  attendancePolicy?: string;
  requiredBoardCount?: number | null;
  checkinModes?: string[];
  eventQrBehavior?: string;
  boards?: Array<{ id: string; name: string }>;
  registrations?: Array<{ id: string; registeredAt: string }>;
  _count?: { checkins: number; registrations: number };
}

type EventStatus = "ONGOING" | "PUBLISHED" | "DRAFT" | "COMPLETED" | "CANCELLED";


function mapStatusVariant(s: string): "green" | "blue" | "gray" | "red" | "yellow" {
  switch (s?.toUpperCase() as EventStatus) {
    case "ONGOING":   return "green";
    case "COMPLETED": return "gray";
    case "CANCELLED": return "red";
    default:          return "blue";
  }
}

// ── Tabs ─────────────────────────────────────────────────────────
type Tab = "detail" | "credential";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [event, setEvent] = useState<ApiEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get("tab") === "credential" ? "credential" : "detail"
  );

  const isRegistered = (event?.registrations?.length ?? 0) > 0;

  useDocumentTitle(event?.title ?? t("eventDetail.detail"));

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<ApiEventDetail>(`/events/${id}`);
      setEvent(data);
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("tab") === "credential") setActiveTab("credential");
  }, [searchParams]);

  if (loading) {
    return (
      <div>
        <div className="mb-4 w-full flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/app/events")}
            aria-label={t("common.close")}
            className="z-10 flex items-center justify-center w-8 h-8 rounded-full border border-border-1 text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 shrink-0"
          >
            <X size={15} />
          </button>
        </div>
        <PageHeader title="" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 mt-4" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <div className="mb-4 w-full flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/app/events")}
            aria-label={t("common.close")}
            className="z-10 flex items-center justify-center w-8 h-8 rounded-full border border-border-1 text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 shrink-0"
          >
            <X size={15} />
          </button>
        </div>
        <PageHeader title={t("eventDetail.notFound")} />
        <EmptyState
          title={t("eventDetail.notFound")}
          description={t("eventDetail.notFoundDesc")}
        />
      </div>
    );
  }

  // ── Helpers using i18n ──
  function statusLabel(s: string): string {
    const map: Record<string, string> = {
      ONGOING:   t("eventDetail.status.active"),
      PUBLISHED: t("eventDetail.status.upcoming"),
      DRAFT:     t("eventDetail.status.upcoming"),
      COMPLETED: t("eventDetail.status.completed"),
      CANCELLED: t("eventDetail.status.cancelled"),
    };
    return map[s?.toUpperCase()] ?? s;
  }

  function policyLabel(p?: string): string {
    const map: Record<string, string> = {
      SINGLE_IN:          t("event.singleIn"),
      IN_OUT:             t("event.inOut"),
      BOARD_REQUIREMENTS: t("event.boardRequirements"),
    };
    return (p && map[p]) ? map[p] : "—";
  }

  function modesLabel(modes?: string[]): string {
    if (!modes?.length) return "—";
    return modes
      .map((m) =>
        m === "ATTENDEE_CREDENTIAL"
          ? t("event.scannerScanQr")
          : t("event.attendeeScanBoard")
      )
      .join(", ");
  }

  return (
    <div>
      <div className="mb-4 w-full flex justify-end">
        <button
          type="button"
          onClick={() => navigate("/app/events")}
          aria-label={t("common.close")}
          className="z-10 flex items-center justify-center w-8 h-8 rounded-full border border-border-1 text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 shrink-0"
        >
          <X size={15} />
        </button>
      </div>

      <PageHeader title={event.title} />

      {/* Tab list */}
      <div className="tab-list mb-5">
        <button
          type="button"
          className={cn("tab-item", activeTab === "detail" && "active")}
          onClick={() => setActiveTab("detail")}
        >
          {t("eventDetail.detail")}
        </button>
        <button
          type="button"
          className={cn("tab-item", activeTab === "credential" && "active")}
          onClick={() => setActiveTab("credential")}
        >
          <QrCode size={14} />
          {t("eventDetail.credential")}
        </button>
      </div>

      {/* ── Tab 1: Chi tiết ─────────────────────────────────────── */}
      {activeTab === "detail" && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Info card */}
          <div className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-section-title text-ink-1 leading-snug">{event.title}</h2>
              <Badge variant={mapStatusVariant(event.status)} dot>
                {statusLabel(event.status)}
              </Badge>
            </div>

            <div className="space-y-2 text-sm text-ink-2">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="shrink-0 text-ink-4" />
                {event.date} · {event.startTime}
                {event.endTime && ` – ${event.endTime}`}
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="shrink-0 text-ink-4" />
                  {event.location}
                </div>
              )}
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="shrink-0 text-ink-4" />
                {policyLabel(event.attendancePolicy)}
              </div>
              <div className="flex items-center gap-2">
                <QrCode size={15} className="shrink-0 text-ink-4" />
                {modesLabel(event.checkinModes)}
              </div>
            </div>

            {/* Join code */}
            <div className="pt-2 border-t border-border-1">
              <p className="text-caption text-ink-3 mb-1">{t("event.joinCode")}</p>
              <code className="code-tag text-sm">{event.joinCode}</code>
            </div>
          </div>

          {/* Registration status */}
          <div className="card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-card-title text-ink-1">{t("eventDetail.registrationStatus")}</p>
              <p className="text-body-sm text-ink-3 mt-0.5">
                {isRegistered
                  ? t("eventDetail.registeredDesc")
                  : t("eventDetail.notRegisteredShort")}
              </p>
            </div>
            {isRegistered ? (
              <Badge variant="green">
                <CheckCircle2 size={13} />
                {t("event.joined")}
              </Badge>
            ) : (
              <Badge variant="gray">{t("event.notRegistered")}</Badge>
            )}
          </div>

          {/* Boards section (if BOARD_REQUIREMENTS) */}
          {event.attendancePolicy === "BOARD_REQUIREMENTS" && event.boards && event.boards.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-border-1">
                <p className="text-section-title text-ink-1">{t("event.boards")}</p>
                {event.requiredBoardCount && (
                  <p className="text-caption text-ink-3 mt-0.5">
                    {t("eventDetail.boardsRequired", { count: event.requiredBoardCount })}
                  </p>
                )}
              </div>
              {event.boards.map((board) => (
                <div key={board.id} className="flex items-center gap-3 px-4 py-3 border-b border-border-1 last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-primary-muted border border-primary-border shrink-0" />
                  <span className="text-sm text-ink-2">{board.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3 text-center">
              <p className="stat-value">{event._count?.registrations ?? 0}</p>
              <p className="stat-label mt-0.5">
                <Users size={12} className="inline mr-1" />
                {t("manage.totalRegistrations")}
              </p>
            </div>
            <div className="card p-3 text-center">
              <p className="stat-value">{event._count?.checkins ?? 0}</p>
              <p className="stat-label mt-0.5">
                <Clock size={12} className="inline mr-1" />
                {t("manage.checkedIn")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: QR Check-in ───────────────────────────────────── */}
      {activeTab === "credential" && (
        <div className="animate-fade-in-up">
          {isRegistered ? (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="text-center">
                <p className="text-section-title text-ink-1 mb-1">{t("eventDetail.credential")}</p>
                <p className="text-body-sm text-ink-3">{t("eventDetail.scanInstruction")}</p>
              </div>
              <QRCodeDisplay eventId={event.id} />
            </div>
          ) : (
            <EmptyState
              title={t("eventDetail.notRegisteredTitle")}
              description={t("eventDetail.notRegisteredDesc")}
              icon={<QrCode size={24} />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/app/join")}
                >
                  {t("event.joinEvent")}
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
