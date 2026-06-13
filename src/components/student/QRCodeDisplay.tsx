import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useQRStore } from "@/stores/qr-store";
import { CountdownRing } from "@/components/ui/CountdownRing";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  eventId: string;
}

const QR_DURATION = 30; // seconds

/**
 * Displays a dynamically-refreshing QR code for student check-in.
 *
 * States:
 * 1. **Loading** — skeleton pulse while first QR is being fetched
 * 2. **Active** — QR visible with countdown ring
 * 3. **Refreshing** — subtle scale animation during refresh
 * 4. **Error** — danger message with manual retry
 *
 * On mount the component calls `refreshQR()` and starts the
 * countdown interval. Both are cleaned up on unmount.
 */
export function QRCodeDisplay({ eventId }: QRCodeDisplayProps) {
  const { currentHash, timeRemaining, isRefreshing, error, refreshQR, stopCountdown, setEventId } =
    useQRStore();

  useEffect(() => {
    setEventId(eventId);
    void refreshQR(eventId);

    return () => {
      stopCountdown();
    };
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Error state ──
  if (error && !currentHash) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <button
            type="button"
            onClick={() => void refreshQR(eventId)}
            className="btn-primary px-5 py-2.5 text-xs gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (!currentHash) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-[240px] h-[240px] rounded-md bg-neutral-200 animate-pulse" />
        <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse" />
      </div>
    );
  }

  // ── Active state ──
  return (
    <div className="flex flex-col items-center gap-5 animate-fade-in">
      {/* QR Code */}
      <div
        className={cn(
          "relative p-3 bg-white rounded-xl",
          isRefreshing && "opacity-50 transition-opacity",
        )}
      >
        <QRCodeSVG
          value={currentHash}
          size={240}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#1e1919"
        />

        {/* Refreshing overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
      </div>

      {/* Countdown Ring */}
      <CountdownRing duration={QR_DURATION} remaining={timeRemaining} size={64} strokeWidth={3} />

      {/* Hint text */}
      <p className="text-xs text-ink-3 text-center">Mã QR tự động làm mới</p>

      {/* Inline error (when QR exists but refresh failed) */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-danger animate-slide-down">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
