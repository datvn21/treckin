import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckinDirection } from "@/types";

interface EventQRDisplayProps {
  eventId: string;
  boardId: string;
  eventName: string;
  boardName: string;
  direction: CheckinDirection;
}

export function EventQRDisplay({
  eventId,
  boardId,
  eventName,
  boardName,
  direction,
}: EventQRDisplayProps) {
  const { t } = useTranslation();
  const [isFlipped, setIsFlipped] = useState(false);

  const qrPayload = JSON.stringify({
    e: eventId,
    b: boardId,
    d: direction,
    v: 1,
  });

  const isIn = direction === "IN";

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-[#f0ebe6]">{eventName}</p>
        <div className="flex items-center justify-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              isIn ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-[#f87171]/10 text-[#f87171]",
            )}
          >
            {isIn ? (
              <ArrowDownLeft className="w-3 h-3" strokeWidth={2} />
            ) : (
              <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
            )}
            {isIn ? t("scanner.directionIn") : t("scanner.directionOut")}
          </span>
          <span className="text-xs text-[#5e5650]">{boardName}</span>
        </div>
      </div>

      {/* QR Card — clickable flip */}
      <button
        type="button"
        onClick={() => setIsFlipped((prev) => !prev)}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0061fe] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1714] rounded-2xl"
        aria-label={isFlipped ? t("scanner.showQrFront") : t("scanner.flipQr")}
      >
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden">
          {/* QR code side */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-[#231f1c] border border-[#3d3530] transition-transform duration-300",
              isFlipped && "-translate-x-full opacity-0",
            )}
          >
            <QRCodeSVG
              value={qrPayload}
              size={192}
              bgColor="transparent"
              fgColor="#f0ebe6"
              level="M"
              includeMargin={false}
            />
            <p className="text-xs text-[#5e5650]">{t("scanner.scanToCheckin")}</p>
          </div>

          {/* Info side */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-[#231f1c] border border-[#3d3530] transition-transform duration-300",
              !isFlipped && "translate-x-full opacity-0",
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base font-bold",
                  isIn ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-[#f87171]/10 text-[#f87171]",
                )}
              >
                {isIn ? (
                  <ArrowDownLeft className="w-5 h-5" strokeWidth={2} />
                ) : (
                  <ArrowUpRight className="w-5 h-5" strokeWidth={2} />
                )}
                {isIn ? t("scanner.directionIn") : t("scanner.directionOut")}
              </span>
            </div>
            <p className="text-sm text-[#8f857f] text-center">{t("scanner.flipHint")}</p>
          </div>
        </div>
      </button>

      {/* Instruction */}
      <p className="text-xs text-[#5e5650] text-center max-w-xs">{t("scanner.displayBoardDesc")}</p>
    </div>
  );
}
