import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, AlertCircle, Clock, XCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/atoms/Avatar";
import type { ScanResult } from "@/types";
import { formatTime } from "@/lib/utils";

interface ScanResultPanelProps {
  result: ScanResult | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

function ResultIcon({ status }: { status: ScanResult["status"] }) {
  const className = "w-10 h-10 flex-shrink-0";

  switch (status) {
    case "success":
      return <CheckCircle className={cn(className, "text-[#4ade80]")} strokeWidth={1.5} />;
    case "already-checked-in":
      return <Clock className={cn(className, "text-[#facc15]")} strokeWidth={1.5} />;
    case "invalid-qr":
      return <XCircle className={cn(className, "text-[#f87171]")} strokeWidth={1.5} />;
    case "expired-qr":
      return <AlertCircle className={cn(className, "text-[#f97316]")} strokeWidth={1.5} />;
    case "outside-geofence":
      return <AlertTriangle className={cn(className, "text-[#f97316]")} strokeWidth={1.5} />;
    default:
      return null;
  }
}

function StatusLabel({ status }: { status: ScanResult["status"] }) {
  const { t } = useTranslation();
  const map: Record<ScanResult["status"], string> = {
    success: t("scanner.result.success"),
    "already-checked-in": t("scanner.result.alreadyCheckedIn"),
    "invalid-qr": t("scanner.result.invalid"),
    "expired-qr": t("scanner.result.expired"),
    "outside-geofence": t("scanner.result.geofence"),
  };
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        status === "success" && "text-[#4ade80]",
        status === "already-checked-in" && "text-[#facc15]",
        (status === "invalid-qr" || status === "expired-qr" || status === "outside-geofence") &&
          "text-[#f87171]",
      )}
    >
      {map[status]}
    </span>
  );
}

export function ScanResultPanel({ result, onDismiss }: ScanResultPanelProps) {
  const { t } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!result) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [result, onDismiss]);

  if (!result) return null;

  const hasStudent = !!result.student;

  return (
    <div
      className={cn(
        "fixed bottom-[72px] left-4 right-4 mx-auto max-w-sm z-50",
        "rounded-2xl border overflow-hidden",
        "bg-[#231f1c] border-[#3d3530] shadow-2xl",
        "animate-slide-up",
      )}
      role="alert"
      aria-live="polite"
    >
      {/* ── Dismiss bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3d3530]">
        <div className="flex items-center gap-2">
          <ResultIcon status={result.status} />
          <StatusLabel status={result.status} />
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex items-center justify-center w-7 h-7 rounded-full text-[#5e5650] hover:text-[#f0ebe6] hover:bg-[#2c2724] transition-colors"
          aria-label={t("scanner.dismiss")}
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Content ───────────────────────────────────── */}
      <div className="px-4 py-4">
        {/* Message */}
        <p className="text-sm text-[#c2b9b3] leading-relaxed mb-3">{result.message}</p>

        {/* Student info (if present) */}
        {hasStudent && (
          <div className="flex items-center gap-3">
            <Avatar name={result.student.name} avatarUrl={result.student.avatarUrl} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-[#f0ebe6] truncate">
                {result.student.name}
              </p>
              {result.student.email && (
                <p className="text-xs text-[#5e5650] truncate">{result.student.email}</p>
              )}
            </div>
          </div>
        )}

        {/* Original check-in info (already-checked-in) */}
        {result.status === "already-checked-in" && result.originalCheckin && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8f857f]">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
            <span>
              {result.originalCheckin.boardName} · {formatTime(result.originalCheckin.timestamp)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
