/* ═══════════════════════════════════════════════════════════════
   EventManagePage — Unified scanner + overview page
   Inline scanner: QR display, short code, camera scanner,
   live attendees list, all boards, real-time ping/pong.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ScanQrCode,
  X, Wifi, WifiOff,
  Camera, CameraOff, Loader2, VideoOff, Pause, Play,
  ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle,
  ArrowDownLeft, ArrowUpRight,
  Copy, Check, ExternalLink,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/parseApiError";
import { useToast } from "@/molecules/Toast";
import { PageHeader } from "@/organisms/PageHeader";
import { Button } from "@/atoms/Button";
import { Badge } from "@/atoms/Badge";
import { Input } from "@/atoms/Input";
import { Avatar } from "@/atoms/Avatar";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket, joinEventRoom, leaveEventRoom } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks";
import type { CheckinRecord, CheckinDirection, ScanResult, ScanStatus, SocketCheckinPayload } from "@/types";
import { SocketEvent } from "@/types";


// ── Types ─────────────────────────────────────────────────────────────────────
interface EventDetail {
  id: string;
  title: string;
  status: string;
  date: string;
  startTime: string;
  location: string;
  workspaceId: string;
  attendancePolicy: string;
  requiredBoardCount?: number | null;
  boards?: BoardInfo[];
  assignments?: Assignment[];
  _count?: { checkins: number; registrations: number };
}

interface Assignment {
  id: string;
  userId: string;
  role: "SCANNER" | "MANAGER";
  boardId?: string | null;
  user: { name: string; email: string };
  board?: { name: string } | null;
}

interface BoardInfo {
  id: string;
  name: string;
  status: "active" | "paused" | "closed";
  checkinCount: number;
}

// Maps raw backend event status strings to display variants
function statusVariant(s: string): "green" | "blue" | "gray" | "red" {
  switch (s?.toUpperCase()) {
    case "ONGOING":   return "green";
    case "COMPLETED": return "gray";
    case "CANCELLED": return "red";
    default:          return "blue";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getStatusLabel(s: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    ONGOING:   t("manage.status.active"),
    PUBLISHED: t("manage.status.upcoming"),
    DRAFT:     t("manage.status.upcoming"),
    COMPLETED: t("manage.status.completed"),
    CANCELLED: t("manage.status.cancelled"),
  };
  return map[s?.toUpperCase()] ?? s;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return ""; }
}

// ── Inline Scanner Component ──────────────────────────────────────────────
type CameraState = "initializing" | "ready" | "paused" | "permission-denied" | "no-camera" | "error";

interface InlineQRScannerProps {
  onScan: (decodedText: string) => void;
  isPaused: boolean;
}

function InlineQRScanner({ onScan, isPaused }: InlineQRScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<number>(0);
  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const SCANNER_ID = "inline-qr-scanner";
  const DEBOUNCE_MS = 800;

  const handleScan = useCallback((decodedText: string) => {
    const now = Date.now();
    if (now - lastScanRef.current < DEBOUNCE_MS) return;
    lastScanRef.current = now;
    onScan(decodedText);
  }, [onScan]);

  const startScanner = useCallback(async (isMounted: { current: boolean }) => {
    try {
      const container = document.getElementById(SCANNER_ID);
      if (container) container.innerHTML = "";

      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 15 },
        (text) => { if (isMounted.current) handleScan(text); },
        () => {}
      );

      if (isMounted.current) setCameraState("ready");
      else { await scanner.stop().catch(() => {}); scanner.clear(); scannerRef.current = null; }
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
        setCameraState("permission-denied");
        setErrorMessage(t("scanner.camera.permissionDenied"));
      } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFound")) {
        setCameraState("no-camera");
        setErrorMessage(t("scanner.camera.noCamera"));
      } else {
        setCameraState("error");
        setErrorMessage(msg);
      }
    }
  }, [handleScan, t]);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    const st = s.getState();
    if (st === Html5QrcodeScannerState.SCANNING || st === Html5QrcodeScannerState.PAUSED) {
      await s.stop().catch(() => {});
    }
    try { s.clear(); } catch {}
    scannerRef.current = null;
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    void startScanner(isMounted);
    return () => { isMounted.current = false; void stopScanner(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isPaused) {
      void stopScanner().then(() => setCameraState("paused"));
    } else if (cameraState === "paused") {
      setCameraState("initializing");
      const isMounted = { current: true };
      void startScanner(isMounted);
      return () => { isMounted.current = false; };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  const isActive = cameraState === "ready";

  return (
    <div className="relative w-full aspect-square bg-[#1a1714] rounded-2xl overflow-hidden">
      <div id={SCANNER_ID} className={cn("w-full h-full", !isActive && "hidden")} />

      {/* Overlay when active */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-1/4 bg-transparent" />
          </div>
          <div className="absolute w-3/5 h-3/5 max-w-[200px] max-h-[200px]">
            <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-[#0061fe] rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-[#0061fe] rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-[#0061fe] rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-[#0061fe] rounded-br-xl" />
          </div>
        </div>
      )}

      {/* Paused */}
      {cameraState === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1714] z-20">
          <CameraOff className="w-12 h-12 text-[#8f857f]" strokeWidth={1.2} />
          <p className="text-[#c2b9b3] text-sm font-medium">{t("scanner.camera.paused")}</p>
          <p className="text-[#5e5650] text-xs">{t("scanner.camera.pausedHint")}</p>
        </div>
      )}

      {/* Initializing */}
      {cameraState === "initializing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1714] z-20">
          <Loader2 className="w-10 h-10 text-[#0061fe] animate-spin" strokeWidth={1.5} />
          <p className="text-[#5e5650] text-xs">{t("scanner.camera.initializing")}</p>
        </div>
      )}

      {/* Permission denied */}
      {cameraState === "permission-denied" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1714] z-20 p-6 text-center">
          <CameraOff className="w-12 h-12 text-[#e4a020]" strokeWidth={1.2} />
          <p className="text-[#f0ebe6] font-semibold text-base">{t("scanner.camera.permissionTitle")}</p>
          <p className="text-[#8f857f] text-xs max-w-[240px]">{errorMessage}</p>
          <p className="text-[#5e5650] text-xs max-w-[240px]">{t("scanner.camera.permissionHint")}</p>
        </div>
      )}

      {/* No camera */}
      {cameraState === "no-camera" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1714] z-20 p-6 text-center">
          <VideoOff className="w-12 h-12 text-[#f87171]" strokeWidth={1.2} />
          <p className="text-[#f0ebe6] font-semibold text-base">{t("scanner.camera.noCameraTitle")}</p>
          <p className="text-[#8f857f] text-xs max-w-[240px]">{errorMessage}</p>
        </div>
      )}

      {/* Generic error */}
      {cameraState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1714] z-20 p-6 text-center">
          <Camera className="w-12 h-12 text-[#f87171]" strokeWidth={1.2} />
          <p className="text-[#f0ebe6] font-semibold text-base">{t("scanner.camera.errorTitle")}</p>
          <p className="text-[#8f857f] text-xs max-w-[240px]">{errorMessage}</p>
        </div>
      )}

      {/* Hint */}
      {isActive && (
        <p className="absolute bottom-3 left-0 right-0 text-center text-[#5e5650] text-[10px]">
          {t("scanner.scanHint")}
        </p>
      )}
    </div>
  );
}

// ── Scan Result Toast ────────────────────────────────────────────────────
const AUTO_DISMISS_MS = 4000;

function ResultIcon({ status }: { status: ScanResult["status"] }) {
  const cls = "w-8 h-8 flex-shrink-0";
  switch (status) {
    case "success":           return <CheckCircle className={cn(cls, "text-[#12a150]")} strokeWidth={1.5} />;
    case "already-checked-in": return <Clock className={cn(cls, "text-[#b45309]")} strokeWidth={1.5} />;
    case "invalid-qr":         return <XCircle className={cn(cls, "text-[#dc2626]")} strokeWidth={1.5} />;
    case "expired-qr":        return <AlertCircle className={cn(cls, "text-[#d97706]")} strokeWidth={1.5} />;
    case "outside-geofence":   return <AlertCircle className={cn(cls, "text-[#d97706]")} strokeWidth={1.5} />;
    default: return null;
  }
}

function ResultLabel({ status }: { status: ScanResult["status"] }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    "success": t("scanner.result.success"),
    "already-checked-in": t("scanner.result.alreadyCheckedIn"),
    "invalid-qr": t("scanner.result.invalid"),
    "expired-qr": t("scanner.result.expired"),
    "outside-geofence": t("scanner.result.geofence"),
  };
  return (
    <span className={cn("text-sm font-semibold",
      status === "success" && "text-[#12a150]",
      status === "already-checked-in" && "text-[#b45309]",
      (status === "invalid-qr" || status === "expired-qr" || status === "outside-geofence") && "text-[#dc2626]"
    )}>
      {map[status] ?? status}
    </span>
  );
}

function ScanResultToast({ result, onDismiss }: { result: ScanResult | null; onDismiss: () => void }) {
  const { t } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!result) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [result, onDismiss]);

  if (!result) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-sm z-50 rounded-2xl border border-[#3d3530] bg-[#231f1c] shadow-2xl animate-slide-up">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#3d3530]">
        <div className="flex items-center gap-2">
          <ResultIcon status={result.status} />
          <ResultLabel status={result.status} />
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex items-center justify-center w-6 h-6 rounded-full text-[#5e5650] hover:text-[#f0ebe6] hover:bg-[#2c2724] transition-colors"
          aria-label={t("scanner.dismiss")}
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="px-4 py-3.5">
        <p className="text-sm text-[#c2b9b3] leading-relaxed mb-3">{result.message}</p>
        {result.student && (
          <div className="flex items-center gap-3">
            <Avatar name={result.student.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f0ebe6] truncate">{result.student.name}</p>
              {result.student.email && (
                <p className="text-[10px] text-[#5e5650] truncate">{result.student.email}</p>
              )}
            </div>
          </div>
        )}
        {result.status === "already-checked-in" && result.originalCheckin && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#8f857f]">
            <Clock className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
            <span>{result.originalCheckin.boardName} · {formatTime(result.originalCheckin.timestamp)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Online Status Dot ───────────────────────────────────────────────────
function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {isOnline
        ? <Wifi className="w-3.5 h-3.5 text-[#12a150]" strokeWidth={1.5} />
        : <WifiOff className="w-3.5 h-3.5 text-[#dc2626]" strokeWidth={1.5} />
      }
      <span className={cn("text-xs font-medium", isOnline ? "text-[#12a150]" : "text-[#dc2626]")}>
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}

// ── Recent Checkins List ────────────────────────────────────────────────
function RecentCheckins({ checkins }: { checkins: CheckinRecord[] }) {
  const { t } = useTranslation();
  if (checkins.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-[#776e6b] uppercase tracking-wider">
        {t("scanner.recentCheckins")}
      </p>
      {checkins.slice(0, 8).map((c) => {
        const isIn = c.direction === "IN";
        return (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#f7f5f2] border border-[#e4deda]">
            <div className={cn("flex items-center justify-center w-6 h-6 rounded-full",
              isIn ? "bg-[#dcfce7] text-[#12a150]" : "bg-[#fee2e2] text-[#dc2626]"
            )}>
              {isIn
                ? <ArrowDownLeft className="w-3 h-3" strokeWidth={2} />
                : <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
              }
            </div>
            <Avatar name={c.userName} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#1e1919] truncate">{c.userName}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-[#776e6b]">{formatTime(c.timestamp)}</span>
              <span className="text-[10px] text-[#a89e9b]">{c.boardName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Event QR + Code Card ───────────────────────────────────────────────
function EventQRCard({ event, board }: { event: EventDetail; board: BoardInfo | null }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const shortCode = event.id.slice(0, 6).toUpperCase();

  const handleCopy = () => {
    void navigator.clipboard.writeText(shortCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const qrPayload = board
    ? JSON.stringify({ e: event.id, b: board.id, d: "IN", v: 1 })
    : JSON.stringify({ e: event.id, v: 1 });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e1919]">{t("eventDetail.credential")}</h3>
        {board && (
          <Badge variant="green">{board.name}</Badge>
        )}
      </div>
      <div className="flex items-start gap-4">
        {/* QR Code */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className="p-3 bg-white rounded-xl border border-[#e4deda]">
            <QRCodeSVG value={qrPayload} size={100} bgColor="transparent" fgColor="#1e1919" level="M" includeMargin={false} />
          </div>
        </div>

        {/* Code + Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-[10px] text-[#776e6b] uppercase tracking-wider mb-1">{t("event.joinCode")}</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-2xl font-bold tracking-widest text-[#1e1919]">{shortCode}</p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-[#776e6b] hover:text-[#1e1919] hover:bg-[#f2efe9] transition-colors"
                title={t("event.copyCode")}
              >
                {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#776e6b]">{t("event.date")}: {event.date}</p>
            {event.location && (
              <p className="text-xs text-[#776e6b]">{t("event.location")}: {event.location}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export function EventManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const token = useAuthStore((s) => s.token);
  const isOnline = useOnlineStatus();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Scanner panel state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  const [scanMode, setScanMode] = useState<"camera" | "code">("camera");
  const [shortCode, setShortCode] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);
  const [totalCheckins, setTotalCheckins] = useState(0);

  // ── Socket ──────────────────────────────────────────────
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!id || !token) return;
    joinEventRoom(id, token);
    setSocketConnected(true);

    const socket = getSocket();
    const handleCheckin = (payload: SocketCheckinPayload) => {
      const record = payload.checkinRecord;
      setRecentCheckins((prev) => {
        const updated = [record, ...prev].slice(0, 20);
        return updated;
      });
      setTotalCheckins(payload.totalCheckins);
      setEvent((prev) => prev ? { ...prev, _count: { ...prev._count!, checkins: payload.totalCheckins } } : prev);
    };
    socket.on(SocketEvent.CHECKIN_SUCCESS, handleCheckin);
    return () => {
      socket.off(SocketEvent.CHECKIN_SUCCESS, handleCheckin);
      leaveEventRoom(id);
      setSocketConnected(false);
    };
  }, [id, token]);

  // ── Load data ────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<EventDetail>(`/events/${id}`);
      setEvent(data);
      setTotalCheckins(data._count?.checkins ?? 0);
      if (data.boards?.length && !activeBoardId) {
        setActiveBoardId(data.boards[0]!.id);
      }
    } catch (err) {
      toast.error(parseApiError(err, t("common.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [id, t, toast, activeBoardId]);

  useEffect(() => { void load(); }, [load]);

  useDocumentTitle(
    event?.title ? `${t("manage.title")} · ${event.title}` : t("manage.title")
  );

  // ── Computed ────────────────────────────────────────────
  const totalReg = event?._count?.registrations ?? 0;
  const checkedIn = event?._count?.checkins ?? 0;
  const rate = totalReg > 0 ? Math.round((checkedIn / totalReg) * 100) : 0;
  const activeBoard = event?.boards?.find((b) => b.id === activeBoardId) ?? null;

  // ── Scan handlers ─────────────────────────────────────────
  const handleScan = useCallback(async (decodedText: string) => {
    if (!activeBoardId || !id || !event) return;
    try {
      const { data } = await api.post<{
        success: boolean;
        checkinRecord: { id: string; userId: string; eventId: string; boardId: string; direction: CheckinDirection; timestamp: string; user: { id: string; name: string; email: string } };
      }>("/checkin/by-personal-qr", {
        hash: decodedText,
        boardId: activeBoardId,
        eventId: id,
        direction: "IN",
      });

      const result: ScanResult = data.success
        ? {
            status: "success",
            message: t("scanner.success"),
            student: { id: data.checkinRecord.user.id, name: data.checkinRecord.user.name, email: data.checkinRecord.user.email, avatarUrl: "" },
            checkinRecord: {
              id: data.checkinRecord.id, userId: data.checkinRecord.userId,
              userName: data.checkinRecord.user.name, eventId: data.checkinRecord.eventId,
              boardId: data.checkinRecord.boardId, boardName: activeBoard?.name ?? "",
              direction: data.checkinRecord.direction, timestamp: data.checkinRecord.timestamp,
              method: "qr",
            },
          }
        : {
            status: "already-checked-in",
            message: t("scanner.alreadyCheckedIn"),
            student: { id: data.checkinRecord.user.id, name: data.checkinRecord.user.name, email: data.checkinRecord.user.email, avatarUrl: "" },
            originalCheckin: { boardName: activeBoard?.name ?? "", timestamp: data.checkinRecord.timestamp },
          };

      setScanResult(result);
      if (result.status === "success" && result.checkinRecord) {
        setRecentCheckins((prev) => [result.checkinRecord!, ...prev].slice(0, 20));
        setTotalCheckins((n) => n + 1);
      }
    } catch (err) {
      const msg = parseApiError(err, t("scanner.invalidQr"));
      let status: ScanStatus = "invalid-qr";
      const lower = msg.toLowerCase();
      if (lower.includes("expired") || lower.includes("hết hạn")) status = "expired-qr";
      else if (lower.includes("geofence") || lower.includes("khoảng cách")) status = "outside-geofence";
      setScanResult({ status, message: msg });
    }
  }, [activeBoardId, id, activeBoard, t]);

  const handleShortCodeSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const code = shortCode.trim().toUpperCase();
    if (!code || code.length !== 6 || !activeBoardId || !id || !event) return;
    setIsSubmittingCode(true);
    try {
      const { data } = await api.post<{
        success: boolean;
        checkinRecord: { id: string; userId: string; eventId: string; boardId: string; direction: CheckinDirection; timestamp: string; user: { id: string; name: string; email: string } };
      }>("/checkin/by-short-code", {
        code, boardId: activeBoardId, eventId: id, direction: "IN",
      });

      const result: ScanResult = data.success
        ? {
            status: "success",
            message: t("scanner.success"),
            student: { id: data.checkinRecord.user.id, name: data.checkinRecord.user.name, email: data.checkinRecord.user.email, avatarUrl: "" },
            checkinRecord: {
              id: data.checkinRecord.id, userId: data.checkinRecord.userId,
              userName: data.checkinRecord.user.name, eventId: data.checkinRecord.eventId,
              boardId: data.checkinRecord.boardId, boardName: activeBoard?.name ?? "",
              direction: data.checkinRecord.direction, timestamp: data.checkinRecord.timestamp,
              method: "qr",
            },
          }
        : {
            status: "already-checked-in",
            message: t("scanner.alreadyCheckedIn"),
            student: { id: data.checkinRecord.user.id, name: data.checkinRecord.user.name, email: data.checkinRecord.user.email, avatarUrl: "" },
            originalCheckin: { boardName: activeBoard?.name ?? "", timestamp: data.checkinRecord.timestamp },
          };

      setScanResult(result);
      if (result.status === "success" && result.checkinRecord) {
        setRecentCheckins((prev) => [result.checkinRecord!, ...prev].slice(0, 20));
        setTotalCheckins((n) => n + 1);
      }
      setShortCode("");
    } catch (err) {
      setScanResult({ status: "invalid-qr", message: parseApiError(err, t("scanner.invalidQr")) });
      setShortCode("");
    } finally {
      setIsSubmittingCode(false);
    }
  }, [shortCode, activeBoardId, id, activeBoard, t]);

  const closePath = event?.workspaceId
    ? `/app/workspaces/${event.workspaceId}`
    : "/app/workspaces";

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <button type="button" onClick={() => navigate(closePath)}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e4deda] text-[#776e6b] hover:text-[#1e1919] hover:bg-[#f2efe9] transition-colors">
            <X size={15} />
          </button>
        </div>
        <PageHeader title="" />
        <SkeletonList count={5} />
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <button type="button" onClick={() => navigate(closePath)}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-[#e4deda] text-[#776e6b] hover:text-[#1e1919] hover:bg-[#f2efe9] transition-colors">
            <X size={15} />
          </button>
        </div>
        <PageHeader title={t("manage.title")} />
        <EmptyState title={t("manage.eventNotFound")} />
      </div>
    );
  }

  const rateColor = rate >= 80 ? "#12a150" : rate >= 50 ? "#b45309" : "#dc2626";

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      {/* ── Topbar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#e4deda] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button type="button" onClick={() => navigate(closePath)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[#776e6b] hover:text-[#1e1919] hover:bg-[#f2efe9] transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-[#1e1919] truncate">{event.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(event.status)}>{getStatusLabel(event.status, t)}</Badge>
              <OnlineDot isOnline={isOnline && socketConnected} />
            </div>
          </div>
          <button type="button"
            onClick={() => navigate(`/app/events/${id}`)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[#776e6b] hover:text-[#1e1919] hover:bg-[#f2efe9] transition-colors"
            title={t("manage.viewAsAttendee")}>
            <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* ── Stats row ─────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 flex flex-col gap-1">
            <p className="text-xs text-[#776e6b] font-medium">{t("manage.totalRegistrations")}</p>
            <p className="text-2xl font-semibold text-[#1e1919] tabular-nums">{totalReg}</p>
          </div>
          <div className="card p-4 flex flex-col gap-1">
            <p className="text-xs text-[#776e6b] font-medium">{t("manage.checkedIn")}</p>
            <p className="text-2xl font-semibold text-[#1e1919] tabular-nums">{checkedIn}</p>
          </div>
          <div className="card p-4 flex flex-col gap-1">
            <p className="text-xs text-[#776e6b] font-medium">{t("manage.checkinRate")}</p>
            <p className="text-2xl font-semibold tabular-nums" style={{ color: rateColor }}>{rate}%</p>
          </div>
        </div>

        {/* ── Board selector ─────────────────────────── */}
        {event.boards && event.boards.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {event.boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => { setActiveBoardId(board.id); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors",
                  activeBoardId === board.id
                    ? "bg-[#0061fe] text-white border-transparent"
                    : "bg-white text-[#4a4543] border-[#e4deda] hover:border-[#cfc8c3]"
                )}
              >
                <span>{board.name}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums",
                  activeBoardId === board.id ? "bg-white/20" : "bg-[#f2efe9]"
                )}>
                  {board.checkinCount}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setScannerOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors",
                scannerOpen
                  ? "bg-[#0061fe] text-white border-transparent"
                  : "bg-white text-[#0061fe] border-[#b8d0ff] hover:bg-[#edf3ff]"
              )}
            >
              <ScanQrCode className="w-4 h-4" strokeWidth={1.5} />
              <span>{t("scanner.scanQr")}</span>
            </button>
          </div>
        )}

        {/* ── Inline Scanner Panel ─────────────────────── */}
        {scannerOpen && (
          <div className="card overflow-hidden animate-fade-in-up">
            {/* Scanner header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4deda]">
              <div className="flex items-center gap-3">
                <OnlineDot isOnline={isOnline && socketConnected} />
                <span className="text-sm font-semibold text-[#1e1919]">
                  {totalCheckins} {t("scanner.checkins")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Scan mode toggle */}
                <div className="flex items-center bg-[#f2efe9] rounded-lg p-0.5 gap-0.5">
                  <button type="button"
                    onClick={() => setScanMode("camera")}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      scanMode === "camera" ? "bg-white text-[#1e1919] shadow-sm" : "text-[#776e6b]"
                    )}>
                    <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button type="button"
                    onClick={() => setScanMode("code")}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      scanMode === "code" ? "bg-white text-[#1e1919] shadow-sm" : "text-[#776e6b]"
                    )}>
                    {t("scanner.enterCode")}
                  </button>
                </div>
                {/* Pause */}
                <button type="button"
                  onClick={() => setIsPaused((v) => !v)}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                    isPaused
                      ? "bg-[#12a150] text-white hover:bg-[#0f8f42]"
                      : "text-[#776e6b] hover:text-[#1e1919] hover:bg-[#f2efe9]"
                  )}
                  title={isPaused ? t("scanner.resume") : t("scanner.pause")}>
                  {isPaused ? <Play className="w-4 h-4" strokeWidth={1.5} /> : <Pause className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Scanner body */}
            <div className="p-4">
              <div className="flex gap-4">
                {/* Left: camera or code input */}
                <div className="flex-1 flex flex-col gap-3">
                  {scanMode === "camera" ? (
                    <InlineQRScanner onScan={handleScan} isPaused={isPaused} />
                  ) : (
                    <form onSubmit={(e) => void handleShortCodeSubmit(e)} className="flex flex-col gap-3">
                      <Input
                        type="text"
                        value={shortCode}
                        onChange={(e) => setShortCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder={t("scanner.enterCodePlaceholder")}
                        className="text-center text-xl font-mono tracking-widest uppercase"
                        maxLength={6}
                        autoFocus
                        autoComplete="off"
                      />
                      <Button type="submit" variant="primary" disabled={shortCode.length !== 6} isLoading={isSubmittingCode}>
                        {t("scanner.submit")}
                      </Button>
                    </form>
                  )}
                </div>

                {/* Right: recent check-ins */}
                <div className="w-72 flex-shrink-0">
                  <RecentCheckins checkins={recentCheckins} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Event QR Card ────────────────────────────── */}
        <EventQRCard event={event} board={activeBoard} />

        {/* ── Attendees summary (compact) ─────────────── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1e1919]">{t("manage.attendees.title")}</h3>
            <span className="text-xs text-[#776e6b]">
              {checkedIn}/{totalReg} {t("scanner.checkedIn")}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-[#f2efe9] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${rate}%`, backgroundColor: rateColor }}
            />
          </div>
          {/* Mini list — recent checkins */}
          <RecentCheckins checkins={recentCheckins} />
        </div>
      </div>

      {/* ── Scan Result Toast ─────────────────────────── */}
      <ScanResultToast result={scanResult} onDismiss={() => setScanResult(null)} />
    </div>
  );
}
