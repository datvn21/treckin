import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScannerStore } from "@/stores/scanner-store";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSocket } from "@/hooks/useSocket";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useDocumentTitle } from "@/hooks";
import { api } from "@/lib/api";
import { mapApiEventStatus } from "@/lib/event-status";
import { parseApiError } from "@/lib/parseApiError";
import { getAvatarUrl, generateOfflineId } from "@/lib/utils";
import type { CheckinDirection, Event, Board, ScanResult, BoardStatus, ScanStatus } from "@/types";
import { useTranslation } from "react-i18next";
import { Button } from "@/atoms/Button";
import { Input } from "@/atoms/Input";
import { cn } from "@/lib/utils";

import { BoardHeader } from "@/components/scanner/BoardHeader";
import { QRScanner } from "@/components/scanner/QRScanner";
import { ScanResultPanel } from "@/components/scanner/ScanResultPanel";
import { RecentCheckinsTicker } from "@/components/scanner/RecentCheckinsTicker";
import { OfflineBanner } from "@/components/scanner/OfflineBanner";
import { EventQRDisplay } from "@/components/scanner/EventQRDisplay";

type ScanMode = "scan-personal" | "enter-code" | "display-board";

/************************************************************
   ScannerBoard — Full-screen dark scanner page
   Layout: Header → Tab bar → Content (flex-1) → Ticker
   Dark theme: uses scanner-specific CSS variables
*************************************************************/
export function ScannerBoard() {
  const { eventId, boardId: initialBoardId } = useParams<{
    eventId: string;
    boardId: string;
  }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Store state
  const {
    scanResult,
    recentCheckins,
    totalCheckins,
    offlineQueue,
    isProcessing,
    setEvent,
    setBoard,
    setScanResult,
    setProcessing,
    addCheckin,
    setTotalCheckins,
    queueOffline,
    clearResult,
    reset,
  } = useScannerStore();

  // Hooks
  const isOnline = useOnlineStatus();
  useSocket(eventId);
  const { isSyncing } = useOfflineSync();

  // Local state
  const [isPaused, setIsPaused] = useState(false);
  const [event, setLocalEvent] = useState<Event | null>(null);
  const [board, setLocalBoard] = useState<Board | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string>(initialBoardId ?? "");
  const [mode, setMode] = useState<ScanMode>("scan-personal");
  const [direction, setDirection] = useState<CheckinDirection>("IN");
  const [shortCode, setShortCode] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // Auto-dismiss ref for result panel
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDocumentTitle(
    event && board
      ? `${t("scanner.title")} · ${event.title} (${board.name})`
      : t("scanner.title")
  );

  // ── Data loading ────────────────────────────────────────────────
  const loadData = useCallback(async (targetBoardId: string) => {
    if (!eventId || !targetBoardId) return;

    try {
      const { data } = await api.get<{
        id: string;
        title: string;
        description?: string;
        date: string;
        startTime?: string;
        endTime?: string;
        location?: string;
        latitude?: number;
        longitude?: number;
        geofenceRadius?: number;
        status: string;
        attendancePolicy: string;
        requiredBoardCount?: number;
        boards?: Array<{
          id: string;
          name: string;
          eventId: string;
          status: string;
          checkinCount?: number;
        }>;
        _count?: { checkins: number; registrations: number };
        createdBy?: { name: string };
        createdAt?: string;
      }>(`/events/${eventId}`);

      const mappedEvent: Event = {
        id: data.id,
        title: data.title,
        description: data.description ?? "",
        date: data.date,
        startTime: data.startTime ?? "",
        endTime: data.endTime ?? "",
        location: data.location ?? "",
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceRadius: data.geofenceRadius,
        status: mapApiEventStatus(data.status),
        attendancePolicy: data.attendancePolicy as Event["attendancePolicy"],
        requiredBoardCount: data.requiredBoardCount,
        boards: (data.boards ?? []).map((b) => ({
          id: b.id,
          name: b.name,
          eventId: b.eventId,
          status: b.status.toLowerCase() as BoardStatus,
          checkinCount: b.checkinCount ?? 0,
        })),
        totalCheckins: data._count?.checkins ?? 0,
        totalRegistered: data._count?.registrations ?? 0,
        createdBy: data.createdBy?.name ?? "",
        createdAt: data.createdAt ?? "",
      };

      const foundBoard = mappedEvent.boards.find((b) => b.id === targetBoardId);
      if (!foundBoard) {
        navigate(`/app/events/${eventId}/manage`, { replace: true });
        return;
      }

      setLocalEvent(mappedEvent);
      setLocalBoard(foundBoard);
      setEvent(mappedEvent);
      setBoard(foundBoard);
      setTotalCheckins(mappedEvent.totalCheckins);
    } catch (err) {
      console.error("Failed to load scanner data:", parseApiError(err, "Load error"));
      navigate(`/app/events/${eventId}/manage`, { replace: true });
    }
  }, [eventId, navigate, setEvent, setBoard, setTotalCheckins]);

  // Initial load
  useEffect(() => {
    if (!eventId || !initialBoardId) {
      navigate("/app/workspaces", { replace: true });
      return;
    }
    void loadData(initialBoardId);
    return () => { reset(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, initialBoardId]);

  // ── Board switching ─────────────────────────────────────────────
  const handleBoardChange = useCallback((newBoardId: string) => {
    setActiveBoardId(newBoardId);
    clearResult();
    setIsPaused(false);
    const newBoard = event?.boards.find((b) => b.id === newBoardId);
    if (newBoard && event) {
      setLocalBoard(newBoard);
      setBoard(newBoard);
      setTotalCheckins(newBoard.checkinCount ?? 0);
    }
  }, [event, clearResult, setBoard, setTotalCheckins]);

  // ── QR scan handler ─────────────────────────────────────────────
  const handleScan = useCallback(
    async (decodedText: string) => {
      if (isProcessing || !activeBoardId || !eventId || !board) return;

      setProcessing(true);

      if (!isOnline) {
        queueOffline({
          hash: decodedText,
          scannedAt: new Date().toISOString(),
          boardId: activeBoardId,
          direction,
        });
        setScanResult({
          status: "success",
          message: t("scanner.offlineSuccess"),
          student: {
            id: generateOfflineId(),
            name: "Offline Scan",
            email: "",
            avatarUrl: getAvatarUrl("Offline Scan"),
          },
        });
        return;
      }

      try {
        const { data } = await api.post<{
          success: boolean;
          checkinRecord: {
            id: string;
            userId: string;
            eventId: string;
            boardId: string;
            direction: CheckinDirection;
            timestamp: string;
            user: { id: string; name: string; email: string };
          };
        }>("/checkin/by-personal-qr", {
          hash: decodedText,
          boardId: activeBoardId,
          eventId,
          direction,
        });

        const result: ScanResult = data.success
          ? {
              status: "success",
              message: t("scanner.success"),
              student: {
                id: data.checkinRecord.user.id,
                name: data.checkinRecord.user.name,
                email: data.checkinRecord.user.email,
                avatarUrl: getAvatarUrl(data.checkinRecord.user.name),
              },
              checkinRecord: {
                id: data.checkinRecord.id,
                userId: data.checkinRecord.userId,
                userName: data.checkinRecord.user.name,
                eventId: data.checkinRecord.eventId,
                boardId: data.checkinRecord.boardId,
                boardName: board.name,
                direction: data.checkinRecord.direction,
                timestamp: data.checkinRecord.timestamp,
                method: "qr",
              },
            }
          : {
              status: "already-checked-in",
              message: t("scanner.alreadyCheckedIn"),
              student: {
                id: data.checkinRecord.user.id,
                name: data.checkinRecord.user.name,
                email: data.checkinRecord.user.email,
                avatarUrl: getAvatarUrl(data.checkinRecord.user.name),
              },
              originalCheckin: {
                boardName: board.name,
                timestamp: data.checkinRecord.timestamp,
              },
            };

        setScanResult(result);
        if (result.status === "success" && result.checkinRecord) {
          addCheckin(result.checkinRecord);
        }
      } catch (err) {
        const backendMessage =
          parseApiError(err, t("scanner.invalidQrDesc"));

        let status: ScanStatus = "invalid-qr";
        const messageLower = backendMessage.toLowerCase();
        if (messageLower.includes("expired") || messageLower.includes("hết hạn")) {
          status = "expired-qr";
        } else if (messageLower.includes("geofence") || messageLower.includes("khoảng cách")) {
          status = "outside-geofence";
        }

        setScanResult({ status, message: backendMessage });
      }
    },
    [isProcessing, activeBoardId, eventId, board, direction, isOnline, setProcessing, queueOffline, setScanResult, addCheckin, t]
  );

  // ── Short code handler ──────────────────────────────────────────
  const handleShortCodeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const code = shortCode.trim().toUpperCase();
      if (!code || code.length !== 6 || !activeBoardId || !eventId || !board) return;

      setIsSubmittingCode(true);
      try {
        const { data } = await api.post<{
          success: boolean;
          checkinRecord: {
            id: string;
            userId: string;
            eventId: string;
            boardId: string;
            direction: CheckinDirection;
            timestamp: string;
            user: { id: string; name: string; email: string };
          };
        }>("/checkin/by-short-code", {
          code,
          boardId: activeBoardId,
          eventId,
          direction,
        });

        const result: ScanResult = data.success
          ? {
              status: "success",
              message: t("scanner.success"),
              student: {
                id: data.checkinRecord.user.id,
                name: data.checkinRecord.user.name,
                email: data.checkinRecord.user.email,
                avatarUrl: getAvatarUrl(data.checkinRecord.user.name),
              },
              checkinRecord: {
                id: data.checkinRecord.id,
                userId: data.checkinRecord.userId,
                userName: data.checkinRecord.user.name,
                eventId: data.checkinRecord.eventId,
                boardId: data.checkinRecord.boardId,
                boardName: board.name,
                direction: data.checkinRecord.direction,
                timestamp: data.checkinRecord.timestamp,
                method: "qr",
              },
            }
          : {
              status: "already-checked-in",
              message: t("scanner.alreadyCheckedIn"),
              student: {
                id: data.checkinRecord.user.id,
                name: data.checkinRecord.user.name,
                email: data.checkinRecord.user.email,
                avatarUrl: getAvatarUrl(data.checkinRecord.user.name),
              },
              originalCheckin: {
                boardName: board.name,
                timestamp: data.checkinRecord.timestamp,
              },
            };

        setScanResult(result);
        setShortCode("");
        if (result.status === "success" && result.checkinRecord) {
          addCheckin(result.checkinRecord);
        }
      } catch (err) {
        const backendMessage =
          parseApiError(err, t("scanner.invalidQr"));
        setScanResult({ status: "invalid-qr", message: backendMessage });
        setShortCode("");
      } finally {
        setIsSubmittingCode(false);
      }
    },
    [shortCode, activeBoardId, eventId, board, direction, setScanResult, addCheckin, t]
  );

  // ── Dismiss scan result ─────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    clearResult();
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, [clearResult]);

  // ── Back navigation ─────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (eventId) {
      navigate(`/app/events/${eventId}/manage`);
    } else {
      navigate("/app/workspaces");
    }
  }, [eventId, navigate]);

  // ── Loading state ───────────────────────────────────────────────
  if (!event || !board) {
    return (
      <div className="fixed inset-0 bg-[#1a1714] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[#8f857f] text-sm">{t("scanner.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#1a1714] overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────── */}
      <BoardHeader
        eventName={event.title}
        currentBoard={board}
        boards={event.boards}
        totalCheckins={totalCheckins}
        isOnline={isOnline}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        onBoardChange={handleBoardChange}
        onBack={handleBack}
      />

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#231f1c] border-b border-[#3d3530]">
        {/* Mode tabs */}
        <div className="flex items-center bg-[#1a1714] rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setMode("scan-personal")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              mode === "scan-personal"
                ? "bg-[#2c2724] text-[#f0ebe6] shadow-sm"
                : "text-[#8f857f] hover:text-[#c2b9b3]"
            )}
          >
            {t("scanner.scanQr")}
          </button>
          <button
            type="button"
            onClick={() => setMode("enter-code")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              mode === "enter-code"
                ? "bg-[#2c2724] text-[#f0ebe6] shadow-sm"
                : "text-[#8f857f] hover:text-[#c2b9b3]"
            )}
          >
            {t("scanner.enterCode")}
          </button>
          <button
            type="button"
            onClick={() => setMode("display-board")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              mode === "display-board"
                ? "bg-[#2c2724] text-[#f0ebe6] shadow-sm"
                : "text-[#8f857f] hover:text-[#c2b9b3]"
            )}
          >
            {t("scanner.displayBoard")}
          </button>
        </div>

        {/* Direction toggle (IN_OUT policy only) */}
        {event.attendancePolicy === "IN_OUT" && (
          <div className="flex items-center bg-[#1a1714] rounded-lg p-0.5 gap-0.5 ml-auto">
            <button
              type="button"
              onClick={() => setDirection("IN")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                direction === "IN"
                  ? "bg-[#2c2724] text-[#f0ebe6] shadow-sm"
                  : "text-[#8f857f] hover:text-[#c2b9b3]"
              )}
            >
              {t("scanner.directionIn")}
            </button>
            <button
              type="button"
              onClick={() => setDirection("OUT")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                direction === "OUT"
                  ? "bg-[#2c2724] text-[#f0ebe6] shadow-sm"
                  : "text-[#8f857f] hover:text-[#c2b9b3]"
              )}
            >
              {t("scanner.directionOut")}
            </button>
          </div>
        )}
      </div>

      {/* ── Offline banner ────────────────────────────────────── */}
      {(!isOnline || isSyncing) && (
        <OfflineBanner queueCount={offlineQueue.length} isSyncing={isSyncing} />
      )}

      {/* ── Main content ──────────────────────────────────────── */}
      {mode === "scan-personal" ? (
        <QRScanner
          onScan={handleScan}
          isPaused={isPaused || isProcessing}
        />
      ) : mode === "enter-code" ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <p className="text-[#8f857f] text-sm font-medium mb-1">
              {t("scanner.enterCodePlaceholder")}
            </p>
          </div>
          <form
            id="form-short-code"
            onSubmit={(e) => void handleShortCodeSubmit(e)}
            className="w-full max-w-xs flex flex-col gap-4"
          >
            <Input
              id="input-short-code"
              type="text"
              value={shortCode}
              onChange={(e) =>
                setShortCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder={t("scanner.enterCodePlaceholder")}
              className="text-center text-xl font-mono tracking-widest uppercase bg-[#231f1c] border-[#3d3530] text-[#f0ebe6] placeholder:text-[#5e5650]"
              maxLength={6}
              autoFocus
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={shortCode.length !== 6}
              isLoading={isSubmittingCode}
            >
              {t("scanner.submit")}
            </Button>
          </form>
        </div>
      ) : (
        <EventQRDisplay
          eventId={event.id}
          boardId={board.id}
          eventName={event.title}
          boardName={board.name}
          direction={direction}
        />
      )}

      {/* ── Scan result panel ─────────────────────────────────── */}
      <ScanResultPanel result={scanResult} onDismiss={handleDismiss} />

      {/* ── Recent check-ins ticker ────────────────────────────── */}
      <RecentCheckinsTicker checkins={recentCheckins} />
    </div>
  );
}
