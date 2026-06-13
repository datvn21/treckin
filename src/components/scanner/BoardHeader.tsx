import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Pause, Play, Wifi, WifiOff, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Board, BoardStatus } from "@/types";

interface BoardHeaderProps {
  eventName: string;
  currentBoard: Board;
  boards: Board[];
  totalCheckins: number;
  isOnline: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onBoardChange: (boardId: string) => void;
  onBack: () => void;
}

export function BoardHeader({
  eventName,
  currentBoard,
  boards,
  totalCheckins,
  isOnline,
  isPaused,
  onTogglePause,
  onBoardChange,
  onBack,
}: BoardHeaderProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="flex-none flex items-center gap-3 px-4 py-3 bg-[#1a1714] border-b border-[#3d3530]">
      {/* ── Back button ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onBack}
        className="flex-none flex items-center justify-center w-9 h-9 rounded-lg text-[#8f857f] hover:text-[#f0ebe6] hover:bg-[#231f1c] transition-colors"
        aria-label={t("scanner.back")}
      >
        <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* ── Event info ──────────────────────────────────── */}
      <div className="flex-none flex flex-col min-w-0">
        <p className="text-xs text-[#5e5650] leading-tight truncate max-w-[120px]">
          {eventName}
        </p>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-[#4ade80]" strokeWidth={1.5} />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-[#ef4444]" strokeWidth={1.5} />
          )}
          <span className="text-sm font-semibold text-[#f0ebe6] leading-tight">
            {totalCheckins}
          </span>
          <span className="text-xs text-[#5e5650]">{t("scanner.checkedIn")}</span>
        </div>
      </div>

      {/* ── Spacer ─────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Board selector ─────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#231f1c] border border-[#3d3530] hover:bg-[#2c2724] hover:border-[#4d4540] transition-colors"
        >
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-semibold text-[#f0ebe6] truncate max-w-[100px]">
              {currentBoard.name}
            </span>
            <span className={cn(
              "text-xs",
              currentBoard.status === "active"
                ? "text-[#4ade80]"
                : currentBoard.status === "paused"
                  ? "text-[#facc15]"
                  : "text-[#8f857f]"
            )}>
              {t(`scanner.status.${currentBoard.status}`)}
            </span>
          </div>
          {isDropdownOpen ? (
            <ChevronUp className="w-4 h-4 text-[#8f857f] flex-none" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8f857f] flex-none" strokeWidth={1.5} />
          )}
        </button>

        {/* Board dropdown */}
        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl bg-[#231f1c] border border-[#3d3530] shadow-xl overflow-hidden">
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    onBoardChange(board.id);
                    setIsDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2c2724] transition-colors",
                    board.id === currentBoard.id && "bg-[#2c2724]"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      board.id === currentBoard.id ? "text-[#f0ebe6]" : "text-[#c2b9b3]"
                    )}>
                      {board.name}
                    </p>
                    <p className="text-xs text-[#5e5650]">
                      {board.checkinCount} {t("scanner.checkins")}
                    </p>
                  </div>
                  <span className={cn(
                    "w-2 h-2 rounded-full flex-none",
                    board.status === "active" && "bg-[#4ade80]",
                    board.status === "paused" && "bg-[#facc15]",
                    board.status === "inactive" && "bg-[#5e5650]"
                  )} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Pause / Resume button ───────────────────────── */}
      <button
        type="button"
        onClick={onTogglePause}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg border transition-colors",
          isPaused
            ? "bg-[#0061fe] border-transparent text-white hover:bg-[#0052d4]"
            : "bg-[#231f1c] border-[#3d3530] text-[#8f857f] hover:text-[#f0ebe6] hover:bg-[#2c2724] hover:border-[#4d4540]"
        )}
        aria-label={isPaused ? t("scanner.resume") : t("scanner.pause")}
        title={isPaused ? t("scanner.resume") : t("scanner.pause")}
      >
        {isPaused ? (
          <Play className="w-4 h-4" strokeWidth={2} fill="currentColor" />
        ) : (
          <Pause className="w-4 h-4" strokeWidth={1.5} />
        )}
      </button>
    </header>
  );
}
