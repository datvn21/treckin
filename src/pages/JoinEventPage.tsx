import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, CalendarDays, Keyboard } from 'lucide-react';
import { api } from '@/lib/api';
import { setFlowPreference } from '@/lib/flow-preference';
import { useToast } from '@/molecules/Toast';
import { PageHeader } from '@/organisms/PageHeader';
import { QRScanner } from '@/components/scanner/QRScanner';
import { Button } from '@/atoms/Button';
import { Input } from '@/atoms/Input';
import { Spinner } from '@/atoms/Spinner';
import { SkeletonList } from '@/atoms/Skeleton';
import { EventList } from '@/organisms/EventList';
import { mapApiEventStatus } from '@/lib/event-status';
import type { EventItem as EventItemType } from '@/molecules/EventCard';
import { cn } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks';
import { parseApiError } from '@/lib/parseApiError';


interface ApiEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  status: string;
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

function extractJoinCode(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const joinIndex = parts.findIndex((part) => part.toLowerCase() === 'join');
    if (joinIndex >= 0 && parts[joinIndex + 1]) {
      return parts[joinIndex + 1]!.trim().toUpperCase();
    }
  } catch {
    // Not a URL; treat it as a raw code below.
  }

  const match = raw.match(/(?:^|\/)join\/([a-z0-9-]+)/i);
  if (match?.[1]) return match[1].toUpperCase();

  const code = raw.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null;
}

export function JoinEventPage() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  useDocumentTitle(t('join.title'));
  const toast = useToast();

  const initialCode = useMemo(
    () => (routeCode ? extractJoinCode(routeCode) ?? '' : ''),
    [routeCode],
  );

  const [activeTab, setActiveTab] = useState<'qr' | 'code'>(initialCode ? 'code' : 'qr');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [joining, setJoining] = useState(false);
  const [events, setEvents] = useState<EventItemType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const { data } = await api.get<{ data: ApiEvent[] } | ApiEvent[]>('/me/events', {
        params: { view: 'attending' },
      });
      const arr = Array.isArray(data) ? data : data.data;
      setEvents(arr.map(mapEvent));
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    setFlowPreference('attendee');
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (initialCode) {
      setJoinCode(initialCode);
    }
  }, [initialCode]);

  const doJoin = async (code: string) => {
    setJoining(true);
    try {
      const { data } = await api.post<ApiEvent>('/events/join', { joinCode: code });
      toast.success(t('event.joinSuccess'));
      navigate(`/app/events/${data.id}`, { replace: true });
    } catch (err) {
      toast.error(parseApiError(err, t('event.joinFailed')));
    } finally {
      setJoining(false);
    }
  };

  const handleScan = (value: string) => {
    const code = extractJoinCode(value);
    if (!code) {
      toast.error(t('join.invalidQr'));
      return;
    }
    void doJoin(code);
  };

  const handleCodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = extractJoinCode(joinCode);
    if (!code) {
      toast.error(t('join.invalidQr'));
      return;
    }
    void doJoin(code);
  };

  return (
    <>
      <PageHeader title={t('join.title')} />

      {/* Tab switcher card */}
      <div className="card overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-border-1">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-[color,background-color,border-color]',
              activeTab === 'qr'
                ? 'border-b-2 border-primary text-primary bg-primary-muted'
                : 'text-ink-3 hover:text-ink-1 hover:bg-surface-raised',
            )}
            aria-selected={activeTab === 'qr'}
            role="tab"
          >
            <Camera size={16} />
            {t('join.scanQr')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-[color,background-color,border-color]',
              activeTab === 'code'
                ? 'border-b-2 border-primary text-primary bg-primary-muted'
                : 'text-ink-3 hover:text-ink-1 hover:bg-surface-raised',
            )}
            aria-selected={activeTab === 'code'}
            role="tab"
          >
            <Keyboard size={16} />
            {t('join.enterCode')}
          </button>
        </div>

        {/* QR tab */}
        {activeTab === 'qr' && (
          <div className="bg-neutral-950">
            <div className="h-72 sm:h-80">
              <QRScanner isPaused={joining} onScan={handleScan} />
            </div>
            {joining && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-white">
                <Spinner size="sm" color="white" />
                {t('common.loading')}
              </div>
            )}
          </div>
        )}

        {/* Code tab */}
        {activeTab === 'code' && (
          <form onSubmit={handleCodeSubmit} className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="label" htmlFor="join-code-input">
                {t('event.joinCode')}
              </label>
              <Input
                id="join-code-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('event.joinCodePlaceholder')}
                className="font-mono uppercase tracking-widest text-center text-lg"
                maxLength={32}
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!joinCode.trim()}
              isLoading={joining}
            >
              {t('join.joinEvent')}
            </Button>
          </form>
        )}
      </div>

      {/* Joined events section */}
      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-section-title text-ink-1">{t('join.joinedEvents')}</h2>
          <p className="mt-1 text-sm text-ink-3">{t('join.joinedEventsDescription')}</p>
        </div>

        {loadingEvents ? (
          <SkeletonList count={3} />
        ) : (
          <EventList
            events={events}
            loading={false}
            emptyTitle={t('event.eventsCountZero')}
            emptyDescription={t('join.emptyJoinedEvents')}
            emptyIcon={<CalendarDays size={24} />}
            onEventClick={(event) => navigate(`/app/events/${event.id}`)}
          />
        )}
      </section>
    </>
  );
}
