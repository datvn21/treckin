import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/atoms/Avatar";
import { cn } from "@/lib/utils";
import type { CheckinRecord } from "@/types";
import { formatTime } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";

interface RecentCheckinsTickerProps {
  checkins: CheckinRecord[];
}

export function RecentCheckinsTicker({ checkins }: RecentCheckinsTickerProps) {
  const { t } = useTranslation();

  const recent = useMemo(
    () => checkins.slice(0, 5),
    [checkins]
  );

  if (recent.length === 0) return null;

  return (
    <div className="flex-none relative flex items-center border-t border-[#3d3530] bg-[#1a1714]">
      {/* Scrolling ticker */}
      <div className="flex-1 flex items-center gap-3 px-4 py-2.5 overflow-x-auto scrollbar-hide">
        {recent.map((checkin) => {
          const isIn = checkin.direction === "IN";
          return (
            <div
              key={checkin.id}
              className="flex items-center gap-2.5 flex-shrink-0"
            >
              {/* Direction icon */}
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full",
                isIn ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-[#f87171]/10 text-[#f87171]"
              )}>
                {isIn ? (
                  <ArrowDownLeft className="w-3 h-3" strokeWidth={2} />
                ) : (
                  <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
                )}
              </div>

              {/* Avatar */}
              <Avatar
                name={checkin.userName}
                avatarUrl={undefined}
                size="sm"
              />

              {/* Name + time */}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#c2b9b3] leading-tight max-w-[120px] truncate">
                  {checkin.userName}
                </span>
                <span className="text-xs text-[#5e5650] leading-tight">
                  {formatTime(checkin.timestamp)}
                </span>
              </div>

              {/* Divider */}
              <ChevronRight className="w-3.5 h-3.5 text-[#3d3530] flex-shrink-0" strokeWidth={1.5} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
